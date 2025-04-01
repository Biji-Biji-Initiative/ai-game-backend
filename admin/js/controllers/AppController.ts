/**
 * App Controller
 * Central controller coordinating modules and UI interactions
 */

import { EndpointManager, Endpoint } from '../modules/endpoint-manager';
import { HistoryManager, HistoryEntry } from '../modules/history-manager';
import { VariableManager } from '../modules/variable-manager';
import { ConfigManager } from '../core/ConfigManager';
import { UIManager } from '../ui/UIManager';
import { APIClient } from '../api/api-client';
import { FlowController } from './FlowController';
import { logger } from '../utils/logger';
import { DomainStateManager } from '../modules/domain-state-manager';
import { AppState, RequestInfo } from '../types/app-types'; // Assuming RequestInfo is here too
import { IAuthManager } from '../types/auth'; // Assuming IAuthManager type


interface AppControllerOptions {
    configManager: ConfigManager;
    endpointManager: EndpointManager;
    historyManager: HistoryManager;
    variableManager: VariableManager;
    uiManager: UIManager;
    apiClient: APIClient;
    authManager: IAuthManager;
    domainStateManager: DomainStateManager;
    flowController: FlowController;
}

export class AppController {
    private configManager: ConfigManager;
    private endpointManager: EndpointManager;
    private historyManager: HistoryManager;
    private variableManager: VariableManager;
    private uiManager: UIManager;
    private apiClient: APIClient;
    private authManager: IAuthManager;
    private domainStateManager: DomainStateManager;
    private flowController: FlowController;

    private state: AppState = { currentRequest: {} };
    private isInitialized = false;

    constructor(options: AppControllerOptions) {
        this.configManager = options.configManager;
        this.endpointManager = options.endpointManager;
        this.historyManager = options.historyManager;
        this.variableManager = options.variableManager;
        this.uiManager = options.uiManager;
        this.apiClient = options.apiClient;
        this.authManager = options.authManager;
        this.domainStateManager = options.domainStateManager;
        this.flowController = options.flowController;
    }

    /**
     * Initialize the controller and its components
     */
    async initialize(): Promise<void> {
        logger.info('AppController: Initializing...');
        
        // Initialize modules (assuming they have an initialize method)
        this.configManager?.initialize(); 
        this.endpointManager?.initialize(); 
        this.historyManager?.initialize(); 
        this.variableManager?.initialize(); 
        this.apiClient?.initialize(); 
        this.authManager?.initialize(); 
        this.domainStateManager?.initialize(); 
        this.flowController?.initialize();
        
        // Initialize UI
        this.uiManager?.initialize();
        
        // Load initial data (e.g., endpoints)
        await this.loadInitialData();
        
        // Setup event listeners between components
        this.setupEventListeners();
        
        this.isInitialized = true;
        logger.info('AppController initialized');
    }

    private async loadInitialData(): Promise<void> {
        // Example: Load endpoints if endpointManager exists
        if (this.endpointManager && typeof this.endpointManager.loadEndpoints === 'function') {
            await this.endpointManager.loadEndpoints();
        }
        // Add other initial data loading steps here
    }

    private setupEventListeners(): void {
        logger.info('Setting up AppController event listeners...');

        // --- UI Manager Events ---
        if (this.uiManager) {
            // Listen for form submission from UI
            this.uiManager.on('form:submit', (requestData: RequestInfo) => {
                this.handleRequestSubmit(requestData);
            });

            // Listen for endpoint selection change
            this.uiManager.on('endpoint:change', (endpointId: string) => {
                const endpoint = this.endpointManager?.getEndpointById(endpointId);
                if (endpoint) {
                    this.handleRequestDataChange({ 
                        method: endpoint.method, 
                        url: endpoint.path, // Assuming path maps to url fragment
                        path: endpoint.path, 
                        headers: endpoint.headers, 
                        requestBody: endpoint.body 
                    });
                }
            });
            
            // Listen for raw request data changes (method, url, headers, body)
            this.uiManager.on('request:change', (data: Partial<RequestInfo>) => {
                 this.handleRequestDataChange(data);
            });

             // Listen for history replay requests
            this.uiManager.on('history:replay', (entryId: string) => {
                const entry = this.historyManager?.getEntryById(entryId);
                if (entry) {
                    this.handleRequestDataChange({
                        method: entry.method,
                        url: entry.url,
                        headers: entry.headers,
                        requestBody: entry.requestBody
                    });
                }
            });
            
            // Listen for variable extraction requests
            this.uiManager.on('variable:extract', (data: { variable: string, path: string }) => {
                if (this.state.lastResponse) {
                     this.variableManager?.extractVariablesFromJson(this.state.lastResponse.data, { [data.variable]: data.path });
                }
            });
            
             // Listen for auth actions (login/logout)
             this.uiManager.on('auth:login', (credentials) => this.authManager?.login(credentials));
             this.uiManager.on('auth:logout', () => this.authManager?.logout());
        }

        // --- API Client Events ---
        if (this.apiClient) {
            this.apiClient.on('request:start', () => this.uiManager?.setLoading(true));
            this.apiClient.on('response:success', (response) => {
                this.uiManager?.setLoading(false);
                this.handleApiResponse(response);
            });
            this.apiClient.on('response:error', (error) => {
                this.uiManager?.setLoading(false);
                this.handleApiError(error);
            });
            // Add listeners for other API events if needed (e.g., network error)
        }
        
        // --- Auth Manager Events ---
        if (this.authManager) {
            this.authManager.on('auth:change', (authState) => {
                this.state.authState = authState;
                this.uiManager?.updateAuthState(authState);
                // Potentially update API client with new token
                if (authState.token) {
                    this.apiClient?.setAuthToken(authState.token);
                } else {
                    this.apiClient?.clearAuthToken();
                }
            });
        }

        // --- Variable Manager Events ---
        if (this.variableManager) {
            this.variableManager.on('variables:updated', (event: CustomEvent) => {
                this.state.variables = event.detail.variables;
                this.uiManager?.updateVariables(this.state.variables);
            });
        }
        
        // --- Domain State Manager Events ---
        if (this.domainStateManager) {
             this.domainStateManager.on('stateChange', (event: CustomEvent) => {
                 this.handleDomainStateChange(event);
             });
             this.domainStateManager.on('requestTriggered', (event: CustomEvent) => {
                 this.handleDomainStateRequest(event);
             });
        }

        // --- Flow Controller Events ---
        // Example: Listen for flow completion or status updates
        // if (this.flowController) { ... }
        
        logger.info('AppController event listeners configured.');
    }

    /**
     * Handle form submission to make an API request
     * @param requestData Data from the form
     */
    private handleRequestSubmit(requestData: RequestInfo): void {
        logger.info('Handling request submission:', requestData);
        if (!this.apiClient) {
            logger.error('API Client not available to handle request.');
            return;
        }
        // TODO: Add validation?
        // Replace variables in URL, headers, body
        const processedData = this.processRequestVariables(requestData);
        this.apiClient.makeRequest(processedData);
        
        // Optional: Take snapshot before request for domain state diffing
        this.domainStateManager?.takeBeforeSnapshot('apiRequest', { request: processedData });
    }

    /**
     * Handle successful API response
     * @param response The successful response object from APIClient
     */
    private handleApiResponse(response: any): void {
        logger.info('Handling API success response:', response.status);
        this.state.lastResponse = response; // Store last response
        this.uiManager?.displayResponse(response);
        this.historyManager?.addEntry(response.requestInfo, response); 
        
        // Optional: Take snapshot after request for domain state diffing
        this.domainStateManager?.takeAfterSnapshot('apiRequest', { response: response });
        
        // Optional: Run variable extraction rules
        this.runAutomaticVariableExtraction(response.data);
    }

    /**
     * Handle API error response
     * @param error The error object from APIClient
     */
    private handleApiError(error: any): void {
        logger.warn('Handling API error response:', error);
        this.state.lastResponse = null; // Clear last response on error
        this.uiManager?.displayError(error);
        // Optionally add errors to history
        // this.historyManager?.addEntry(error.requestInfo, error, false);
         // Optional: Take snapshot after request for domain state diffing
        this.domainStateManager?.takeAfterSnapshot('apiRequest', { error: error });
    }
    
    /**
     * Process request data, replacing variable placeholders
     * @param requestData Original request data
     * @returns Request data with variables substituted
     */
    private processRequestVariables(requestData: RequestInfo): RequestInfo {
        if (!this.variableManager) return requestData;
        
        const processed: RequestInfo = {
            ...requestData,
            url: this.variableManager.replaceVariables(requestData.url || ''),
            headers: {},
            requestBody: null
        };

        // Process headers
        if (requestData.headers) {
            for (const [key, value] of Object.entries(requestData.headers)) {
                processed.headers[key] = this.variableManager.replaceVariables(value);
            }
        }

        // Process body (only if it's an object or string)
        if (typeof requestData.requestBody === 'string') {
            processed.requestBody = this.variableManager.replaceVariables(requestData.requestBody);
        } else if (typeof requestData.requestBody === 'object' && requestData.requestBody !== null) {
            // Deep replacement for objects/arrays
            processed.requestBody = this.deepReplaceVariables(requestData.requestBody);
        } else {
            processed.requestBody = requestData.requestBody;
        }

        return processed;
    }

    /**
     * Recursively replace variables in nested objects/arrays
     */
    private deepReplaceVariables(data: any): any {
        if (typeof data === 'string') {
            return this.variableManager?.replaceVariables(data) || data;
        } else if (Array.isArray(data)) {
            return data.map(item => this.deepReplaceVariables(item));
        } else if (typeof data === 'object' && data !== null) {
            const newObj: Record<string, any> = {};
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    newObj[key] = this.deepReplaceVariables(data[key]);
                }
            }
            return newObj;
        }
        return data;
    }
    
    /**
     * Run automatic variable extraction based on configured rules
     * @param responseData The data from the successful API response
     */
    private runAutomaticVariableExtraction(responseData: any): void {
        // TODO: Get extraction rules from config or state
        const extractionRules = this.configManager?.get('variableExtractionRules') || [];
        if (extractionRules.length > 0 && this.variableManager) {
            logger.info('Running automatic variable extraction...');
            this.variableManager.extractVariablesFromResponse(responseData, extractionRules);
        }
    }

    /**
     * Handle changes in request data (from UI or other sources)
     * @param data Updated request data (can be partial)
     */
    handleRequestDataChange(data: Partial<RequestInfo>): void {
        console.debug('Request data changed:', data);
        this.state.currentRequest = { ...this.state.currentRequest, ...data };
        // Notify UI to update relevant parts of the form
        if (this.uiManager && typeof this.uiManager.updateRequestForm === 'function') {
           this.uiManager.updateRequestForm(this.state.currentRequest);
        }
    }

    /**
     * Handle domain state changes reported by the manager
     * @param event Domain state change event
     */
    handleDomainStateChange(event: CustomEvent): void {
        const { state, diffs } = event.detail;
        this.state.domainState = state;
        
        if (diffs && diffs.length > 0) {
            console.debug('Domain state changes detected:', diffs);
            // Notify UI to update the domain state view
            if (this.uiManager && typeof this.uiManager.updateDomainStateView === 'function') {
                this.uiManager.updateDomainStateView(state, diffs);
            }
        }
    }

    /**
     * Handle request triggered from domain state viewer
     * @param event Event containing request details
     */
    handleDomainStateRequest(event: CustomEvent): void {
        const requestDetails = event.detail as Partial<RequestInfo>; // Assume details match RequestInfo structure
        console.debug('Request initiated from domain state viewer');
        
        let finalRequestData: Partial<RequestInfo> = {};

        if (requestDetails.url) { // If a full URL/path is provided, use it primarily
             finalRequestData = { ...requestDetails };
        } else if (requestDetails.endpointId) { // If endpoint ID provided, load its data
            const endpoint = this.endpointManager?.getEndpointById(requestDetails.endpointId);
            if (endpoint) {
                 finalRequestData = {
                    method: endpoint.method || 'GET',
                    url: endpoint.path, // Map endpoint path to URL
                    path: endpoint.path,
                    headers: endpoint.headers || {},
                    requestBody: endpoint.body || null
                };
                // Override with any specific details from the event
                if(requestDetails.method) finalRequestData.method = requestDetails.method;
                if(requestDetails.headers) finalRequestData.headers = {...finalRequestData.headers, ...requestDetails.headers};
                if(requestDetails.requestBody) finalRequestData.requestBody = requestDetails.requestBody;
            } else {
                logger.warn('Domain state requested non-existent endpoint:', requestDetails.endpointId);
                return; // Don't proceed if endpoint not found
            }
        } else { // Handle raw request details if no endpointId or URL
             finalRequestData = { ...requestDetails };
        }
        
        // Update the main request state
        this.handleRequestDataChange(finalRequestData);
        
        // Optionally switch to request builder tab
        if (this.uiManager && typeof this.uiManager.switchTab === 'function') {
            this.uiManager.switchTab('request-builder-tab'); // Ensure tab ID is correct
        }
    }

} 