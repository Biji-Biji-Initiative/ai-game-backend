import { Component } from '../types/component-base';
import { HttpClient, HttpError, HttpRequestOptions, HttpResponse } from './HttpClient';
import { ConfigManager } from './ConfigManager';
import { Logger } from './Logger';
import { DependencyContainer } from './DependencyContainer';

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
 * API client for making API requests
 */
export class ApiClient implements Component {
  private static instance: ApiClient;
  private httpClient: HttpClient;
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
    this.httpClient = HttpClient.getInstance();
    this.config = { ...DEFAULT_OPTIONS };
  }
  
  /**
   * Initialize the API client
   * @param options Options for the API client
   */
  public initialize(options: ApiClientOptions = {}): void {
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
    
    // Initialize HTTP client
    this.httpClient.initialize({
      baseUrl: this.getBaseUrlWithVersion(),
      timeout: this.config.timeout,
      headers: this.config.headers,
    });
    
    // Add auth interceptor if needed
    if (this.config.authToken) {
      this.setAuthToken(this.config.authToken);
    }
    
    this.initialized = true;
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
  public registerEndpoint(name: string, options: ApiEndpointOptions): void {
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
  public registerEndpoints(endpoints: Record<string, ApiEndpointOptions>): void {
    for (const [name, options] of Object.entries(endpoints)) {
      this.registerEndpoint(name, options);
    }
  }
  
  /**
   * Get endpoint details
   * @param name Endpoint name
   * @returns Endpoint options
   */
  public getEndpoint(name: string): ApiEndpointOptions | undefined {
    return this.endpoints.get(name);
  }
  
  /**
   * Set authentication token
   * @param token Authentication token
   */
  public setAuthToken(token: string): void {
    this.config.authToken = token;
    
    // Add auth interceptor
    this.httpClient.addRequestInterceptor({
      intercept: (url, options) => {
        // Only add auth header if not already present
        if (options.headers && this.config.authTokenHeader && !options.headers[this.config.authTokenHeader]) {
          return {
            url,
            options: {
              ...options,
              headers: {
                ...options.headers,
                [this.config.authTokenHeader]: `Bearer ${this.config.authToken}`,
              },
            },
          };
        }
        return { url, options };
      },
    });
    
    this.logger.debug('Set authentication token');
  }
  
  /**
   * Clear authentication token
   */
  public clearAuthToken(): void {
    this.config.authToken = undefined;
    // We can't remove individual interceptors, so we clear all and re-add any others if needed
    this.httpClient.clearInterceptors();
    this.logger.debug('Cleared authentication token');
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
    options: HttpRequestOptions = {}
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
        error instanceof HttpError &&
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
    options: HttpRequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const method = options.method || 'GET';
    
    this.logger.debug(`${method} ${path}`);
    
    try {
      let response: HttpResponse<T>;
      
      // Call appropriate method based on HTTP method
      switch (method) {
        case 'GET':
          response = await this.httpClient.get<T>(path, {
            ...options,
            params: data, // For GET, data is passed as query params
          });
          break;
          
        case 'POST':
          response = await this.httpClient.post<T>(path, data, options);
          break;
          
        case 'PUT':
          response = await this.httpClient.put<T>(path, data, options);
          break;
          
        case 'DELETE':
          response = await this.httpClient.delete<T>(path, {
            ...options,
            params: data, // For DELETE, typically pass data as query params
          });
          break;
          
        case 'PATCH':
          response = await this.httpClient.patch<T>(path, data, options);
          break;
          
        case 'HEAD':
          response = await this.httpClient.head<T>(path, options);
          break;
          
        case 'OPTIONS':
          response = await this.httpClient.optionsRequest<T>(path, options);
          break;
          
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
      
      return response;
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
    params?: Record<string, any>,
    options: HttpRequestOptions = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>(path, params, { ...options, method: 'GET' });
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
    options: HttpRequestOptions = {}
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
    options: HttpRequestOptions = {}
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
    params?: Record<string, any>,
    options: HttpRequestOptions = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>(path, params, { ...options, method: 'DELETE' });
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
    options: HttpRequestOptions = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>(path, data, { ...options, method: 'PATCH' });
  }
} 