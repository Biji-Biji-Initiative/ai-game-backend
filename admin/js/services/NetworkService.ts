/**
 * Network Service
 * Provides an abstraction layer for making network requests
 */

import { ComponentLogger } from '../core/Logger';
import { OpenApiService } from './OpenApiService';

/**
 * Network request options
 */
export interface NetworkRequestOptions {
  /** Request headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to include credentials */
  withCredentials?: boolean;
  /** Whether to validate with OpenAPI */
  validateWithOpenApi?: boolean;
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
  [key: string]: unknown;
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
  requestOptions?: NetworkRequestOptions;
  /** Original request URL */
  requestUrl?: string;
  /** Original request method */
  requestMethod?: string;
  /** Original request data */
  requestData?: unknown;
  /** Validation result */
  validationResult?: {
    valid: boolean;
    errors?: unknown[];
  };
}

/**
 * NetworkService interface
 */
export interface NetworkService {
  /**
   * Set base URL for requests
   * @param url Base URL
   */
  setBaseUrl(url: string): void;

  /**
   * Get the base URL
   * @returns Base URL
   */
  getBaseUrl(): string;

  /**
   * Set a default header for all requests
   * @param name Header name
   * @param value Header value
   */
  setDefaultHeader(name: string, value: string): void;

  /**
   * Set default headers for all requests
   * @param headers Headers to set
   */
  setDefaultHeaders(headers: Record<string, string>): void;

  /**
   * Set the OpenAPI service for request validation
   * @param service OpenApiService instance
   */
  setOpenApiService(service: OpenApiService): void;

  /**
   * Make a GET request
   * @param url Request URL
   * @param options Request options
   * @returns Response promise
   */
  get<T = unknown>(url: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>>;

  /**
   * Make a POST request
   * @param url Request URL
   * @param data Request data
   * @param options Request options
   * @returns Response promise
   */
  post<T = unknown>(
    url: string,
    data?: unknown,
    options?: NetworkRequestOptions,
  ): Promise<NetworkResponse<T>>;

  /**
   * Make a PUT request
   * @param url Request URL
   * @param data Request data
   * @param options Request options
   * @returns Response promise
   */
  put<T = unknown>(
    url: string,
    data?: unknown,
    options?: NetworkRequestOptions,
  ): Promise<NetworkResponse<T>>;

  /**
   * Make a DELETE request
   * @param url Request URL
   * @param options Request options
   * @returns Response promise
   */
  delete<T = unknown>(url: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>>;

  /**
   * Make a PATCH request
   * @param url Request URL
   * @param data Request data
   * @param options Request options
   * @returns Response promise
   */
  patch<T = unknown>(
    url: string,
    data?: unknown,
    options?: NetworkRequestOptions,
  ): Promise<NetworkResponse<T>>;

  /**
   * Make a HEAD request
   * @param url Request URL
   * @param options Request options
   * @returns Response promise
   */
  head<T = unknown>(url: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>>;

  /**
   * Add a request interceptor
   * @param interceptor Request interceptor function
   * @returns Interceptor ID for removal
   */
  addRequestInterceptor(interceptor: (config: unknown) => unknown): number;

  /**
   * Add a response interceptor
   * @param interceptor Response interceptor function
   * @returns Interceptor ID for removal
   */
  addResponseInterceptor(interceptor: (response: unknown) => unknown): number;

  /**
   * Remove a request interceptor
   * @param id Interceptor ID
   */
  removeRequestInterceptor(id: number): void;

  /**
   * Remove a response interceptor
   * @param id Interceptor ID
   */
  removeResponseInterceptor(id: number): void;
}

/**
 * Network service options including logger
 */
export interface NetworkServiceOptions extends NetworkRequestOptions {
  logger?: ComponentLogger;
}

/**
 * Fetch implementation of NetworkService
 */
export class FetchNetworkService implements NetworkService {
  private baseUrl = '';
  private defaultOptions: NetworkRequestOptions = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 30000,
  };
  private openApiService: OpenApiService | null = null;
  private requestInterceptors: ((config: unknown) => unknown)[] = [];
  private responseInterceptors: ((response: unknown) => unknown)[] = [];
  private logger: ComponentLogger;

  /**
   * Create a fetch network service
   * @param options Default options
   */
  constructor(options?: NetworkServiceOptions) {
    if (options) {
      this.defaultOptions = { ...this.defaultOptions, ...options };
      this.logger = options.logger || null as unknown as ComponentLogger;
    } else {
      this.logger = null as unknown as ComponentLogger;
    }
  }

  /**
   * Set the logger
   * @param logger The logger to use
   */
  setLogger(logger: ComponentLogger): void {
    this.logger = logger;
  }

  /**
   * Set base URL for requests
   * @param url Base URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
    this.logger?.debug(`Base URL set to: ${url}`);
  }

  /**
   * Get the base URL
   * @returns Base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Set a default header for all requests
   * @param name Header name
   * @param value Header value
   */
  setDefaultHeader(name: string, value: string): void {
    if (!this.defaultOptions.headers) {
      this.defaultOptions.headers = {};
    }
    this.defaultOptions.headers[name] = value;
  }

  /**
   * Set default headers for all requests
   * @param headers Headers to set
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultOptions.headers = { ...this.defaultOptions.headers, ...headers };
  }

  /**
   * Set OpenAPI service for request validation
   * @param service OpenApiService instance
   */
  setOpenApiService(service: OpenApiService): void {
    this.openApiService = service;
  }

  /**
   * Add a request interceptor
   * @param interceptor Request interceptor function
   * @returns Interceptor ID (index in array)
   */
  addRequestInterceptor(interceptor: (config: unknown) => unknown): number {
    this.requestInterceptors.push(interceptor);
    return this.requestInterceptors.length - 1;
  }

  /**
   * Add a response interceptor
   * @param interceptor Response interceptor function
   * @returns Interceptor ID (index in array)
   */
  addResponseInterceptor(interceptor: (response: unknown) => unknown): number {
    this.responseInterceptors.push(interceptor);
    return this.responseInterceptors.length - 1;
  }

  /**
   * Remove a request interceptor
   * @param id Interceptor ID
   */
  removeRequestInterceptor(id: number): void {
    if (id >= 0 && id < this.requestInterceptors.length) {
      this.requestInterceptors.splice(id, 1);
    }
  }

  /**
   * Remove a response interceptor
   * @param id Interceptor ID
   */
  removeResponseInterceptor(id: number): void {
    if (id >= 0 && id < this.responseInterceptors.length) {
      this.responseInterceptors.splice(id, 1);
    }
  }

  /**
   * Make a GET request
   * @param url Request URL
   * @param options Request options
   * @returns Response promise
   */
  async get<T = unknown>(url: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>> {
    return this.request<T>('GET', url, undefined, options);
  }

  /**
   * Make a POST request
   * @param url Request URL
   * @param data Request data
   * @param options Request options
   * @returns Response promise
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    options?: NetworkRequestOptions,
  ): Promise<NetworkResponse<T>> {
    return this.request<T>('POST', url, data, options);
  }

  /**
   * Make a PUT request
   * @param url Request URL
   * @param data Request data
   * @param options Request options
   * @returns Response promise
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    options?: NetworkRequestOptions,
  ): Promise<NetworkResponse<T>> {
    return this.request<T>('PUT', url, data, options);
  }

  /**
   * Make a DELETE request
   * @param url Request URL
   * @param options Request options
   * @returns Response promise
   */
  async delete<T = unknown>(url: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  /**
   * Make a PATCH request
   * @param url Request URL
   * @param data Request data
   * @param options Request options
   * @returns Response promise
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    options?: NetworkRequestOptions,
  ): Promise<NetworkResponse<T>> {
    return this.request<T>('PATCH', url, data, options);
  }

  /**
   * Make a HEAD request
   * @param url Request URL
   * @param options Request options
   * @returns Response promise
   */
  async head<T = unknown>(url: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>> {
    return this.request<T>('HEAD', url, undefined, options);
  }

  /**
   * Implementation of the request method with all HTTP methods
   * @param method HTTP method
   * @param url Request URL
   * @param data Request data
   * @param options Request options
   * @returns Network response promise
   */
  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    options?: NetworkRequestOptions,
  ): Promise<NetworkResponse<T>> {
    // Merge default options with provided options
    const requestOptions: NetworkRequestOptions = {
      ...this.defaultOptions,
      ...options,
    };

    // Create request configuration
    const requestConfig: RequestInit & { url: string; data?: unknown } = {
      url: this.getFullUrl(url),
      method,
      headers: requestOptions.headers || {},
      data: data,
    };

    // Apply request interceptors
    let modifiedConfig = { ...requestConfig };
    for (const interceptor of this.requestInterceptors) {
      try {
        const result = interceptor(modifiedConfig);
        if (result) {
          modifiedConfig = result as typeof modifiedConfig;
        }
      } catch (error) {
        this.logger?.error('Request interceptor error', error);
      }
    }

    // Check if we should validate with OpenAPI
    if (requestOptions.validateWithOpenApi && this.openApiService) {
      try {
        const validationResult = await this.openApiService.validateRequest(
          modifiedConfig.method as string,
          modifiedConfig.url,
          modifiedConfig.data,
          modifiedConfig.headers as Record<string, string>,
        );

        if (!validationResult.valid) {
          this.logger?.warn('OpenAPI validation failed', validationResult.errors);
        }
      } catch (error) {
        this.logger?.error('OpenAPI validation error', error);
      }
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: modifiedConfig.method as string,
      headers: modifiedConfig.headers as HeadersInit,
      credentials: requestOptions.withCredentials ? 'include' : 'same-origin',
    };

    // Add body for methods that support it
    if (
      ['POST', 'PUT', 'PATCH'].includes(modifiedConfig.method as string) &&
      modifiedConfig.data !== undefined
    ) {
      // Apply request body transformer if provided
      if (requestOptions.transformRequest) {
        try {
          const transformedData = requestOptions.transformRequest(modifiedConfig.data);
          fetchOptions.body =
            typeof transformedData === 'string'
              ? transformedData
              : JSON.stringify(transformedData);
        } catch (error) {
          this.logger?.error('Error transforming request data', error);
          fetchOptions.body = JSON.stringify(modifiedConfig.data);
        }
      } else {
        // Default transformation for JSON
        fetchOptions.body =
          typeof modifiedConfig.data === 'string'
            ? modifiedConfig.data
            : JSON.stringify(modifiedConfig.data);
      }
    }

    try {
      // Create AbortController for timeout handling
      const abortController = new AbortController();
      fetchOptions.signal = abortController.signal;

      // Set timeout if specified
      let timeoutId: number | undefined;
      if (requestOptions.timeout && requestOptions.timeout > 0) {
        timeoutId = window.setTimeout(() => {
          abortController.abort();
          this.logger?.warn(`Request to ${url} timed out after ${requestOptions.timeout}ms`);
        }, requestOptions.timeout);
      }

      this.logger?.debug(`Making ${method} request to ${url}`, { 
        url,
        method,
        options: requestOptions,
      });

      // Make the fetch request
      const response = await fetch(this.getFullUrl(url), fetchOptions);

      // Clear timeout if set
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      // Extract response data based on response type
      let responseData: T;

      if (requestOptions.responseType === 'text') {
        responseData = await response.text() as unknown as T;
      } else if (requestOptions.responseType === 'blob') {
        responseData = await response.blob() as unknown as T;
      } else if (requestOptions.responseType === 'arraybuffer') {
        responseData = await response.arrayBuffer() as unknown as T;
      } else {
        // Default to JSON
        const text = await response.text();
        try {
          responseData = text ? JSON.parse(text) : null as unknown as T;
        } catch (error) {
          this.logger?.warn('Failed to parse JSON response', { text, error });
          responseData = text as unknown as T;
        }
      }

      // Apply response transformer if provided
      if (requestOptions.transformResponse) {
        try {
          responseData = requestOptions.transformResponse(responseData) as T;
        } catch (error) {
          this.logger?.error('Error transforming response data', error);
        }
      }

      // Create network response
      const networkResponse: NetworkResponse<T> = {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: this.extractHeaders(response.headers),
        requestOptions,
        requestUrl: url,
        requestMethod: method,
        requestData: data,
      };

      // Apply response interceptors
      let modifiedResponse: NetworkResponse<T> = { ...networkResponse };
      for (const interceptor of this.responseInterceptors) {
        try {
          const result = interceptor(modifiedResponse);
          if (result) {
            modifiedResponse = result as NetworkResponse<T>;
          }
        } catch (error) {
          this.logger?.error('Response interceptor error', error);
        }
      }

      // Check for error status and handle if needed
      if (!response.ok && requestOptions.errorInterceptor) {
        try {
          const error = new Error(`Request failed with status ${response.status}`);
          Object.defineProperty(error, 'response', { value: modifiedResponse });
          const errorResult = await requestOptions.errorInterceptor(error);
          
          if (errorResult instanceof Error) {
            throw errorResult;
          }
          
          if (typeof errorResult === 'object' && errorResult !== null) {
            return errorResult as NetworkResponse<T>;
          }
        } catch (interceptedError) {
          this.logger?.error('Error interceptor failed', interceptedError);
          throw interceptedError;
        }
      }

      // Throw error for non-2xx responses if no interceptor handled it
      if (!response.ok) {
        const error = new Error(`Request failed with status ${response.status}: ${response.statusText}`);
        Object.defineProperty(error, 'response', { value: modifiedResponse });
        throw error;
      }

      return modifiedResponse;
    } catch (error) {
      this.logger?.error('Network request failed', error);
      throw error;
    }
  }

  /**
   * Get full URL with base URL
   * @param url URL path
   * @returns Full URL
   */
  private getFullUrl(url: string): string {
    // If URL is already absolute, return it
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If base URL is not set, return URL as is
    if (!this.baseUrl) {
      return url;
    }

    // Join base URL and URL, handling slashes
    if (this.baseUrl.endsWith('/') && url.startsWith('/')) {
      return this.baseUrl + url.substring(1);
    } else if (!this.baseUrl.endsWith('/') && !url.startsWith('/')) {
      return `${this.baseUrl}/${url}`;
    } else {
      return this.baseUrl + url;
    }
  }

  /**
   * Extract headers from Headers object
   * @param headers Headers object
   * @returns Record of header name to value
   */
  private extractHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}
