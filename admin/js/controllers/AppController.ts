// Types improved by ts-improve-types
/**
 * App Controller
 * Central controller coordinating modules and UI interactions
 */

import { EndpointManager, Endpoint } from '../modules/endpoint-manager';
import { HistoryManager, HistoryEntry } from '../modules/history-manager';
import { VariableManager } from '../modules/variable-manager';
import { ConfigManager } from '../core/ConfigManager';
import { UIManager } from '../components/UIManagerNew';
import { APIClient } from '../api/api-client';
import { FlowController } from './FlowController';
import { logger } from '../utils/logger';
import { DomainStateManager } from '../modules/domain-state-manager';
import { AppState, RequestInfo } from '../types/app-types';
import { IAuthManager } from '../types/auth';
import { ResponseViewer } from '../components/ResponseViewer';
import { FlowManager } from '../modules/flow-manager';
import { AuthManager, AuthState } from '../modules/auth-manager';

interface AppControllerOptions {
  configManager: ConfigManager;
  endpointManager: EndpointManager;
  historyManager: HistoryManager;
  variableManager: VariableManager;
  uiManager: UIManager;
  apiClient: APIClient;
  domainStateManager: DomainStateManager;
  flowController: FlowController | null;
  responseViewer: ResponseViewer;
  flowManager: FlowManager;
  authManager: AuthManager;
}

export class AppController {
  private configManager: ConfigManager;
  private endpointManager: EndpointManager;
  private historyManager: HistoryManager;
  private variableManager: VariableManager;
  private uiManager: UIManager;
  private apiClient: APIClient;
  private authManager: AuthManager;
  private domainStateManager: DomainStateManager;
  public flowController: FlowController | null;
  private responseViewer: ResponseViewer;
  private flowManager: FlowManager;
  private logger: typeof logger;

  private state: AppState = {
    currentRequest: { method: '', url: '', headers: {} },
  };
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
    this.responseViewer = options.responseViewer;
    this.flowManager = options.flowManager;
    this.logger = logger;
  }

  /**
    constructor(option: AppControllerOptions) {
        this.configManager = options.configManager; // Property added
        this.endpointManager = options.endpointManager; // Property added
        this.historyManager = options.historyManager; // Property added
    // @ts-ignore - Complex type issues
        this.variableManager = options.variableManager; // Property added
        this.uiManager = options.uiManager; // Property added
        this.apiClient = options.apiClient; // Property added
        this.authManager = options.authManager; // Property added
        this.domainStateManager = options.domainStateManager; // Property added
        this.flowController = options.flowController; // Property added
        this.responseViewer = options.responseViewer; // Property added
    }

    /**
     * Initialize the controller and its components
     */
  async initialize(): Promise<void> {
    logger.info('AppController: Initializing...');

    // Initialize modules that have an initialize method
    // ConfigManager is a singleton, likely initialized when getInstance is called
    // this.configManager?.initialize();
    // DomainStateManager does not have an initialize method
    // this.domainStateManager?.initialize();
    this.flowController?.initialize(); // FlowController has initialize

    // Initialize UI - happens in UIManager constructor or via initElements
    // this.uiManager?.initializeUI(); // Removed - private method

    // Load initial data (e.g., endpoints)
    await this.loadInitialData();

    // Setup event listeners between components
    this.setupEventListeners();

    this.isInitialized = true; // Property added
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
      this.uiManager.addEventListener('form:submit', (requestData: RequestInfo) => {
        this.handleRequestSubmit(requestData);
      });

      // Listen for endpoint selection change
      this.uiManager.addEventListener('endpoint:change', (endpointId: string) => {
        const endpoint = this.endpointManager?.getEndpointById(endpointId);
        if (endpoint) {
          this.handleRequestDataChange({
            method: endpoint.method,
            url: endpoint.path, // Assuming path maps to url fragment
            path: endpoint.path,
            headers: endpoint.headers,
            requestBody: endpoint.requestBody, // Corrected property name
          });
        }
      });

      // Listen for raw request data changes (method, url, headers, body)
      this.uiManager.addEventListener('request:change', (data: Partial<RequestInfo>) => {
        this.handleRequestDataChange(data);
      });

      // Listen for history replay requests
      this.uiManager.addEventListener('history:replay', (entryId: string) => {
        const entry = this.historyManager?.getEntryById(entryId);
        if (entry) {
          this.handleRequestDataChange({
            method: entry.method,
            url: entry.url,
            headers: entry.request.headers, // Corrected nested access
            requestBody: entry.request.body, // Corrected nested access
          });
        }
      });

      // Listen for variable extraction requests
      this.uiManager.addEventListener(
        'variable:extract',
        (data: { variable: string; path: string }) => {
          if (this.state.lastResponse) {
            // Use extractVariablesFromResponse instead
            // Construct the ExtractionRule object
            if (typeof this.variableManager?.extractVariablesFromResponse === 'function') {
              const rule = { name: data.variable, path: data.path };
              this.variableManager.extractVariablesFromResponse(this.state.lastResponse, [rule]);
            } else {
              logger.warn('variableManager does not have extractVariablesFromResponse method');
            }
          }
        },
      );

      // Listen for auth actions (login/logout)
      this.uiManager.addEventListener('auth:login', credentials => {
        // Assuming credentials = { email: '', password: '' }
        if (
          credentials &&
          typeof credentials.email === 'string' &&
          typeof credentials.password === 'string'
        ) {
          this.authManager?.login(credentials.email, credentials.password); // Pass both args
        } else {
          logger.warn('Login event triggered without proper credentials object {email, password}');
        }
      });
      this.uiManager.addEventListener('auth:logout', () => this.authManager?.logout());
    }

    // --- API Client Events ---
    // Assumes APIClient uses addEventListener (based on api-client.ts)
    if (this.apiClient && typeof this.apiClient.addEventListener === 'function') {
      this.apiClient.addEventListener('request:start', () => this.uiManager?.showLoading());
      this.apiClient.addEventListener('response:success', eventData => {
        this.uiManager?.hideLoading();
        this.handleApiResponse(eventData.responseData || eventData); // Handle potential nesting
      });
      this.apiClient.addEventListener('response:error', errorData => {
        this.uiManager?.hideLoading();
        this.handleApiError(errorData);
      });
      this.apiClient.addEventListener('response:timeout', errorData => {
        this.uiManager?.hideLoading();
        this.handleApiError({ ...errorData, isTimeoutError: true }); // Add flag for handling
      });
      this.apiClient.addEventListener('response:network-error', errorData => {
        this.uiManager?.hideLoading();
        this.handleApiError({ ...errorData, isNetworkError: true }); // Add flag for handling
      });
    } else {
      logger.warn('APIClient does not support addEventListener');
    }

    // --- Auth Manager Events ---
    if (this.authManager && typeof this.authManager.on === 'function') {
      this.authManager.on('auth:change', (authState: unknown) => {
        logger.info('Auth state changed event received', authState);
        if (typeof authState === 'object' && authState !== null) {
          this.uiManager?.updateAuthState(authState as AuthState);
        }
      });
    } else {
      logger.warn('AuthManager does not support EventEmitter pattern (on method)');
    }

    // --- Variable Manager Events ---
    // VariableManager uses EventEmitter pattern (on, emit), not addEventListener
    if (this.variableManager && typeof this.variableManager.on === 'function') {
      this.variableManager.on('variables:loaded', (detail: unknown) => {
        if (
          typeof detail === 'object' &&
          detail !== null &&
          'variables' in detail &&
          typeof detail.variables === 'object'
        ) {
          this.state.variables = detail.variables as Record<string, unknown>;
          logger.info('Variables loaded, refreshing UI');
          this.uiManager?.updateVariablesList(this.state.variables || {});
        }
      });
      this.variableManager.on('variable:set', (detail: unknown) => {
        if (
          typeof detail === 'object' &&
          detail !== null &&
          'name' in detail &&
          'value' in detail &&
          typeof detail.name === 'string'
        ) {
          if (!this.state.variables) this.state.variables = {};
          this.state.variables[detail.name] = detail.value;
          logger.info(`Variable ${detail.name} set, refreshing UI`);
          this.uiManager?.updateVariablesList(this.state.variables || {});
        }
      });
      this.variableManager.on('variable:deleted', (detail: unknown) => {
        if (
          typeof detail === 'object' &&
          detail !== null &&
          'name' in detail &&
          typeof detail.name === 'string' &&
          this.state.variables
        ) {
          delete this.state.variables[detail.name];
          logger.info(`Variable ${detail.name} deleted, refreshing UI`);
          this.uiManager?.updateVariablesList(this.state.variables || {});
        }
      });
      this.variableManager.on('variables:cleared', () => {
        this.state.variables = {};
        logger.info('Variables cleared, refreshing UI');
        this.uiManager?.updateVariablesList({});
      });
    } else {
      logger.warn('VariableManager does not support EventEmitter pattern (on method)');
    }

    // --- Domain State Manager Events ---
    // DomainStateManager also uses EventEmitter
    if (this.domainStateManager && typeof this.domainStateManager.on === 'function') {
      this.domainStateManager.on(
        'snapshotChange',
        (phase: 'before' | 'after', snapshots: Record<string, unknown>) => {
          logger.info(`Domain snapshot taken: ${phase}`, snapshots);
          // Optionally update UI or state based on snapshot changes
          // Maybe trigger diff calculation in viewer?
          // The viewer itself already listens, this might be redundant
        },
      );
      this.domainStateManager.on('error', (message: string, error?: any) => {
        logger.error('DomainStateManager reported an error:', message, error);
        this.uiManager?.showError('Domain State Error', message);
      });
    } else {
      logger.warn('DomainStateManager does not support EventEmitter pattern (on method)');
    }

    // --- Flow Controller Events ---
    // Example: Listen for flow completion or status updates
    // if (this.flowController) { ... }

    logger.info('AppController event listeners set up.');
  }

  /**
   * Handle form submission to make an API request
   * @param requestData Data from the form
   * @returns A Promise that resolves with the response or rejects with the error.
   */
  public async handleRequestSubmit(requestData: RequestInfo): Promise<any> {
    return new Promise(async (resolve, reject) => {
      logger.info('Handling request submission:', requestData);
      if (!this.apiClient || typeof this.apiClient.makeRequest !== 'function') {
        logger.error('API Client not available or invalid to handle request.');
        return reject(new Error('API Client not configured'));
      }

      // Replace variables in URL, headers, body
      const processedData = this.processRequestVariables(requestData);
      const { method, url, requestBody, headers } = processedData;
      // Define options with an index signature to allow arbitrary properties like requestId
      const options: { headers: Record<string, string>; [key: string]: any } = { headers };

      // Generate a unique ID for this request
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // --- Temporary Event Listeners for this request ---
      const completeListener = eventData => {
        if (eventData?.requestId === requestId) {
          logger.debug(`Request ${requestId} complete.`);
          // Use optional chaining for safety when removing listeners
          this.apiClient?.removeEventListener('request:complete', completeListener);
          this.apiClient?.removeEventListener('request:failed', failedListener);
          this.handleApiResponse(eventData.responseData || eventData); // Handle response
          resolve(eventData.responseData || eventData);
        }
      };

      const failedListener = errorData => {
        if (errorData?.requestId === requestId) {
          logger.error(`Request ${requestId} failed.`);
          // Use optional chaining for safety when removing listeners
          this.apiClient?.removeEventListener('request:complete', completeListener);
          this.apiClient?.removeEventListener('request:failed', failedListener);
          this.handleApiError(errorData); // Handle error
          reject(errorData);
        }
      };

      // Attach listeners IF the apiClient supports it
      if (
        typeof this.apiClient?.addEventListener === 'function' &&
        typeof this.apiClient?.removeEventListener === 'function'
      ) {
        this.apiClient.addEventListener('request:complete', completeListener);
        this.apiClient.addEventListener('request:failed', failedListener);
      } else {
        logger.warn(
          "APIClient doesn't support standard event listeners for request completion tracking.",
        );
      }
      // --- End Temporary Listeners ---

      try {
        logger.info(`Initiating API Request ${requestId}: ${method} ${url}`);
        // Add requestId to options
        options.requestId = requestId;

        // Call the existing makeRequest method
        await this.apiClient.makeRequest(method, url, requestBody, options);

        // Fallback if no event support
        if (!(typeof this.apiClient?.addEventListener === 'function')) {
          logger.warn(
            `Resolving promise for ${requestId} immediately as APIClient has no event support.`,
          );
          resolve(undefined);
        }
      } catch (error) {
        logger.error(`Synchronous error calling APIClient.makeRequest for ${requestId}:`, error);
        // Clean up listeners if they were attached
        if (typeof this.apiClient?.removeEventListener === 'function') {
          this.apiClient.removeEventListener('request:complete', completeListener);
          this.apiClient.removeEventListener('request:failed', failedListener);
        }
        this.handleApiError(error);
        reject(error);
      }
    });
  }

  /**
   * Process request data, replacing any variable placeholders
   * @param requestData Raw request data
   * @returns Request data with variables substituted
   */
  public processRequestVariables(requestData: RequestInfo): RequestInfo {
    if (!this.variableManager) {
      return requestData;
    }

    // Use processVariables which handles strings, objects, arrays recursively
    const processed: RequestInfo = this.variableManager.processVariables(requestData);
    return processed;
  }

  /**
   * Handle successful API response
   * @param response Response data from APIClient
   */
  private handleApiResponse(response): void {
    logger.info('API Response received:', response);
    this.state.lastResponse = response;

    // Use ResponseViewer if available
    if (this.responseViewer && typeof this.responseViewer.showResponse === 'function') {
      this.responseViewer.showResponse(response);
    } else {
      logger.warn('ResponseViewer not available or lacks showResponse method');
      // TODO: Fallback UI update logic needed
    }

    // Update history
    if (this.historyManager && this.state.currentRequest) {
      const requestInfoForHistory = { ...this.state.currentRequest }; // Might need more details
      this.historyManager.addEntry(requestInfoForHistory, response);
    }
  }

  /**
   * Handle API error response
   * @param error Error data from APIClient or internal error
   */
  private handleApiError(error): void {
    logger.error('API Error encountered:', error);
    this.state.lastResponse = error; // Store error as last response info

    // Use ResponseViewer to display error if available
    if (this.responseViewer && typeof this.responseViewer.showError === 'function') {
      // Format the error for the viewer
      const errorData = {
        message: error.message || 'Unknown Error',
        code: error.statusCode || error.status || 0,
        details:
          error.responseData ||
          (error.isTimeoutError
            ? 'Request Timed Out'
            : error.isNetworkError
              ? 'Network Error'
              : undefined),
        stack: error.stack,
      };
      this.responseViewer.showError(errorData);
    } else {
      logger.warn('ResponseViewer not available or lacks showError method');
      // TODO: Fallback UI error display logic needed
    }
  }

  /**
   * Handle changes to the request data (e.g., URL, method, headers, body)
   * @param data Partial request data that changed
   */
  private handleRequestDataChange(data: Partial<RequestInfo>): void {
    // Merge changes into the current request state
    this.state.currentRequest = {
      ...this.state.currentRequest,
      ...data,
    } as RequestInfo;

    logger.debug('Request data changed:', this.state.currentRequest);

    // Call the new UI Manager method if it exists
    if (typeof this.uiManager?.updateRequestForm === 'function') {
      this.uiManager.updateRequestForm(this.state.currentRequest as RequestInfo);
    } else {
      logger.warn('uiManager does not have updateRequestForm method');
    }
  }

  /**
   * Gets the current request details (needed for DomainStateViewer)
   * NOTE: Ensure this returns the format expected by DomainStateViewer's getCurrentRequest
   */
  public getCurrentRequestDetails(): { path?: string; body?: any } | null {
    if (this.state.currentRequest) {
      // Ensure the returned object has path and body properties
      return {
        path: this.state.currentRequest.path || this.state.currentRequest.url, // Use URL as fallback
        body: this.state.currentRequest.requestBody,
      };
    }
    return null;
  }
}
