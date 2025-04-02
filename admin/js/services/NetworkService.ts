/**
 * Network Service
 * Provides an abstraction layer for making network requests
 */

import { logger } from '../utils/logger';

/**
 * Request options for network requests
 */
export interface NetworkRequestOptions {
  /** Request headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to include credentials */
  withCredentials?: boolean;
  /** Response type */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  /** Request body transformer */
  transformRequest?: (data: unknown) => unknown;
  /** Response transformer */
  transformResponse?: (data: unknown) => unknown;
  /** Request interceptor */
  requestInterceptor?: (config: NetworkRequestOptions) => NetworkRequestOptions;
  /** Response interceptor */
  responseInterceptor?: (response: NetworkResponse) => NetworkResponse;
  /** Error interceptor */
  errorInterceptor?: (error: Error) => Error | Promise<NetworkResponse>;
}

/**
 * Network response interface
 */
export interface NetworkResponse<T = unknown> {
  /** Response data */
  data: T;
  /** Response status */
  status: number;
  /** Response status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Original request configuration */
  config: NetworkRequestOptions;
  /** Original request */
  request?: any;
}

/**
 * NetworkService interface
 */
export interface NetworkService {
  /**
   * Make a GET request
   * @param url Request URL
   * @param options Request options
   */
  get<T = unknown>(url: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>>;

  /**
   * Make a POST request
   * @param url Request URL
   * @param data Request data
   * @param options Request options
   */
  post<T = unknown>(
    url: string,
    data?: unknown,
    options?: NetworkRequestOptions
  ): Promise<NetworkResponse<T>>;

  /**
   * Make a PUT request
   * @param url Request URL
   * @param data Request data
   * @param options Request options
   */
  put<T = unknown>(
    url: string,
    data?: unknown,
    options?: NetworkRequestOptions
  ): Promise<NetworkResponse<T>>;

  /**
   * Make a DELETE request
   * @param url Request URL
   * @param options Request options
   */
  delete<T = unknown>(url: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>>;

  /**
   * Make a PATCH request
   * @param url Request URL
   * @param data Request data
   * @param options Request options
   */
  patch<T = unknown>(
    url: string,
    data?: unknown,
    options?: NetworkRequestOptions
  ): Promise<NetworkResponse<T>>;

  /**
   * Make a custom request
   * @param method HTTP method
   * @param url Request URL
   * @param data Request data
   * @param options Request options
   */
  request<T = unknown>(
    method: string,
    url: string,
    data?: unknown,
    options?: NetworkRequestOptions
  ): Promise<NetworkResponse<T>>;

  /**
   * Set default request options
   * @param options Request options
   */
  setDefaultOptions(options: NetworkRequestOptions): void;

  /**
   * Set base URL for all requests
   * @param baseUrl Base URL
   */
  setBaseUrl(baseUrl: string): void;

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void;
}

/**
 * Fetch implementation of NetworkService
 */
export class FetchNetworkService implements NetworkService {
  private defaultOptions: NetworkRequestOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    timeout: 30000,
    responseType: 'json',
  };
  private baseUrl = '';
  private abortControllers: AbortController[] = [];

  /**
   * Constructor
   * @param options Default options
   */
  constructor(options?: NetworkRequestOptions) {
    if (options) {
      this.defaultOptions = {
        ...this.defaultOptions,
        ...options,
      };
    }
  }

  /**
   * Make a GET request
   * @param url Request URL
   * @param options Request options
   */
  public async get<T = unknown>(
    url: string,
    options?: NetworkRequestOptions
  ): Promise<NetworkResponse<T>> {
    return this.request<T>('GET', url, undefined, options);
  }

  /**
   * Make a POST request
   * @param url Request URL
   * @param data Request data
   * @param options Request options
   */
  public async post<T = unknown>(
    url: string,
    data?: unknown,
    options?: NetworkRequestOptions
  ): Promise<NetworkResponse<T>> {
    return this.request<T>('POST', url, data, options);
  }

  /**
   * Make a PUT request
   * @param url Request URL
   * @param data Request data
   * @param options Request options
   */
  public async put<T = unknown>(
    url: string,
    data?: unknown,
    options?: NetworkRequestOptions
  ): Promise<NetworkResponse<T>> {
    return this.request<T>('PUT', url, data, options);
  }

  /**
   * Make a DELETE request
   * @param url Request URL
   * @param options Request options
   */
  public async delete<T = unknown>(
    url: string,
    options?: NetworkRequestOptions
  ): Promise<NetworkResponse<T>> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  /**
   * Make a PATCH request
   * @param url Request URL
   * @param data Request data
   * @param options Request options
   */
  public async patch<T = unknown>(
    url: string,
    data?: unknown,
    options?: NetworkRequestOptions
  ): Promise<NetworkResponse<T>> {
    return this.request<T>('PATCH', url, data, options);
  }

  /**
   * Make a custom request
   * @param method HTTP method
   * @param url Request URL
   * @param data Request data
   * @param options Request options
   */
  public async request<T = unknown>(
    method: string,
    url: string,
    data?: unknown,
    options?: NetworkRequestOptions
  ): Promise<NetworkResponse<T>> {
    try {
      // Merge options
      const requestOptions: NetworkRequestOptions = {
        ...this.defaultOptions,
        ...options,
      };

      // Apply request interceptor if provided
      if (requestOptions.requestInterceptor) {
        const interceptedOptions = requestOptions.requestInterceptor(requestOptions);
        Object.assign(requestOptions, interceptedOptions);
      }

      // Create full URL
      const fullUrl = this.createFullUrl(url);

      // Create headers
      const headers = new Headers(requestOptions.headers);

      // Create abort controller for timeout
      const abortController = new AbortController();
      this.abortControllers.push(abortController);

      // Set up timeout if provided
      let timeoutId: number | null = null;
      if (requestOptions.timeout) {
        timeoutId = window.setTimeout(() => {
          abortController.abort();
          const index = this.abortControllers.indexOf(abortController);
          if (index !== -1) {
            this.abortControllers.splice(index, 1);
          }
        }, requestOptions.timeout);
      }

      // Transform request data if transformer provided
      let transformedData = data;
      if (data && requestOptions.transformRequest) {
        transformedData = requestOptions.transformRequest(data);
      }

      // Create request
      const fetchOptions: RequestInit = {
        method,
        headers,
        credentials: requestOptions.withCredentials ? 'include' : 'same-origin',
        signal: abortController.signal,
      };

      // Add body for non-GET requests
      if (method !== 'GET' && method !== 'HEAD' && transformedData !== undefined) {
        fetchOptions.body = JSON.stringify(transformedData);
      }

      // Make request
      const response = await fetch(fullUrl, fetchOptions);

      // Clear timeout
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      // Remove abort controller
      const controllerIndex = this.abortControllers.indexOf(abortController);
      if (controllerIndex !== -1) {
        this.abortControllers.splice(controllerIndex, 1);
      }

      // Parse response based on response type
      let responseData: T;
      switch (requestOptions.responseType) {
        case 'text':
          responseData = await response.text() as unknown as T;
          break;
        case 'blob':
          responseData = await response.blob() as unknown as T;
          break;
        case 'arraybuffer':
          responseData = await response.arrayBuffer() as unknown as T;
          break;
        case 'json':
        default:
          try {
            responseData = await response.json() as T;
          } catch (error) {
            // If response is not JSON, return empty object
            responseData = {} as T;
          }
          break;
      }

      // Transform response if transformer provided
      if (requestOptions.transformResponse) {
        responseData = requestOptions.transformResponse(responseData) as T;
      }

      // Create response object
      const networkResponse: NetworkResponse<T> = {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: this.parseHeaders(response.headers),
        config: requestOptions,
        request: response,
      };

      // Apply response interceptor if provided
      if (requestOptions.responseInterceptor) {
        return requestOptions.responseInterceptor(networkResponse) as NetworkResponse<T>;
      }

      return networkResponse;
    } catch (error) {
      logger.error('Network request failed:', error);

      // Apply error interceptor if provided
      if (options?.errorInterceptor) {
        try {
          const interceptedError = await options.errorInterceptor(error as Error);
          if ('data' in interceptedError) {
            // If interceptor returns a response, use it
            return interceptedError as unknown as NetworkResponse<T>;
          }
          // Otherwise, re-throw the error
          throw interceptedError;
        } catch (interceptedError) {
          throw interceptedError;
        }
      }

      throw error;
    }
  }

  /**
   * Set default request options
   * @param options Request options
   */
  public setDefaultOptions(options: NetworkRequestOptions): void {
    this.defaultOptions = {
      ...this.defaultOptions,
      ...options,
    };
  }

  /**
   * Set base URL for all requests
   * @param baseUrl Base URL
   */
  public setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  /**
   * Cancel all pending requests
   */
  public cancelAllRequests(): void {
    this.abortControllers.forEach(controller => {
      try {
        controller.abort();
      } catch (error) {
        logger.error('Failed to abort request:', error);
      }
    });
    this.abortControllers = [];
  }

  /**
   * Create full URL from relative URL
   * @param url Relative URL
   * @returns Full URL
   */
  private createFullUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    let baseUrl = this.baseUrl;
    if (baseUrl.endsWith('/') && url.startsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    return `${baseUrl}${url}`;
  }

  /**
   * Parse headers from fetch response
   * @param headers Response headers
   * @returns Parsed headers
   */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
} 