/**
 * API Client
 * 
 * Handles communication with backend APIs
 */

import { logger } from '../utils/logger';
import { Service } from '../core/ServiceManager';
import { EventBus } from '../core/EventBus';

/**
 * HTTP methods
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

/**
 * API request options
 */
export interface ApiRequestOptions {
  /**
   * URL for the request
   */
  url: string;

  /**
   * HTTP method
   */
  method: HttpMethod;

  /**
   * Request headers
   */
  headers?: Record<string, string>;

  /**
   * Query parameters
   */
  params?: Record<string, string | number | boolean | null | undefined>;

  /**
   * Request body
   */
  data?: unknown;

  /**
   * Whether to include credentials (cookies)
   */
  withCredentials?: boolean;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Response type
   */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';

  /**
   * Number of retry attempts
   */
  retries?: number;

  /**
   * Delay between retries in milliseconds
   */
  retryDelay?: number;

  /**
   * Skip global request interceptors
   */
  skipInterceptors?: boolean;

  /**
   * Cache control options
   */
  cache?: RequestCache;

  /**
   * Abort controller signal
   */
  signal?: AbortSignal;
}

/**
 * API response
 */
export interface ApiResponse<T = unknown> {
  /**
   * Response status code
   */
  status: number;

  /**
   * Status text
   */
  statusText: string;

  /**
   * Response headers
   */
  headers: Record<string, string>;

  /**
   * Response data
   */
  data: T;

  /**
   * Original request options
   */
  request: ApiRequestOptions;

  /**
   * Whether the request was successful
   */
  ok: boolean;
}

/**
 * API error
 */
export class ApiError extends Error {
  /**
   * Response status code
   */
  public status: number;

  /**
   * Status text
   */
  public statusText: string;

  /**
   * Response data
   */
  public data: unknown;

  /**
   * Original request options
   */
  public request: ApiRequestOptions;

  /**
   * Error code if available
   */
  public code?: string;

  constructor(message: string, response: ApiResponse) {
    super(message);
    this.name = 'ApiError';
    this.status = response.status;
    this.statusText = response.statusText;
    this.data = response.data;
    this.request = response.request;

    // Extract error code if available in the response data
    if (
      typeof this.data === 'object' &&
      this.data !== null &&
      'code' in this.data &&
      typeof (this.data as Record<string, unknown>).code === 'string'
    ) {
      this.code = (this.data as Record<string, unknown>).code as string;
    }
  }
}

/**
 * Request interceptor function
 */
export type RequestInterceptor = (
  options: ApiRequestOptions,
) => Promise<ApiRequestOptions> | ApiRequestOptions;

/**
 * Response interceptor function
 */
export type ResponseInterceptor = (
  response: ApiResponse,
) => Promise<ApiResponse> | ApiResponse;

/**
 * Error interceptor function
 */
export type ErrorInterceptor = (
  error: ApiError,
) => Promise<ApiResponse | ApiError> | ApiResponse | ApiError;

/**
 * API client for making HTTP requests
 */
export class ApiClient implements Service {
  private baseUrl: string;
  private defaultOptions: Partial<ApiRequestOptions>;
  private requestInterceptors: RequestInterceptor[];
  private responseInterceptors: ResponseInterceptor[];
  private errorInterceptors: ErrorInterceptor[];
  private eventBus: EventBus;

  /**
   * Constructor
   * @param baseUrl Base URL for all requests
   * @param defaultOptions Default request options
   */
  constructor(baseUrl: string = '', defaultOptions: Partial<ApiRequestOptions> = {}) {
    this.baseUrl = baseUrl;
    this.defaultOptions = {
      method: HttpMethod.GET,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      responseType: 'json',
      retries: 0,
      retryDelay: 1000,
      ...defaultOptions,
    };
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Initialize the API client
   */
  public async init(): Promise<void> {
    logger.debug('ApiClient initialized');
    this.eventBus.emit('api:initialized', { baseUrl: this.baseUrl });
  }

  /**
   * Set base URL
   */
  public setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  /**
   * Set default request options
   */
  public setDefaultOptions(options: Partial<ApiRequestOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * Add a request interceptor
   * @returns Function to remove the interceptor
   */
  public addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Add a response interceptor
   * @returns Function to remove the interceptor
   */
  public addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Add an error interceptor
   * @returns Function to remove the interceptor
   */
  public addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.errorInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Make an API request
   */
  public async request<T = unknown>(
    options: Partial<ApiRequestOptions>,
  ): Promise<ApiResponse<T>> {
    let requestOptions = this.prepareRequestOptions(options);
    
    // Apply request interceptors
    if (!requestOptions.skipInterceptors) {
      requestOptions = await this.applyRequestInterceptors(requestOptions);
    }

    // Emit request event
    this.eventBus.emit('api:request', { options: requestOptions });

    let response: ApiResponse<T>;
    let retries = requestOptions.retries || 0;

    while (true) {
      try {
        response = await this.executeRequest<T>(requestOptions);
        break;
      } catch (error) {
        if (retries > 0 && this.shouldRetry(error as ApiError)) {
          retries--;
          await this.delay(requestOptions.retryDelay || 1000);
          logger.debug(`Retrying request to ${requestOptions.url}, ${retries} attempts left`);
          continue;
        }
        throw error;
      }
    }

    // Apply response interceptors
    if (!requestOptions.skipInterceptors) {
      response = await this.applyResponseInterceptors(response);
    }

    // Emit response event
    this.eventBus.emit('api:response', { response });

    return response;
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest<T = unknown>(
    options: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    const { url, method, headers, data, params, withCredentials, timeout, 
            responseType, signal, cache } = options;
    
    // Prepare URL with query parameters
    const fullUrl = this.buildUrl(url, params);

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method,
      headers,
      credentials: withCredentials ? 'include' : 'same-origin',
      signal,
      cache,
    };

    // Add request body for non-GET requests
    if (method !== HttpMethod.GET && data !== undefined) {
      fetchOptions.body = headers?.['Content-Type']?.includes('application/json')
        ? JSON.stringify(data)
        : data as BodyInit;
    }

    // Create timeout promise if needed
    let timeoutId: number | undefined;
    const fetchPromise = fetch(fullUrl, fetchOptions);
    const timeoutPromise = timeout
      ? new Promise<Response>((_, reject) => {
          timeoutId = window.setTimeout(() => {
            reject(new Error(`Request timeout after ${timeout}ms`));
          }, timeout);
        })
      : null;

    try {
      // Use Promise.race to implement timeout
      let fetchResponse;
      if (timeoutPromise) {
        fetchResponse = await Promise.race([fetchPromise, timeoutPromise]);
      } else {
        fetchResponse = await fetchPromise;
      }
      
      // Parse response
      let responseData: T;
      
      // Get response headers
      const responseHeaders: Record<string, string> = {};
      fetchResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Parse response body based on responseType
      let text;
      switch (responseType) {
        case 'json':
          // Handle empty responses
          text = await fetchResponse.text();
          responseData = text ? JSON.parse(text) as T : {} as T;
          break;
        case 'text':
          responseData = await fetchResponse.text() as unknown as T;
          break;
        case 'blob':
          responseData = await fetchResponse.blob() as unknown as T;
          break;
        case 'arraybuffer':
          responseData = await fetchResponse.arrayBuffer() as unknown as T;
          break;
        default:
          // Default to JSON
          responseData = await fetchResponse.json() as T;
      }

      const response: ApiResponse<T> = {
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
        headers: responseHeaders,
        data: responseData,
        request: options,
        ok: fetchResponse.ok,
      };

      // Handle non-success status codes
      if (!fetchResponse.ok) {
        const error = new ApiError(
          `Request failed with status code ${fetchResponse.status}`,
          response,
        );
        
        // Apply error interceptors
        if (!options.skipInterceptors) {
          const result = await this.applyErrorInterceptors(error);
          
          // If the interceptor returned a valid response, use it
          if ('data' in result && 'status' in result && !('name' in result)) {
            return result as ApiResponse<T>;
          }
          
          // Otherwise, rethrow the error
          if (result instanceof ApiError) {
            throw result;
          }
        }
        
        throw error;
      }

      return response;
    } catch (error) {
      // Emit error event
      this.eventBus.emit('api:error', { error, request: options });
      
      // Process API errors
      if (error instanceof ApiError) {
        // Apply error interceptors
        if (!options.skipInterceptors) {
          const result = await this.applyErrorInterceptors(error);
          
          // If the interceptor returned a valid response, use it
          if ('data' in result && 'status' in result && !('name' in result)) {
            return result as ApiResponse<T>;
          }
          
          // Otherwise, rethrow the error
          if (result instanceof ApiError) {
            throw result;
          }
        }
        
        throw error;
      } else {
        // Convert other errors to ApiError
        const apiError = new ApiError(
          error instanceof Error ? error.message : String(error),
          {
            status: 0,
            statusText: 'Network Error',
            headers: {},
            data: {},
            request: options,
            ok: false,
          },
        );
        
        // Apply error interceptors
        if (!options.skipInterceptors) {
          const result = await this.applyErrorInterceptors(apiError);
          
          // If the interceptor returned a valid response, use it
          if ('data' in result && 'status' in result && !('name' in result)) {
            return result as ApiResponse<T>;
          }
          
          // Otherwise, rethrow the error
          if (result instanceof ApiError) {
            throw result;
          }
        }
        
        throw apiError;
      }
    } finally {
      // Clear timeout if it was set
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Apply request interceptors
   */
  private async applyRequestInterceptors(
    options: ApiRequestOptions,
  ): Promise<ApiRequestOptions> {
    let modifiedOptions = { ...options };

    for (const interceptor of this.requestInterceptors) {
      try {
        modifiedOptions = await interceptor(modifiedOptions);
      } catch (error) {
        logger.error('Error in request interceptor:', error);
      }
    }

    return modifiedOptions;
  }

  /**
   * Apply response interceptors
   */
  private async applyResponseInterceptors<T = unknown>(
    response: ApiResponse<T>,
  ): Promise<ApiResponse<T>> {
    let modifiedResponse = { ...response };

    for (const interceptor of this.responseInterceptors) {
      try {
        modifiedResponse = await interceptor(modifiedResponse) as ApiResponse<T>;
      } catch (error) {
        logger.error('Error in response interceptor:', error);
      }
    }

    return modifiedResponse;
  }

  /**
   * Apply error interceptors
   */
  private async applyErrorInterceptors(
    error: ApiError,
  ): Promise<ApiResponse | ApiError> {
    let result: ApiResponse | ApiError = error;

    for (const interceptor of this.errorInterceptors) {
      try {
        result = await interceptor(result instanceof ApiError ? result : new ApiError(
          result.status ? `Request failed with status code ${result.status}` : 'Request failed',
          result as ApiResponse,
        ));
      } catch (interceptorError) {
        logger.error('Error in error interceptor:', interceptorError);
      }
    }

    return result;
  }

  /**
   * Prepare request options by merging with defaults
   */
  private prepareRequestOptions(options: Partial<ApiRequestOptions>): ApiRequestOptions {
    return {
      ...this.defaultOptions,
      ...options,
      headers: {
        ...this.defaultOptions.headers,
        ...options.headers,
      },
    } as ApiRequestOptions;
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(
    url: string,
    params?: Record<string, string | number | boolean | null | undefined>,
  ): string {
    // Combine base URL and endpoint URL
    const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const endpointUrl = url.startsWith('/') ? url : `/${url}`;
    let fullUrl = `${baseUrl}${endpointUrl}`;

    // Add query parameters if provided
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += fullUrl.includes('?') ? `&${queryString}` : `?${queryString}`;
      }
    }

    return fullUrl;
  }

  /**
   * Determine if a request should be retried
   */
  private shouldRetry(error: ApiError): boolean {
    // Retry on network errors and 5xx errors
    if (error.status === 0 || (error.status >= 500 && error.status < 600)) {
      return true;
    }
    
    // Don't retry on client errors (4xx)
    return false;
  }

  /**
   * Delay for a specified time
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make a GET request
   */
  public async get<T = unknown>(
    url: string,
    params?: Record<string, string | number | boolean | null | undefined>,
    options?: Partial<ApiRequestOptions>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: HttpMethod.GET,
      url,
      params,
      ...options,
    });
  }

  /**
   * Make a POST request
   */
  public async post<T = unknown>(
    url: string,
    data?: unknown,
    options?: Partial<ApiRequestOptions>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: HttpMethod.POST,
      url,
      data,
      ...options,
    });
  }

  /**
   * Make a PUT request
   */
  public async put<T = unknown>(
    url: string,
    data?: unknown,
    options?: Partial<ApiRequestOptions>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: HttpMethod.PUT,
      url,
      data,
      ...options,
    });
  }

  /**
   * Make a PATCH request
   */
  public async patch<T = unknown>(
    url: string,
    data?: unknown,
    options?: Partial<ApiRequestOptions>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: HttpMethod.PATCH,
      url,
      data,
      ...options,
    });
  }

  /**
   * Make a DELETE request
   */
  public async delete<T = unknown>(
    url: string,
    options?: Partial<ApiRequestOptions>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: HttpMethod.DELETE,
      url,
      ...options,
    });
  }
} 