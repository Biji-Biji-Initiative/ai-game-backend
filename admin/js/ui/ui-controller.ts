// Types improved by ts-improve-types
/**
 * UI Controller Module
 * Main controller for the API Tester UI
 */

import { formatDate, formatDuration } from '../utils/date-utils';
import { FormUtils } from '../utils/form-utils';
import { EndpointManager, Endpoint } from '../modules/endpoint-manager';
import { VariableManager } from '../modules/variable-manager';
import { HistoryManager, HistoryEntry } from '../modules/history-manager';
import { TabManager } from '../modules/tab-manager';
import { ErrorHandler } from '../utils/error-handler';
import { AuthManager, AuthState } from '../modules/auth-manager';
import { APIClient } from '../api/api-client';
import { Config } from '../config/config';
import { ResponseViewer } from '../components/ResponseViewer';
import { logger } from '../utils/logger';

// Rename local interface to avoid conflict
interface UIConfig {
  baseUrl: string;
  apiPath: string;
  authEnabled: boolean;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  useLocalStorage?: boolean;
  theme?: string;
  debug?: boolean;
  features?: {
    history?: boolean;
    variables?: boolean;
    stateTracking?: boolean;
    authentication?: boolean;
  };
}

// Type for API request/response events
interface ApiEventData {
  requestInfo: RequestInfo;
  response: Response;
  responseData: any;
}

// Type for API error events
interface ApiErrorData {
  requestInfo: RequestInfo;
  statusCode: number;
  statusText: string;
  responseData: any;
  message: string;
  headers?: Headers;
  time?: number;
  response?: Response;
}

// Import JSONEditor type
// The JSONEditor is from an external file, so we'll declare its interface
interface JSONEditor {
  set: (json) => void;
  get: () => any;
  destroy: () => void;
}

// External JSONEditorManager interface
interface JSONEditorManager {
  initializeEditors: () => void;
  getEditor: (id: string) => JSONEditor | null;
}

// Extend HistoryEntry with the needed properties for our UI
interface ExtendedHistoryEntry extends HistoryEntry {
  headers?: Record<string, string>;
  requestBody?: any;
}

interface UIControllerOptions {
  apiClient: APIClient | null;
  config: Config | null;
  errorHandler: ErrorHandler | null;
  endpointManager: EndpointManager | null;
  historyManager: HistoryManager | null;
  tabManager: TabManager | null;
  responseViewer: ResponseViewer | null;
  authManager: AuthManager | null;
  jsonEditorManager: JSONEditorManager | null;
}

interface UIElements {
  endpointSelector: HTMLSelectElement | null;
  methodSelector: HTMLSelectElement | null;
  urlInput: HTMLInputElement | null;
  requestBodyContainer: HTMLElement | null;
  requestHeadersContainer: HTMLElement | null;
  sendButton: HTMLButtonElement | null;
  clearButton: HTMLButtonElement | null;
  historyList: HTMLElement | null;
  historyContainer: HTMLElement | null;
  responseContainer: HTMLElement | null;
  loadingIndicator: HTMLElement | null;
}

interface RequestInfo {
  method: string;
  url: string;
  path?: string;
  headers?: Record<string, string>;
  requestBody?: any;
}

interface ResponseInfo {
  status: number;
  statusText: string;
  data: unknown[] | Record<string, unknown>;
  success: boolean;
}

// Extended response type for display
interface FormattedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  time: number;
  size: number;
  formattedTime?: string;
}

// Add extended interface for ResponseViewer with showError method
interface ExtendedResponseViewer extends ResponseViewer {
  showResponse: (response: FormattedResponse) => void;
  showError: (error: any) => void;
}

// Add extended interface for HistoryManager with getEntries method
interface ExtendedHistoryManager extends HistoryManager {
  getEntries: () => ExtendedHistoryEntry[];
  addEntry: (requestInfo: RequestInfo, responseData: ResponseInfo) => ExtendedHistoryEntry;
}

/**
 * UI Controller class for the API tester interface
 */
export class UIController {
  private options: UIControllerOptions;
  private apiClient: APIClient | null;
  private config: Config | null;
  private errorHandler: ErrorHandler | null;
  private endpointManager: EndpointManager | null;
  private historyManager: ExtendedHistoryManager | null;
  private tabManager: TabManager | null;
  private responseViewer: ExtendedResponseViewer | null;
  private authManager: AuthManager | null;
  private jsonEditorManager: JSONEditorManager | null;

  private elements: UIElements;
  private requestBodyEditor: JSONEditor | null;
  private requestHeadersEditor: JSONEditor | null;
  private currentEndpoint: Endpoint | null;
  private isLoading: boolean;

  /**
   * Constructor
   */
  constructor(options: Partial<UIControllerOptions> = {}) {
    // Initialize with default options
    this.options = {
      apiClient: null,
      config: null,
      errorHandler: null,
      endpointManager: null,
      historyManager: null,
      tabManager: null,
      responseViewer: null,
      authManager: null,
      jsonEditorManager: null,
      ...options,
    };

    // Extract dependencies
    this.apiClient = this.options.apiClient; // Property added
    this.config = this.options.config; // Property added
    this.errorHandler = this.options.errorHandler; // Property added
    this.endpointManager = this.options.endpointManager; // Property added
    this.historyManager = this.options.historyManager as ExtendedHistoryManager; // Property added
    this.tabManager = this.options.tabManager; // Property added
    this.responseViewer = this.options.responseViewer as ExtendedResponseViewer; // Property added
    this.authManager = this.options.authManager as AuthManager; // Property added
    this.jsonEditorManager = this.options.jsonEditorManager; // Property added

    // UI elements
    this.elements = {
      endpointSelector: null,
      methodSelector: null,
      urlInput: null,
      requestBodyContainer: null,
      requestHeadersContainer: null,
      sendButton: null,
      clearButton: null,
      historyList: null,
      historyContainer: null,
      responseContainer: null,
      loadingIndicator: null,
    };

    // JSON editors
    this.requestBodyEditor = null; // Property added
    this.requestHeadersEditor = null; // Property added

    // Current endpoint
    this.currentEndpoint = null; // Property added

    // Loading state
    this.isLoading = false; // Property added
  }

  /**
   * Initializes UI elements
   */
  initElements(): void {
    // Get references to UI elements
    this.elements = {
      endpointSelector: document.getElementById('endpoint-selector') as HTMLSelectElement,
      methodSelector: document.getElementById('method-selector') as HTMLSelectElement,
      urlInput: document.getElementById('url-input') as HTMLInputElement,
      requestBodyContainer: document.getElementById('request-body-container'),
      requestHeadersContainer: document.getElementById('request-headers-container'),
      sendButton: document.getElementById('send-request-btn') as HTMLButtonElement,
      clearButton: document.getElementById('clear-request-btn') as HTMLButtonElement,
      historyList: document.getElementById('history-list'),
      historyContainer: document.getElementById('history-container'),
      responseContainer: document.getElementById('response-container'),
      loadingIndicator: document.getElementById('loading-indicator'),
    };

    // Check if elements exist
    if (!this.elements.endpointSelector) {
      console.error('UIController: Endpoint selector element not found');
    }

    if (!this.elements.methodSelector) {
      console.error('UIController: Method selector element not found');
    }

    if (!this.elements.sendButton) {
      console.error('UIController: Send button element not found');
    }
  }

  /**
   * Renders the UI
   */
  render(): void {
    // Initialize UI elements
    this.initElements();

    // Initialize JSON editors
    this.initJsonEditors();

    // Populate UI with initial data
    this.populateEndpointSelector();
    this.populateMethodSelector();

    // Set up event listeners
    this.setupEventListeners();

    // Set up API client listeners
    this.setupApiClientListeners();

    // Render history
    this.renderHistory();
  }

  /**
   * Initializes JSON editors
   */
  initJsonEditors(): void {
    // Use the JSONEditorManager if available
    if (this.jsonEditorManager) {
      // Add classes to the containers to make them selectable for the manager
      if (this.elements.requestBodyContainer) {
        this.elements.requestBodyContainer.classList.add('json-editor-container');
        this.elements.requestBodyContainer.id = 'request-body-editor';
      }

      if (this.elements.requestHeadersContainer) {
        this.elements.requestHeadersContainer.classList.add('json-editor-container');
        this.elements.requestHeadersContainer.id = 'request-headers-editor';
      }

      // Initialize editors
      this.jsonEditorManager.initializeEditors();

      // Get references to the editors
      this.requestBodyEditor = this.jsonEditorManager.getEditor('request-body-editor'); // Property added
      this.requestHeadersEditor = this.jsonEditorManager.getEditor('request-headers-editor'); // Property added

      // Set default content for headers
      if (this.requestHeadersEditor) {
        this.requestHeadersEditor.set({
          'Content-Type': 'application/json',
        });
      }

      return;
    }

    // If using JSONEditorManager is not an option, we should implement a fallback,
    // but this would require importing the JSONEditor directly, which we're
    // leaving out for now since it causes type issues
    console.warn('JSONEditorManager not available. JSON editors will not be initialized.');
  }

  /**
   * Sets up event listeners for UI elements
   */
  setupEventListeners(): void {
    // Set up endpoint selector change event
    if (this.elements.endpointSelector) {
      this.elements.endpointSelector.addEventListener('change', event => {
        const target = event.target as HTMLSelectElement;
        this.handleEndpointChange(target.value);
      });
    }

    // Set up method selector change event
    if (this.elements.methodSelector) {
      this.elements.methodSelector.addEventListener('change', event => {
        const target = event.target as HTMLSelectElement;
        this.handleMethodChange(target.value);
      });
    }

    // Set up send button click event
    if (this.elements.sendButton) {
      this.elements.sendButton.addEventListener('click', () => {
        this.handleSendRequest();
      });
    }

    // Set up clear button click event
    if (this.elements.clearButton) {
      this.elements.clearButton.addEventListener('click', () => {
        this.handleClearRequest();
      });
    }

    // Set up auth form events if auth elements exist
    const loginForm = document.getElementById('login-form') as HTMLFormElement | null;
    if (loginForm) {
      loginForm.addEventListener('submit', e => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    const signupForm = document.getElementById('signup-form') as HTMLFormElement | null;
    if (signupForm) {
      signupForm.addEventListener('submit', e => {
        e.preventDefault();
        this.handleSignup();
      });
    }

    const logoutButton = document.getElementById('logout-btn') as HTMLButtonElement | null;
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        this.handleLogout();
      });
    }
  }

  /**
   * Sets up API client event listeners
   */
  setupApiClientListeners(): void {
    if (!this.apiClient) return;

    // Listen for request start
    this.apiClient.addEventListener('request:start', (_data: unknown) => {
      // Show loading indicator
      this.setLoading(true);
    });

    // Listen for successful response
    this.apiClient.addEventListener('response:success', (data: ApiEventData) => {
      // Hide loading indicator
      this.setLoading(false);

      // Display response
      this.handleApiResponse(data);

      // Add to history
      this.addToHistory(data.requestInfo, {
        status: data.response.status,
        statusText: data.response.statusText,
        data: data.responseData,
        success: data.response.ok,
      });
    });

    // Listen for response error
    this.apiClient.addEventListener('response:error', (error: ApiErrorData) => {
      // Hide loading indicator
      this.setLoading(false);

      // Display error response
      this.handleApiError(error);

      // Add to history
      this.addToHistory(error.requestInfo, {
        status: error.statusCode,
        statusText: error.statusText,
        data: error.responseData,
        success: false,
      });
    });

    // Listen for network error
    this.apiClient.addEventListener('response:network-error', (error: ApiErrorData) => {
      // Hide loading indicator
      this.setLoading(false);

      // Display network error
      this.handleNetworkError(error);

      // Add to history
      this.addToHistory(error.requestInfo, {
        status: 0,
        statusText: 'Network Error',
        data: { error: error.message },
        success: false,
      });
    });
  }

  /**
   * Populates the endpoint selector with available endpoints
   */
  populateEndpointSelector(): void {
    const selector = this.elements.endpointSelector;
    if (!selector || !this.endpointManager) return;

    // Clear current options
    selector.innerHTML = '';

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select Endpoint --';
    selector.appendChild(defaultOption);

    // Get categories and endpoints
    const categories = this.endpointManager.getCategories();

    // Add endpoints by category
    categories.forEach(category => {
      const endpoints = this.endpointManager.getEndpointsByCategory(category);

      if (endpoints.length > 0) {
        // Create optgroup for category
        const optgroup = document.createElement('optgroup');
        optgroup.label = category;

        // Add endpoints to optgroup
        endpoints.forEach(endpoint => {
          const option = document.createElement('option');
          option.value = endpoint.id;
          option.textContent = endpoint.name;
          (option as HTMLElement).dataset.path = endpoint.path || '';
          // @ts-ignore - Complex type issues
          (option as HTMLElement).dataset.method = endpoint.method || 'GET';
          optgroup.appendChild(option);
        });

        // Add optgroup to selector
        selector.appendChild(optgroup);
      }
    });
  }

  /**
   * Populates the method selector with available HTTP methods
   */
  populateMethodSelector(): void {
    if (!this.elements.methodSelector) return;

    // Clear current options
    this.elements.methodSelector.innerHTML = '';

    // Add method options
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

    methods.forEach(method => {
      const option = document.createElement('option');
      option.value = method;
      option.textContent = method;
      this.elements.methodSelector.appendChild(option);
    });

    // Select GET by default
    this.elements.methodSelector.value = 'GET';
  }

  /**
   * Handles endpoint change
   * @param endpointId - The selected endpoint ID
   */
  handleEndpointChange(endpointId: string): void {
    if (!endpointId || !this.endpointManager) return;

    // Get endpoint
    const endpoint = this.endpointManager.getEndpointById(endpointId);

    if (!endpoint) return;

    // Set current endpoint
    this.currentEndpoint = endpoint; // Property added

    // Update URL input
    if (this.elements.urlInput) {
      this.elements.urlInput.value = endpoint.path || '';
    }

    // Update method selector
    if (this.elements.methodSelector && endpoint.method) {
      this.elements.methodSelector.value = endpoint.method;
    }

    // Update request body editor
    if (this.requestBodyEditor && endpoint.requestBody) {
      this.requestBodyEditor.set(endpoint.requestBody);
    } else if (this.requestBodyEditor) {
      this.requestBodyEditor.set({});
    }

    // Update request headers editor
    if (this.requestHeadersEditor && endpoint.headers) {
      this.requestHeadersEditor.set(endpoint.headers);
    }
  }

  /**
   * Handles method change
   * @param method - The selected method
   */
  handleMethodChange(method: string): void {
    if (!this.currentEndpoint) return;

    // Enable/disable request body based on method
    const methodsWithBody = ['POST', 'PUT', 'PATCH'];

    if (this.elements.requestBodyContainer) {
      const parent = this.elements.requestBodyContainer.parentElement;
      if (parent) {
        parent.style.display = methodsWithBody.includes(method) ? 'block' : 'none';
      }
    }
  }

  /**
   * Handles send request
   */
  handleSendRequest(): void {
    if (!this.apiClient || !this.elements.methodSelector || !this.elements.urlInput) return;

    // Get request details
    const method = this.elements.methodSelector.value;
    const url = this.elements.urlInput.value;

    // Get request body
    let body = null;
    if (this.requestBodyEditor) {
      try {
        body = this.requestBodyEditor.get();
      } catch (error) {
        // Handle invalid JSON
        if (this.errorHandler) {
          this.errorHandler.processValidationError({
            message: 'Invalid JSON in request body',
            field: 'request-body',
          });
        }
        return;
      }
    }

    // Get request headers
    let headers: Record<string, string> = {};
    if (this.requestHeadersEditor) {
      try {
        headers = this.requestHeadersEditor.get();
      } catch (error) {
        // Handle invalid JSON
        if (this.errorHandler) {
          this.errorHandler.processValidationError({
            message: 'Invalid JSON in request headers',
            field: 'request-headers',
          });
        }
        return;
      }
    }

    // Make request
    this.apiClient.makeRequest(method, url, body, { headers });
  }

  /**
   * Handles clear request
   */
  handleClearRequest(): void {
    // Clear URL input
    if (this.elements.urlInput) {
      this.elements.urlInput.value = '';
    }

    // Reset method selector
    if (this.elements.methodSelector) {
      this.elements.methodSelector.value = 'GET';
    }

    // Clear request body editor
    if (this.requestBodyEditor) {
      this.requestBodyEditor.set({});
    }

    // Reset request headers editor
    if (this.requestHeadersEditor) {
      this.requestHeadersEditor.set({ 'Content-Type': 'application/json' });
    }

    // Reset endpoint selector
    if (this.elements.endpointSelector) {
      this.elements.endpointSelector.value = '';
    }

    // Clear current endpoint
    this.currentEndpoint = null; // Property added
  }

  /**
   * Handles API response
   * @param data - The response data
   */
  handleApiResponse(data: ApiEventData): void {
    if (!this.responseViewer || !data || !data.response) return;

    // Format response for viewer
    const response: FormattedResponse = {
      status: data.response.status,
      statusText: data.response.statusText,
      headers: this.extractHeaders(data.response.headers),
      body: data.responseData,
      time:
        data.response.headers && data.response.headers.get('X-Response-Time')
          ? parseInt(data.response.headers.get('X-Response-Time') || '0', 10)
          : 0,
      size: this.estimateResponseSize(data.responseData || {}),
    };

    // Add formatted time if available
    if (response.time) {
      response.formattedTime = formatDuration(response.time);
    }

    // Show response
    this.responseViewer.showResponse(response);
  }

  /**
   * Handles API error
   * @param error - The error data
   */
  handleApiError(error: ApiErrorData): void {
    if (!this.responseViewer || !error) return;

    // Format error response for viewer
    const response: FormattedResponse = {
      status: error.statusCode,
      statusText: error.statusText || 'Error',
      headers: error.headers ? this.extractHeaders(error.headers) : {},
      body: error.responseData || { message: error.message || 'Unknown error' },
      time: error.time || 0,
      size: this.estimateResponseSize(error.responseData || {}),
    };

    // Add formatted time if available
    if (response.time) {
      response.formattedTime = formatDuration(response.time);
    }

    // Show error response
    this.responseViewer.showError(response);
  }

  /**
   * Handles network error
   * @param error - The error data
   */
  handleNetworkError(error: ApiErrorData): void {
    if (!this.responseViewer || !error) return;

    // Format network error for viewer
    const response: FormattedResponse = {
      status: 0,
      statusText: 'Network Error',
      headers: {},
      body: {
        error: error.message || 'Network connection failed',
        details: error.responseData,
      },
      time: 0,
      size: 0,
    };

    // Show error
    this.responseViewer.showError(response);
  }

  /**
   * Adds a request to history
   * @param requestInfo - Information about the request
   * @param responseData - Response data from the request
   */
  addToHistory(requestInfo: RequestInfo, responseData: ResponseInfo): void {
    if (!this.historyManager) return;

    // Add to history using the historyManager
    const entry = this.historyManager.addEntry(requestInfo, responseData);

    // Update history UI
    this.renderHistoryEntry(entry);
  }

  /**
   * Renders the history
   */
  renderHistory(): void {
    if (!this.historyManager || !this.elements.historyList) return;

    // Clear current history
    this.elements.historyList.innerHTML = '';

    // Get history entries from the historyManager
    const entries = this.historyManager.getEntries();

    // Render entries
    entries.forEach(entry => {
      this.renderHistoryEntry(entry);
    });
  }

  /**
   * Renders a history entry
   * @param entry - The history entry
   */
  renderHistoryEntry(entry: ExtendedHistoryEntry): void {
    if (!this.elements.historyList) return;

    // Create entry element
    const entryElement = document.createElement('div');
    entryElement.className = 'history-entry';
    (entryElement as HTMLElement).dataset.id = entry.id;

    // Determine status class
    let statusClass = 'status-unknown';
    if (entry.status >= 200 && entry.status < 300) {
      statusClass = 'status-success';
    } else if (entry.status >= 400) {
      statusClass = 'status-error';
    } else if (entry.status >= 300) {
      statusClass = 'status-redirect';
    }

    // Format timestamp using date-utils
    const formattedTime = formatDate(entry.timestamp, 'time');

    // Create entry content
    entryElement.innerHTML = `
      <div class="history-entry-header">
        <span class="history-method ${entry.method.toLowerCase()}">${entry.method}</span>
        <span class="history-path">${entry.path || entry.url}</span>
        <span class="history-status ${statusClass}">${entry.status}</span>
      </div>
      <div class="history-entry-meta">
        <span class="history-time">${formattedTime}</span>
      </div>
    `;

    // Add click event to replay request
    entryElement.addEventListener('click', () => {
      this.replayHistoryEntry(entry);
    });

    // Add to history list
    this.elements.historyList.prepend(entryElement);
  }

  /**
   * Replays a history entry
   * @param entry - The history entry
   */
  replayHistoryEntry(entry: ExtendedHistoryEntry): void {
    // Set URL input
    if (this.elements.urlInput) {
      this.elements.urlInput.value = entry.path || entry.url || '';
    }

    // Set method selector
    if (this.elements.methodSelector) {
      this.elements.methodSelector.value = entry.method;
    }

    // Set request body
    if (this.requestBodyEditor && entry.requestBody) {
      try {
        // Handle both string and object formats
        const body =
          typeof entry.requestBody === 'string' ? JSON.parse(entry.requestBody) : entry.requestBody;

        this.requestBodyEditor.set(body);
      } catch (error) {
        console.error('Error parsing request body:', error);
        this.requestBodyEditor.set({});
      }
    }

    // Set request headers
    if (this.requestHeadersEditor && entry.headers) {
      this.requestHeadersEditor.set(entry.headers);
    }
  }

  /**
   * Validates the request
   */
  validateRequest(): void {
    if (!this.elements.sendButton || !this.elements.urlInput || !this.elements.methodSelector) {
    {return;}

    // Validate URL
    const url = this.elements.urlInput.value;
    if (!url) {
      this.elements.sendButton.disabled = true;
      return;
    }

    // Validate JSON in editors
    let isValid = true;

    // Validate request body if visible
    const method = this.elements.methodSelector.value;
    const methodsWithBody = ['POST', 'PUT', 'PATCH'];

    if (methodsWithBody.includes(method) && this.requestBodyEditor) {
      try {
        this.requestBodyEditor.get();
      } catch (error) {
        isValid = false;
      }
    }

    // Validate request headers
    if (this.requestHeadersEditor) {
      try {
        this.requestHeadersEditor.get();
      } catch (error) {
        isValid = false;
      }
    }

    // Enable/disable send button
    this.elements.sendButton.disabled = !isValid;
  }

  /**
   * Sets the loading state
   * @param isLoading - Whether the UI is loading
   */
  public setLoading(isLoading: boolean): void {
    this.isLoading = isLoading;

    const loadingEl = this.elements.loadingIndicator;
    if (loadingEl) {
      loadingEl.style.display = isLoading ? 'flex' : 'none';
    }

    const sendBtn = this.elements.sendButton;
    if (sendBtn) {
      sendBtn.disabled = isLoading;
    }
  }

  /**
   * Extracts headers from Headers object
   * @param headers - Headers object
   * @returns Record of header name to value
   */
  extractHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};

    if (!headers) return result;

    headers.forEach((value, key) => {
      result[key] = value;
    });

    return result;
  }

  /**
   * Estimates the size of a response
   * @param data - The response data
   * @returns The estimated size in bytes
   */
  estimateResponseSize(data: any[] | Record<string, unknown>): number {
    if (!data) return 0;

    // Convert to JSON and measure string length
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  /**
   * Handles login
   */
  async handleLogin(): Promise<void> {
    if (!this.authManager) return;

    const loginForm = document.getElementById('login-form') as HTMLFormElement;
    if (!loginForm) return;

    try {
      // Get form data
      const formData = FormUtils.getFormData(loginForm);

      // Manual validation instead of using FormUtils.validateForm
      if (!formData.email || !formData.password) {
        if (this.errorHandler) {
          this.errorHandler.processValidationError({
            message: 'Email and password are required',
            field: 'login-form',
          });
        }
        return;
      }

      // Show loading state
      this.setLoading(true);

      // Attempt login (returns AuthState)
      const resultState = await this.authManager.login(
        formData.email as string,
        formData.password as string,
      );

      // Handle result based on AuthState
      if (resultState.isAuthenticated) {
        // Show success message
        this.showSuccessMessage('Login successful');
        // Update UI is handled by the event listener now, but can be called redundantly if needed
        // this.updateAuthUI(true, resultState.user);
      } else {
        // This path might not be reachable if login throws on failure
        this.showErrorMessage('Login failed', 'Invalid credentials or server error');
      }
    } catch (error) {
      logger.error('Login error:', error);
      this.showErrorMessage('Login error', (error as Error).message || 'An unexpected error occurred');
    } finally {
      // Hide loading state
      this.setLoading(false);
    }
  }

  /**
   * Handles signup (using register)
   */
  async handleSignup(): Promise<void> {
    if (!this.authManager) return;

    const signupForm = document.getElementById('signup-form') as HTMLFormElement;
    if (!signupForm) return;

    try {
      // Get form data
      const formData = FormUtils.getFormData(signupForm);

      // Manual validation instead of using FormUtils.validateForm
      if (!formData.email || !formData.password || !formData.name) {
        if (this.errorHandler) {
          this.errorHandler.processValidationError({
            message: 'All fields are required',
            field: 'signup-form',
          });
        }
        return;
      }

      this.setLoading(true);

      // Attempt registration (returns AuthState)
      const resultState = await this.authManager.register(
        formData.email as string,
        formData.password as string,
        formData.name as string, // Pass name directly
      );

      // Handle result based on AuthState
      if (resultState.isAuthenticated) {
        this.showSuccessMessage('Signup successful');
        // UI update handled by listener
        // this.updateAuthUI(true, resultState.user);
      } else {
        // This path might not be reachable if register throws on failure
        this.showErrorMessage('Signup failed', 'Could not create account or server error');
      }
    } catch (error) {
      logger.error('Signup error:', error);
      this.showErrorMessage('Signup error', (error as Error).message || 'An unexpected error occurred');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Handles logout
   */
  handleLogout(): void {
    if (!this.authManager) return;

    try {
      // Logout
      this.authManager.logout();

      // Update UI
      this.updateAuthUI(false, null);

      // Show success message
      this.showSuccessMessage('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      this.showErrorMessage('Logout error', (error as Error).message);
    }
  }

  /**
   * Updates the auth UI based on login state
   * @param isLoggedIn - Whether the user is logged in
   * @param user - The user object
   */
  updateAuthUI(isLoggedIn: boolean, user): void {
    // Update login/signup forms visibility
    const authForms = document.getElementById('auth-forms');
    const userInfo = document.getElementById('user-info');

    if (authForms) {
      authForms.style.display = isLoggedIn ? 'none' : 'block';
    }

    if (userInfo) {
      userInfo.style.display = isLoggedIn ? 'block' : 'none';

      // Update user info if available
      const userNameEl = userInfo.querySelector('.user-name');
      const userEmailEl = userInfo.querySelector('.user-email');

      if (userNameEl && user?.name) {
        userNameEl.textContent = user.name;
      }

      if (userEmailEl && user?.email) {
        userEmailEl.textContent = user.email;
      }
    }
  }

  /**
   * Shows a success message
   * @param message - The message to show
   */
  showSuccessMessage(message: string): void {
    // Implement toast or notification
    console.debug('Success:', message);
  }

  /**
   * Shows an error message
   * @param title - The error title
   * @param message - The error message
   */
  showErrorMessage(title: string, message: string): void {
    // Implement toast or notification
    console.error(title, message);
  }

  /**
   * Initializes the UI manager
   */
  initialize(): void {
    console.debug('UIController: Initializing...');

    // Render UI
    this.render();

    // Initialize auth UI
    this.initializeAuthUI();
  }

  /**
   * Initializes the auth UI
   */
  initializeAuthUI(): void {
    if (!this.authManager) return;

    // Use 'on' for EventEmitter pattern
    this.authManager.on('auth-changed', this.handleAuthStateChange.bind(this));

    // Get initial state using AuthManager methods
    const initialState = this.authManager.getAuthState();
    const isLoggedIn = initialState.isAuthenticated;
    const user = initialState.user;

    // Update UI
    this.updateAuthUI(isLoggedIn, user);
  }

  /**
   * Handles auth state changes
   * @param data - Auth state data
   */
  handleAuthStateChange(data: AuthState): void {
    // Directly use the AuthState properties
    const isLoggedIn = data.isAuthenticated;
    const user = data.user;
    this.updateAuthUI(isLoggedIn, user);
  }

  /**
   * Validates a form manually
   * @param form - Form element
   * @param _rules - Validation rules (Marked as unused)
   * @returns Whether the form is valid
   */
  private validateForm(form: HTMLFormElement, _rules = {}): boolean {
    // Get form data
    const formData = FormUtils.getFormData(form);

    // Check if required fields are present
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    // Clear previous error messages
    form.querySelectorAll('.error-message').forEach(el => el.remove());

    Array.from(requiredFields).forEach(field => {
      if (field instanceof HTMLInputElement) {
        const value = formData[field.name];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          isValid = false;

          // Create error message
          const errorMessage = document.createElement('div');
          errorMessage.className = 'error-message text-danger mt-1';
          errorMessage.textContent = `${field.name} is required`;

          // Add error message after field
          if (field.parentElement) {
            field.parentElement.appendChild(errorMessage);
          }
        }
      }
    });

    return isValid;
  }
}
