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
import { ComponentLogger, Logger } from '../core/Logger';
import { DomainStateManager } from '../modules/domain-state-manager';
import { AppState, RequestInfo, ResponseViewer, ErrorData } from '../types/app-types';
import { IAuthManager } from '../types/auth';
import { AuthManager, AuthState } from '../modules/auth-manager';
import { EventBus } from '../core/EventBus';

// Response data interface for proper typing
interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  time?: number;
  size?: number;
  url?: string;
  method?: string;
  formattedTime?: string;
}

// API response interface to help type checking
interface ApiResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: unknown;
}

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
  eventBus: EventBus;
}

// Add FlowManager interface to avoid any type
interface FlowManager {
  loadFlows(): Promise<void>;
  getFlow(id: string): unknown;
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
  private eventBus: EventBus;
  private logger: ComponentLogger;

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
    this.eventBus = options.eventBus;
    this.logger = Logger.getLogger('AppController');
  }

  /**
   * Initialize the controller and its components
   */
  async initialize(): Promise<void> {
    this.logger.info('AppController: Initializing...');

    // Initialize modules that have an initialize method
    if (this.flowController) {
      await this.flowController.initialize();
    }

    // Load initial data (e.g., endpoints)
    await this.loadInitialData();

    // Setup event listeners between components
    this.setupEventListeners();

    this.isInitialized = true;
    this.logger.info('AppController initialized');
  }

  private async loadInitialData(): Promise<void> {
    // Example: Load endpoints if endpointManager exists
    if (this.endpointManager && typeof this.endpointManager.loadEndpoints === 'function') {
      await this.endpointManager.loadEndpoints();
    }
    // Add other initial data loading steps here
  }

  private setupEventListeners(): void {
    this.logger.info('Setting up AppController event listeners...');

    // Form submission events
    this.eventBus.on('form:submit', (requestData: RequestInfo) => {
      this.handleRequestSubmit(requestData).catch(error => {
        this.logger.error('Request submission failed:', error);
      });
    });

    // Endpoint selection events
    this.eventBus.on('endpoint:change', (endpointId: string) => {
      const endpoint = this.endpointManager?.getEndpointById(endpointId);
      if (endpoint) {
        this.handleRequestDataChange({
          method: endpoint.method,
          url: endpoint.path,
          path: endpoint.path,
          headers: endpoint.headers,
          requestBody: endpoint.requestBody,
        });
      }
    });

    // Request data change events
    this.eventBus.on('request:change', (data: Partial<RequestInfo>) => {
      this.handleRequestDataChange(data);
    });

    // History replay events
    this.eventBus.on('history:replay', (entryId: string) => {
      const entry = this.historyManager?.getEntryById(entryId);
      if (entry) {
        this.handleRequestDataChange({
          method: entry.method,
          url: entry.url,
          headers: entry.request.headers,
          requestBody: entry.request.body,
        });
      }
    });

    // Variable extraction events
    this.eventBus.on('variable:extract', (data: { variable: string; path: string }) => {
      if (this.state.lastResponse && this.variableManager) {
        const rule = { name: data.variable, path: data.path };
        this.variableManager.extractVariablesFromResponse(this.state.lastResponse, [rule]);
      }
    });

    // Auth events
    this.eventBus.on('auth:login', (credentials: { email: string; password: string }) => {
      this.authManager?.login(credentials.email, credentials.password);
    });

    this.eventBus.on('auth:logout', () => {
      this.authManager?.logout();
    });

    // API Client events
    this.eventBus.on('request:start', () => {
      this.state.isLoading = true;
      this.uiManager?.showLoading();
    });

    this.eventBus.on('response:success', (response: unknown) => {
      this.state.isLoading = false;
      this.uiManager?.hideLoading();
      this.handleApiResponse(response);
    });

    this.eventBus.on('response:error', (error: Error) => {
      this.state.isLoading = false;
      this.uiManager?.hideLoading();
      this.handleApiError(error);
    });

    // Auth state change events
    this.eventBus.on('auth:change', (authState: AuthState) => {
      this.uiManager?.updateAuthState(authState);
    });

    // Domain state events
    this.eventBus.on('domain:snapshot', (data: { phase: 'before' | 'after'; snapshots: Record<string, unknown> }) => {
      this.logger.info(`Domain snapshot taken: ${data.phase}`, data.snapshots);
    });

    this.eventBus.on('domain:error', (error: { message: string; details?: unknown }) => {
      this.logger.error('Domain state error: ' + error.message);
      this.uiManager?.showError('Domain State Error', error.message);
    });

    this.logger.info('AppController event listeners set up.');
  }

  /**
   * Handle form submission to make an API request
   */
  public async handleRequestSubmit(requestData: RequestInfo): Promise<unknown> {
    this.logger.info('Handling request submission:', requestData);
    
    if (!this.apiClient) {
      throw new Error('API Client not configured');
    }

    // Replace variables in URL, headers, body
    const processedData = this.processRequestVariables(requestData);
    const { method, url, requestBody, headers } = processedData;
    
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const options = { headers, requestId };

    try {
      // Send null if requestBody is empty or undefined
      // This works with the updated makeRequest signature that accepts unknown
      let bodyToSend: unknown = null;
      
      // Only use requestBody if it exists and has content
      if (requestBody !== undefined && requestBody !== null) {
        if (typeof requestBody === 'object' && Object.keys(requestBody as object).length === 0) {
          bodyToSend = null;
        } else {
          bodyToSend = requestBody;
        }
      }
      
      const response = await this.apiClient.makeRequest(method, url, bodyToSend, options);
      this.eventBus.emit('response:success', response);
      return response;
    } catch (error) {
      this.eventBus.emit('response:error', error);
      throw error;
    }
  }

  /**
   * Process request data, replacing any variable placeholders
   */
  public processRequestVariables(requestData: RequestInfo): RequestInfo {
    if (!this.variableManager) {
      return requestData;
    }

    return this.variableManager.processVariables(requestData) as RequestInfo;
  }

  /**
   * Handle successful API response
   */
  private handleApiResponse(response: unknown): void {
    this.logger.info('API Response received:', response);
    this.state.lastResponse = response;

    if (this.responseViewer) {
      // Convert the response to the expected format, using proper type checking
      const apiResponse = response as ApiResponse;
      const responseData: ResponseData = {
        status: apiResponse?.status || 200,
        statusText: apiResponse?.statusText || 'OK',
        headers: apiResponse?.headers || {},
        body: apiResponse?.data || response,
      };
      this.responseViewer.showResponse(responseData);
    }

    if (this.historyManager && this.state.currentRequest) {
      this.historyManager.addEntry(this.state.currentRequest, response);
    }
  }

  /**
   * Handle API error response
   */
  private handleApiError(error: Error & { statusCode?: number; responseData?: unknown }): void {
    this.logger.error('API Error encountered:', error);
    this.state.lastResponse = error;

    if (this.responseViewer) {
      const errorData: ErrorData = {
        message: error.message,
        code: error.statusCode || 0,
        details: error.responseData ? JSON.stringify(error.responseData) : undefined,
        stack: error.stack,
      };
      this.responseViewer.showError(errorData);
    }
  }

  /**
   * Handle changes to the request data
   */
  private handleRequestDataChange(data: Partial<RequestInfo>): void {
    this.state.currentRequest = {
      ...this.state.currentRequest,
      ...data,
    };

    this.logger.debug('Request data changed:', this.state.currentRequest);

    if (this.uiManager?.updateRequestForm) {
      this.uiManager.updateRequestForm(this.state.currentRequest);
    }
  }

  /**
   * Gets the current request details
   */
  public getCurrentRequestDetails(): { path?: string; body?: unknown } | null {
    if (this.state.currentRequest) {
      return {
        path: this.state.currentRequest.path || this.state.currentRequest.url,
        body: this.state.currentRequest.requestBody,
      };
    }
    return null;
  }
}
