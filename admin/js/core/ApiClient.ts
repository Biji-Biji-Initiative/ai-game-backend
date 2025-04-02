// Types improved by ts-improve-types
import { Component } from '../types/component-base';
import { ConfigManager } from './ConfigManager';
import { Logger } from './Logger';
import { DependencyContainer } from './DependencyContainer';
import { APIClient } from '../api/api-client';

/**
 * Options for API endpoints
 */
export interface ApiEndpointOptions {
  /**
   * URL path for the endpoint
   */
  path: string;

  /**
   * HTTP method for the endpoint
   */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  /**
   * Whether authentication is required
   */
  requiresAuth?: boolean;

  /**
   * Default headers for this endpoint
   */
  headers?: Record<string, string>;

  /**
   * Default timeout for this endpoint
   */
  timeout?: number;
}

/**
 * API client configuration
 */
export interface ApiClientOptions {
  /**
   * Base URL for API
   */
  baseUrl?: string;

  /**
   * API version
   */
  apiVersion?: string;

  /**
   * Default headers for all requests
   */
  headers?: Record<string, string>;

  /**
   * Auth token header name
   */
  authTokenHeader?: string;

  /**
   * Current auth token
   */
  authToken?: string;

  /**
   * Whether to automatically retry on auth failure
   */
  autoRetryAuth?: boolean;

  /**
   * Default timeout
   */
  timeout?: number;
}

/**
 * Default API client configuration
 */
const DEFAULT_OPTIONS: ApiClientOptions = {
  baseUrl: '/api',
  apiVersion: 'v1',
  headers: {},
  authTokenHeader: 'Authorization',
  autoRetryAuth: true,
  timeout: 30000,
};

/**
 * HTTP request options interface for compatibility
 */
export interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, unknown>;
  timeout?: number;
  signal?: AbortSignal;
  [key: string]: any;
}

/**
 * HTTP response interface for compatibility
 */
export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  response: Response;
}

/**
 * HTTP error class for compatibility
 */
export class HttpError extends Error {
  public override name: string;
  public override message: string;
  public override stack?: string;
  public status: number;
  public statusText: string;
  public data: any;
  public response?: Response;

  constructor(messag: string, status: number, statusText: string, data?: any, response?: Response) {
    super(message);
    this.name = 'HttpError'; // Property added
    this.message = message; // Property added
    this.status = status; // Property added
    this.statusText = statusText; // Property added
    this.data = data; // Property added
    this.response = response; // Property added

    // Required for TypeScript when extending Error
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

/**
 * API client for making API requests
 *
 * @deprecated This class is being maintained for backward compatibility.
 * New code should use APIClient from '../api/api-client' directly.
 */
export class ApiClient implements Component {
  private static instance: ApiClient;
  private apiClient: APIClient;
  private config: ApiClientOptions;
  private logger = Logger.getLogger('ApiClient');
  private endpoints: Map<string, ApiEndpointOptions> = new Map();
  private initialized = false;

  /**
   * Get singleton instance
   */
  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Private constructor
   */
  private constructor() {
    // Initialize with default error handler
    this.apiClient = new APIClient(
      // Basic error handler
      {
        processApiError: error => {
          this.logger.error('API Error', error);
        },
        processTimeoutError: error => {
          this.logger.error('Timeout Error', error);
        },
        processNetworkError: error => {
          this.logger.error('Network Error', error);
        },
      },
      null, // Config will be set in initialize()
    );
    this.config = { ...DEFAULT_OPTIONS };
  }

  /**
   * Initialize the API client
   * @param options Options for the API client
   */
  public initialize(option: ApiClientOptions = {}): void {
    if (this.initialized) {
      this.logger.warn('ApiClient already initialized');
      return;
    }

    // Get config values
    const configManager = ConfigManager.getInstance();
    const configBaseUrl = configManager.get<string>('apiUrl');
    const configTimeout = configManager.get<number>('apiTimeout');
    const configApiVersion = configManager.get<string>('apiVersion');

    // Merge options
    this.config = {
      ...DEFAULT_OPTIONS,
      ...(configBaseUrl ? { baseUrl: configBaseUrl } : {}),
      ...(configTimeout ? { timeout: configTimeout } : {}),
      ...(configApiVersion ? { apiVersion: configApiVersion } : {}),
      ...options,
    };

    // Configure APIClient
    this.apiClient.setBaseUrl(this.config.baseUrl || '/api');
    this.apiClient.setApiVersion(this.config.apiVersion || 'v1');
    this.apiClient.setUseApiVersionPrefix(true);

    // Set auth token if provided
    if (this.config.authToken) {
      this.setAuthToken(this.config.authToken);
    }

    this.initialized = true; // Property added
    this.logger.info('API client initialized');
  }

  /**
   * Get the base URL with version
   */
  private getBaseUrlWithVersion(): string {
    const baseUrl = this.config.baseUrl || '';
    const apiVersion = this.config.apiVersion;

    if (!apiVersion) {
      return baseUrl;
    }

    // Format: baseUrl/apiVersion
    return `${baseUrl.replace(/\/$/, '')}/${apiVersion}`;
  }

  /**
   * Register an endpoint
   * @param name Endpoint name
   * @param options Endpoint options
   */
  public registerEndpoint(nam: string, options: ApiEndpointOptions): void {
    if (this.endpoints.has(name)) {
      this.logger.warn(`Endpoint ${name} already registered. Overwriting.`);
    }

    this.endpoints.set(name, {
      method: 'GET',
      requiresAuth: true,
      ...options,
    });

    this.logger.debug(`Registered endpoint ${name}: ${options.method || 'GET'} ${options.path}`);
  }

  /**
   * Register multiple endpoints
   * @param endpoints Map of endpoint names to options
   */
  public registerEndpoints(endpoint: Record<string, ApiEndpointOptions>): void {
    for (const [name, options] of Object.entries(endpoints)) {
      this.registerEndpoint(name, options);
    }
  }

  /**
   * Get endpoint details
   * @param name Endpoint name
   * @returns Endpoint options
   */
  public getEndpoint(nam: string): ApiEndpointOptions | undefined {
    return this.endpoints.get(name);
  }

  /**
   * Set authentication token
   * @param token Authentication token
   */
  public setAuthToken(toke: string): void {
    this.config.authToken = token;
    this.logger.debug('Set authentication token');
    // Authentication token management is handled by APIClient internally
  }

  /**
   * Clear authentication token
   */
  public clearAuthToken(): void {
    this.config.authToken = undefined;
    this.logger.debug('Cleared authentication token');
    // Note: APIClient uses localStorage for tokens, so we can't directly clear it
  }

  /**
   * Call an API endpoint by name
   * @param name Endpoint name
   * @param params URL path parameters
   * @param data Request body
   * @param options Additional request options
   * @returns Response promise
   */
  public async callEndpoint<T = any>(
    name: string,
    params: Record<string, string> = {},
    data?: any,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    const endpoint = this.endpoints.get(name);

    if (!endpoint) {
      throw new Error(`Endpoint ${name} is not registered`);
    }

    if (endpoint.requiresAuth && !this.config.authToken) {
      throw new Error(`Endpoint ${name} requires authentication`);
    }

    // Replace path parameters
    let path = endpoint.path;
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}`, encodeURIComponent(value));
    }

    // Merge options
    const requestOptions: HttpRequestOptions = {
      method: endpoint.method,
      headers: endpoint.headers,
      timeout: endpoint.timeout,
      ...options,
    };

    try {
      // Make the request
      return await this.request<T>(path, data, requestOptions);
    } catch (error) {
      // Handle auth errors if auto retry is enabled
      if (
        error instanceof Error &&
        'status' in error &&
        error.status === 401 &&
        this.config.autoRetryAuth &&
        endpoint.requiresAuth
      ) {
        // Try to refresh auth token
        await this.refreshAuth();

        // Retry the request
        return await this.request<T>(path, data, requestOptions);
      }

      throw error;
    }
  }

  /**
   * Refresh authentication token
   * This should be implemented by the application
   */
  private async refreshAuth(): Promise<void> {
    this.logger.debug('Attempting to refresh authentication');

    // This is a placeholder - implement your auth refresh logic
    const authManager = DependencyContainer.getInstance().get('authManager');

    if (authManager && typeof authManager.refreshToken === 'function') {
      const newToken = await authManager.refreshToken();
      if (newToken) {
        this.setAuthToken(newToken);
      }
    } else {
      throw new Error('Auth refresh not implemented');
    }
  }

  /**
   * Make a direct API request
   * @param path URL path
   * @param data Request body
   * @param options Request options
   * @returns Response promise
   */
  public async request<T = any>(
    path: string,
    data?: any,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    const method = options.method || 'GET';

    this.logger.debug(`${method} ${path}`);

    try {
      // Convert HttpRequestOptions to APIClient options format
      const apiClientOptions = {
        headers: options.headers,
        timeout: options.timeout,
      };

      // Use APIClient's makeRequest method
      const responseData = await this.apiClient.makeRequest(
        method,
        path,
        method === 'GET' || method === 'DELETE' ? null : data, // Only send body for appropriate methods
        apiClientOptions,
      );

      // Convert the response to match HttpResponse format for backward compatibility
      const httpResponse: HttpResponse<T> = {
        data: responseData as T,
        status: 200, // Assuming success since makeRequest would throw on error
        statusText: 'OK',
        headers: new Headers(),
        response: new Response(), // Placeholder
      };

      return httpResponse;
    } catch (error) {
      this.logger.error(`API request failed: ${method} ${path}`, error);
      throw error;
    }
  }

  /**
   * Make a GET request
   * @param path URL path
   * @param params Query parameters
   * @param options Request options
   * @returns Response promise
   */
  public get<T = any>(
    path: string,
    params?: Record<string, unknown>,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    // For GET requests, append query parameters to the path
    let fullPath = path;
    if (params && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }
      fullPath = `${path}?${queryParams.toString()}`;
    }

    return this.request<T>(fullPath, null, { ...options, method: 'GET' });
  }

  /**
   * Make a POST request
   * @param path URL path
   * @param data Request body
   * @param options Request options
   * @returns Response promise
   */
  public post<T = any>(
    path: string,
    data?: any,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>(path, data, { ...options, method: 'POST' });
  }

  /**
   * Make a PUT request
   * @param path URL path
   * @param data Request body
   * @param options Request options
   * @returns Response promise
   */
  public put<T = any>(
    path: string,
    data?: any,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>(path, data, { ...options, method: 'PUT' });
  }

  /**
   * Make a DELETE request
   * @param path URL path
   * @param params Query parameters
   * @param options Request options
   * @returns Response promise
   */
  public delete<T = any>(
    path: string,
    params?: Record<string, unknown>,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    // For DELETE requests, append query parameters to the path
    let fullPath = path;
    if (params && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }
      fullPath = `${path}?${queryParams.toString()}`;
    }

    return this.request<T>(fullPath, null, { ...options, method: 'DELETE' });
  }

  /**
   * Make a PATCH request
   * @param path URL path
   * @param data Request body
   * @param options Request options
   * @returns Response promise
   */
  public patch<T = any>(
    path: string,
    data?: any,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>(path, data, { ...options, method: 'PATCH' });
  }

  /**
   * Make a HEAD request
   * @param path URL path
   * @param options Request options
   * @returns Response promise
   */
  public head<T = any>(path: string, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(path, null, { ...options, method: 'HEAD' });
  }

  /**
   * Make an OPTIONS request
   * @param path URL path
   * @param options Request options
   * @returns Response promise
   */
  public optionsRequest<T = any>(
    path: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>(path, null, { ...options, method: 'OPTIONS' });
  }
}

export class APIError extends Error {
  public status: number;
  public statusText: string;
  public data: any;
  public requestInfo?: RequestInfo;
  public response?: Response;

  constructor(
    message: string,
    status: number,
    statusText: string,
    responseData?: any,
    requestInfo?: RequestInfo,
    response?: Response,
  ) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.statusText = statusText;
    this.data = responseData;
    this.requestInfo = requestInfo;
    this.response = response;

    // Maintain proper stack trace (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }
}
