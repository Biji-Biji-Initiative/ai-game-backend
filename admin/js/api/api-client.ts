// Types improved by ts-improve-types
/**
 * API Client Module
 * Handles making API requests and processing responses
 */

// Define interfaces for API requests, responses, and handlers
export interface ApiRequest {
  method: string;
  url: string;
  headers: Record<string, string | undefined>;
  body?: unknown;
  requestId?: string;
}

export interface ApiResponse<T = unknown> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  ok: boolean;
  url: string;
  data: T;
}

export interface ApiErrorData {
  requestId: string;
  requestInfo: ApiRequest;
  status?: number;
  message: string;
  errorCode?: string | number;
  response?: Partial<ApiResponse<unknown>>;
  responseData?: unknown;
  error?: Error;
  errorType?: 'api' | 'timeout' | 'network';
  duration?: number;
}

export interface ApiSuccessData<T = unknown> {
  requestId: string;
  requestInfo: ApiRequest;
  response: Partial<ApiResponse<unknown>>;
  responseData: T;
  duration: number;
  contentType?: string;
}

export interface ApiClientOptions {
  baseUrl?: string;
  apiVersion?: string;
  useApiVersionPrefix?: boolean;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  useAuthToken?: boolean;
  requestId?: string;
  [key: string]: unknown;
}

// Define error handler interface
export interface ApiErrorHandler {
  processApiError: (error: ApiErrorData) => void;
  processTimeoutError: (error: ApiErrorData) => void;
  processNetworkError: (error: ApiErrorData) => void;
}

/**
 * APIClient class for making API requests
 */
export class APIClient {
  private errorHandler: ApiErrorHandler;
  private config: Record<string, unknown>;
  private baseUrl: string;
  private apiVersion: string;
  private useApiVersionPrefix: boolean;
  private listeners: Map<string, Function[]>;
  private authToken?: string;

  /**
   * Creates a new APIClient instance
   * @param errorHandler Error handler for processing API errors
   * @param config Configuration settings
   */
  constructor(errorHandler: ApiErrorHandler, config: Record<string, unknown> = {}) {
    this.errorHandler = errorHandler;
    this.config = config;
    this.baseUrl = (config?.apiBaseUrl as string) || '/api';
    this.apiVersion = (config?.apiVersion as string) || 'v1';
    this.useApiVersionPrefix = (config?.useApiVersionPrefix as boolean) ?? true;
    this.listeners = new Map();
  }

  /**
   * Adds an event listener for API events
   * @param event The event name
   * @param callback The callback function
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.push(callback);
    }
  }

  /**
   * Removes an event listener
   * @param event The event name
   * @param callback The callback function to remove
   */
  removeEventListener(event: string, callback: Function): void {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    }
  }

  /**
   * Emits an event to all registered listeners
   * @param event The event name
   * @param data The event data
   */
  emit<T>(event: string, data: T): void {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.forEach(callback => callback(data));
      }
    }
  }

  /**
   * Gets the authentication token
   * @returns The authentication token
   */
  getAuthToken(): string | undefined {
    return this.authToken;
  }

  /**
   * Sets the authentication token
   * @param token The authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clears the authentication token
   */
  clearAuthToken(): void {
    this.authToken = undefined;
  }

  /**
   * Sets the base URL for the API
   * @param url The base URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Sets the API version
   * @param version The API version string (e.g., 'v1')
   */
  setApiVersion(version: string): void {
    this.apiVersion = version;
  }

  /**
   * Sets whether to use the API version prefix in the URL
   * @param usePrefix True to use the prefix, false otherwise
   */
  setUseApiVersionPrefix(usePrefix: boolean): void {
    this.useApiVersionPrefix = usePrefix;
  }

  /**
   * Makes an API request
   * @param method The HTTP method to use
   * @param endpoint The API endpoint
   * @param body The request body
   * @param options Additional options for the request
   * @returns Promise that resolves with the response data
   */
  async makeRequest<T = unknown>(
    method: string,
    endpoint: string,
    body: unknown = null,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const requestId =
      options.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const useAuthToken = options.useAuthToken !== false; // Default to true
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (useAuthToken && this.getAuthToken()) {
      headers['Authorization'] = `Bearer ${this.getAuthToken()}`;
    }

    const requestOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: headers,
    };

    if (
      body &&
      (method.toUpperCase() === 'POST' ||
        method.toUpperCase() === 'PUT' ||
        method.toUpperCase() === 'PATCH')
    ) {
      requestOptions.body = JSON.stringify(body);
    }

    // Endpoint formatting logic
    if (!endpoint.startsWith('/') && !endpoint.startsWith('http')) {
      endpoint = '/' + endpoint;
    }
    if (
      this.useApiVersionPrefix &&
      this.apiVersion &&
      !endpoint.includes(`/${this.apiVersion}/`) &&
      !endpoint.startsWith('http')
    ) {
      endpoint = `/${this.apiVersion}${endpoint}`;
    }
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const requestInfo: ApiRequest = {
      requestId,
      method: method.toUpperCase(),
      url,
      headers: {
        ...headers,
        Authorization: headers.Authorization ? 'Bearer ...REDACTED' : undefined,
      },
      body: requestOptions.body,
    };

    this.emit('request:start', { requestInfo });

    const timeout = options.timeout || (this.config?.requestTimeout as number) || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    requestOptions.signal = controller.signal;

    const startTime = Date.now();

    try {
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const duration = endTime - startTime;

      let responseData: unknown;
      const contentType = response.headers.get('content-type') || '';

      // Parse response based on content type
      if (contentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch (e) {
          responseData = { parseError: e instanceof Error ? e.message : String(e) };
        }
      } else if (contentType.includes('text/')) {
        try {
          responseData = await response.text();
        } catch (e) {
          responseData = { readError: e instanceof Error ? e.message : String(e) };
        }
      } else {
        try {
          responseData = await response.blob();
        } catch (e) {
          responseData = { readError: e instanceof Error ? e.message : String(e) };
        }
      }

      // Construct serializable response summary
      const responseSummary: Partial<ApiResponse<T>> = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok,
        url: response.url,
        data: responseData as T,
      };

      const eventPayload: ApiSuccessData<T> = {
        requestId,
        requestInfo,
        response: responseSummary,
        responseData: responseData as T,
        duration,
        contentType,
      };

      if (!response.ok) {
        const errorData: ApiErrorData = {
          requestId,
          requestInfo,
          message: this.extractErrorMessage(responseData),
          errorCode: this.extractErrorCode(responseData),
          errorType: 'api',
          status: response.status,
          response: responseSummary,
          responseData,
          duration,
        };
        this.emit('response:error', errorData);
        this.emit('request:failed', errorData);

        if (this.errorHandler) {
          this.errorHandler.processApiError(errorData);
        }

        // Create a more detailed error to throw
        const error = new Error(errorData.message || 'API Error');
        (error as any).statusCode = response.status;
        (error as any).responseData = responseData;
        (error as any).errorCode = errorData.errorCode;
        throw error;
      } else {
        this.emit('response:success', eventPayload);
        this.emit('request:complete', eventPayload);
      }

      return responseData as T;
    } catch (error) {
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const duration = endTime - startTime;
      let errorType: 'timeout' | 'network' = 'network';
      let message = error instanceof Error ? error.message : String(error);

      if (error instanceof Error && error.name === 'AbortError') {
        errorType = 'timeout';
        message = `Request timed out after ${timeout}ms`;
      }

      const errorData: ApiErrorData = {
        requestId,
        requestInfo,
        error: error instanceof Error ? error : new Error(String(error)),
        errorType,
        message,
        duration,
        status: (error as any).statusCode,
        errorCode: (error as any).errorCode,
        responseData: (error as any).responseData,
      };

      // Emit relevant events
      if (errorType === 'timeout') {
        this.emit('response:timeout', errorData);
        if (this.errorHandler) {
          this.errorHandler.processTimeoutError(errorData);
        }
      } else {
        this.emit('response:network-error', errorData);
        if (this.errorHandler) {
          this.errorHandler.processNetworkError(errorData);
        }
      }

      this.emit('request:failed', errorData);

      throw error;
    }
  }

  /**
   * Extracts the error message from an API response
   * @param responseData Response data
   * @returns Error message or null
   */
  private extractErrorMessage(responseData: unknown): string {
    if (!responseData) return 'No response data';
    if (typeof responseData === 'string') return responseData;

    // Check if it's an object before accessing properties
    if (typeof responseData === 'object' && responseData !== null) {
      if ('message' in responseData && typeof responseData.message === 'string') {
        return responseData.message;
      }
      if ('error' in responseData) {
        if (typeof responseData.error === 'string') return responseData.error;
        if (
          typeof responseData.error === 'object' &&
          responseData.error !== null &&
          'message' in responseData.error &&
          typeof responseData.error.message === 'string'
        ) {
          return responseData.error.message;
        }
      }
      if ('detail' in responseData && typeof responseData.detail === 'string') {
        return responseData.detail;
      }
      if (
        'errors' in responseData &&
        Array.isArray(responseData.errors) &&
        responseData.errors.length > 0
      ) {
        // Join multiple errors or return the first one
        return responseData.errors
          .map((err: unknown) =>
            err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err),
          )
          .join(', ');
      }
    }

    // If no common structure found, try to stringify
    try {
      const str = JSON.stringify(responseData);
      // Avoid returning giant JSON strings as error messages
      if (str.length < 200) return str;
    } catch (e) {
      // Ignore stringify errors
    }

    return 'An unknown error occurred';
  }

  /**
   * Extracts an error code from a response
   * @param responseData Response data to extract error code from
   * @returns The extracted error code
   */
  extractErrorCode(responseData: unknown): string | number | null {
    // Try to extract error code from various formats
    if (responseData && typeof responseData === 'object') {
      // Check if object before indexing
      if (
        'code' in responseData &&
        (typeof responseData.code === 'string' || typeof responseData.code === 'number')
      ) {
        return responseData.code;
      }
      if ('error' in responseData && responseData.error && typeof responseData.error === 'object') {
        if (
          'code' in responseData.error &&
          (typeof responseData.error.code === 'string' ||
            typeof responseData.error.code === 'number')
        ) {
          return responseData.error.code;
        }
      }
      if (
        'status' in responseData &&
        (typeof responseData.status === 'string' || typeof responseData.status === 'number')
      ) {
        return responseData.status;
      }
    }
    return null;
  }
}
