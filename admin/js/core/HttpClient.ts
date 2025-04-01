import { Component } from '../types/component-base';
import { ConfigManager } from './ConfigManager';
import { Logger } from './Logger';

/**
 * HTTP request method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  /**
   * Request method
   */
  method?: HttpMethod;
  
  /**
   * Request headers
   */
  headers?: Record<string, string>;
  
  /**
   * Request body
   */
  body?: any;
  
  /**
   * URL parameters to append to the request
   */
  params?: Record<string, string | number | boolean | null | undefined>;
  
  /**
   * Whether to send credentials
   */
  withCredentials?: boolean;
  
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Content type for the request
   */
  contentType?: string;
  
  /**
   * Response type
   */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  
  /**
   * Whether to automatically parse JSON
   */
  parseJson?: boolean;
  
  /**
   * Cache control
   */
  cache?: RequestCache;
  
  /**
   * Number of retries on failure
   */
  retries?: number;
  
  /**
   * Delay between retries in milliseconds
   */
  retryDelay?: number;
  
  /**
   * Custom fetch function to use
   */
  fetchFn?: typeof fetch;
  
  /**
   * Signal to abort the request
   */
  signal?: AbortSignal;
}

/**
 * HTTP response interface
 */
export interface HttpResponse<T = any> {
  /**
   * Response data
   */
  data: T;
  
  /**
   * Response status code
   */
  status: number;
  
  /**
   * Response status text
   */
  statusText: string;
  
  /**
   * Response headers
   */
  headers: Headers;
  
  /**
   * Original response object
   */
  response: Response;
}

/**
 * HTTP client error
 */
export class HttpError extends Error {
  /**
   * Response status code
   */
  public override status: number;
  
  /**
   * Response status text
   */
  public statusText: string;
  
  /**
   * Response data
   */
  public data: any;
  
  /**
   * Original response
   */
  public response?: Response;
  
  constructor(message: string, status: number, statusText: string, data?: any, response?: Response) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.response = response;
    
    // Required for TypeScript when extending Error
    Object.setPrototypeOf(this, HttpError.prototype);
  }
  
  /**
   * Convert the error to a string
   * @returns String representation of the error
   */
  override toString(): string {
    return `${this.name}: ${this.message} (${this.status} ${this.statusText})`;
  }
}

/**
 * HTTP request interceptor
 */
export interface RequestInterceptor {
  /**
   * Intercept request before it's sent
   * @param url Request URL
   * @param options Request options
   * @returns Modified URL and options
   */
  intercept(url: string, options: HttpRequestOptions): { url: string; options: HttpRequestOptions };
}

/**
 * HTTP response interceptor
 */
export interface ResponseInterceptor {
  /**
   * Intercept response
   * @param response Response object
   * @returns Modified response
   */
  intercept<T>(response: HttpResponse<T>): HttpResponse<T> | Promise<HttpResponse<T>>;
}

/**
 * HTTP error interceptor
 */
export interface ErrorInterceptor {
  /**
   * Intercept error
   * @param error Error object
   * @returns Modified error or response
   */
  intercept<T>(error: HttpError): HttpResponse<T> | Promise<HttpResponse<T>> | HttpError | Promise<HttpError>;
}

/**
 * HTTP client options
 */
export interface HttpClientOptions {
  /**
   * Base URL for all requests
   */
  baseUrl?: string;
  
  /**
   * Default headers for all requests
   */
  headers?: Record<string, string>;
  
  /**
   * Default timeout for all requests
   */
  timeout?: number;
  
  /**
   * Default request interceptors
   */
  requestInterceptors?: RequestInterceptor[];
  
  /**
   * Default response interceptors
   */
  responseInterceptors?: ResponseInterceptor[];
  
  /**
   * Default error interceptors
   */
  errorInterceptors?: ErrorInterceptor[];
  
  /**
   * Whether to automatically parse JSON responses
   */
  parseJson?: boolean;
  
  /**
   * Default number of retries on failure
   */
  retries?: number;
  
  /**
   * Default delay between retries in milliseconds
   */
  retryDelay?: number;
  
  /**
   * Custom fetch function to use
   */
  fetchFn?: typeof fetch;
  
  /**
   * Whether to log requests
   */
  logRequests?: boolean;
  
  /**
   * Whether to log responses
   */
  logResponses?: boolean;
  
  /**
   * Whether to log errors
   */
  logErrors?: boolean;
}

/**
 * Default HTTP client options
 */
const DEFAULT_OPTIONS: HttpClientOptions = {
  baseUrl: '',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
  requestInterceptors: [],
  responseInterceptors: [],
  errorInterceptors: [],
  parseJson: true,
  retries: 0,
  retryDelay: 1000,
  fetchFn: fetch,
  logRequests: false,
  logResponses: false,
  logErrors: true,
};

/**
 * HTTP client for making API requests
 */
export class HttpClient implements Component {
  private static instance: HttpClient;
  private config: HttpClientOptions;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private initialized: boolean = false;
  private logger = Logger.getLogger('HttpClient');
  
  /**
   * Get the singleton instance of HttpClient
   */
  public static getInstance(): HttpClient {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient();
    }
    return HttpClient.instance;
  }
  
  /**
   * Private constructor to prevent direct creation
   */
  private constructor() {
    this.config = { ...DEFAULT_OPTIONS };
  }
  
  /**
   * Initialize the HTTP client
   * @param options HTTP client options
   */
  public initialize(options: HttpClientOptions = {}): void {
    // Get config values
    const configManager = ConfigManager.getInstance();
    const configTimeout = configManager.get<number>('timeout');
    const configApiUrl = configManager.get<string>('apiUrl');
    
    // Merge options
    this.config = {
      ...DEFAULT_OPTIONS,
      ...(configTimeout ? { timeout: configTimeout } : {}),
      ...(configApiUrl ? { baseUrl: configApiUrl } : {}),
      ...options,
    };
    
    // Set interceptors
    this.requestInterceptors = [...(this.config.requestInterceptors || [])];
    this.responseInterceptors = [...(this.config.responseInterceptors || [])];
    this.errorInterceptors = [...(this.config.errorInterceptors || [])];
    
    this.initialized = true;
    this.logger.info('HTTP client initialized');
  }
  
  /**
   * Build the full URL for a request
   * @param url URL to build
   * @param params Query parameters
   * @returns Built URL
   */
  private buildUrl(url: string, params?: Record<string, any>): string {
    // Resolve URL against base URL if it's not absolute
    let fullUrl = url;
    if (!url.match(/^https?:\/\//) && !url.startsWith('/')) {
      fullUrl = `${this.config.baseUrl || ''}/${url}`;
    } else if (url.startsWith('/') && this.config.baseUrl) {
      // If starts with / and we have a base URL, join them
      const baseUrl = this.config.baseUrl.endsWith('/')
        ? this.config.baseUrl.slice(0, -1)
        : this.config.baseUrl;
      fullUrl = `${baseUrl}${url}`;
    }
    
    // Add query parameters
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      
      for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value));
        }
      }
      
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
      }
    }
    
    return fullUrl;
  }
  
  /**
   * Add a request interceptor
   * @param interceptor Request interceptor
   */
  public addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }
  
  /**
   * Add a response interceptor
   * @param interceptor Response interceptor
   */
  public addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }
  
  /**
   * Add an error interceptor
   * @param interceptor Error interceptor
   */
  public addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }
  
  /**
   * Remove all interceptors
   */
  public clearInterceptors(): void {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
  }
  
  /**
   * Make an HTTP request
   * @param url URL to request
   * @param reqOptions Request options
   * @returns Response promise
   */
  public async request<T = any>(url: string, reqOptions: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    // Apply request interceptors
    let interceptedUrl = url;
    let interceptedOptions = { ...reqOptions };
    
    for (const interceptor of this.requestInterceptors) {
      const result = interceptor.intercept(interceptedUrl, interceptedOptions);
      interceptedUrl = result.url;
      interceptedOptions = result.options;
    }
    
    // Merge options
    const mergedOptions: HttpRequestOptions = {
      method: 'GET',
      headers: { ...this.config.headers },
      timeout: this.config.timeout,
      parseJson: this.config.parseJson,
      retries: this.config.retries,
      retryDelay: this.config.retryDelay,
      fetchFn: this.config.fetchFn || fetch,
      ...interceptedOptions,
    };
    
    // Merge headers
    if (interceptedOptions.headers) {
      mergedOptions.headers = {
        ...this.config.headers,
        ...interceptedOptions.headers,
      };
    }
    
    // Set body
    if (mergedOptions.body !== undefined) {
      // Auto-stringify JSON bodies
      if (
        typeof mergedOptions.body === 'object' &&
        !(mergedOptions.body instanceof FormData) &&
        !(mergedOptions.body instanceof URLSearchParams) &&
        !(mergedOptions.body instanceof Blob) &&
        !(mergedOptions.body instanceof ArrayBuffer)
      ) {
        mergedOptions.body = JSON.stringify(mergedOptions.body);
        
        // Ensure content-type for JSON if not overridden
        if (mergedOptions.headers && !('Content-Type' in mergedOptions.headers)) {
          mergedOptions.headers['Content-Type'] = 'application/json';
        }
      }
    }
    
    // Build URL
    const fullUrl = this.buildUrl(interceptedUrl, mergedOptions.params);
    
    // Log request if enabled
    if (this.config.logRequests) {
      this.logger.debug(`${mergedOptions.method} ${fullUrl}`, {
        headers: mergedOptions.headers,
        body: mergedOptions.body,
      });
    }
    
    // Create fetch options
    const fetchOptions: RequestInit = {
      method: mergedOptions.method,
      headers: mergedOptions.headers as HeadersInit,
      body: mergedOptions.body,
      cache: mergedOptions.cache,
      credentials: mergedOptions.withCredentials ? 'include' : 'same-origin',
      signal: mergedOptions.signal,
    };
    
    // Create timeout controller if needed
    let timeoutId: number | undefined;
    let timeoutController: AbortController | undefined;
    
    if (mergedOptions.timeout && mergedOptions.timeout > 0) {
      timeoutController = new AbortController();
      
      // If there's already a signal, we need to ensure both work
      if (mergedOptions.signal) {
        const originalSignal = mergedOptions.signal;
        
        // If original signal is already aborted, use it directly
        if (originalSignal.aborted) {
          fetchOptions.signal = originalSignal;
        } else {
          // Otherwise, set up both signals
          originalSignal.addEventListener('abort', () => {
            timeoutController?.abort();
          });
          
          fetchOptions.signal = timeoutController.signal;
        }
      } else {
        fetchOptions.signal = timeoutController.signal;
      }
      
      // Set up timeout
      timeoutId = window.setTimeout(() => {
        timeoutController?.abort();
      }, mergedOptions.timeout);
    }
    
    try {
      // Try to fetch with retries
      let lastError: Error | null = null;
      let retryCount = 0;
      
      while (retryCount <= (mergedOptions.retries || 0)) {
        try {
          const fetchFn = mergedOptions.fetchFn || fetch;
          const response = await fetchFn(fullUrl, fetchOptions);
          
          // Clear timeout if set
          if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
          }
          
          // Parse the response
          let data: any;
          
          // Use the specified response type or parse automatically
          if (mergedOptions.responseType) {
            switch (mergedOptions.responseType) {
              case 'json':
                data = await response.json();
                break;
              case 'text':
                data = await response.text();
                break;
              case 'blob':
                data = await response.blob();
                break;
              case 'arraybuffer':
                data = await response.arrayBuffer();
                break;
            }
          } else if (mergedOptions.parseJson !== false) {
            // Default to trying JSON
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
              try {
                data = await response.json();
              } catch (e) {
                // If JSON parsing fails, get as text
                data = await response.text();
              }
            } else {
              // Otherwise, get as text
              data = await response.text();
            }
          } else {
            // Get as text if parsing is disabled
            data = await response.text();
          }
          
          // Create response object
          let httpResponse: HttpResponse<T> = {
            data: data as T,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            response,
          };
          
          // Apply response interceptors
          for (const interceptor of this.responseInterceptors) {
            httpResponse = await interceptor.intercept(httpResponse);
          }
          
          // Log response if enabled
          if (this.config.logResponses) {
            this.logger.debug(`Response ${mergedOptions.method} ${fullUrl}`, {
              status: response.status,
              headers: Object.fromEntries(response.headers.entries()),
              data: httpResponse.data,
            });
          }
          
          // Check for HTTP error status
          if (!response.ok) {
            const error = new HttpError(
              `HTTP error ${response.status}: ${response.statusText}`,
              response.status,
              response.statusText,
              httpResponse.data,
              response
            );
            
            // Apply error interceptors
            let result: HttpResponse<T> | HttpError = error;
            
            for (const interceptor of this.errorInterceptors) {
              result = await interceptor.intercept(error);
              
              // If an interceptor returns a valid response, return it
              if ('data' in result) {
                return result as HttpResponse<T>;
              }
            }
            
            // Otherwise throw the error
            throw result;
          }
          
          return httpResponse;
        } catch (error) {
          lastError = error as Error;
          
          // If this is a timeout or abort, don't retry
          if (
            error instanceof DOMException && error.name === 'AbortError' ||
            fetchOptions.signal?.aborted
          ) {
            throw new Error(`Request timeout: ${mergedOptions.timeout}ms exceeded`);
          }
          
          // If we've reached max retries, throw
          if (retryCount >= (mergedOptions.retries || 0)) {
            break;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, mergedOptions.retryDelay || 1000));
          retryCount++;
        }
      }
      
      // If we get here, all retries failed
      throw lastError;
    } catch (error) {
      // Clear timeout if set
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      
      // Handle errors
      let httpError: HttpError;
      
      if (error instanceof HttpError) {
        httpError = error;
      } else {
        httpError = new HttpError(
          error instanceof Error ? error.message : String(error),
          0,
          'Unknown Error',
          null
        );
      }
      
      // Log error if enabled
      if (this.config.logErrors) {
        this.logger.error(`Error ${mergedOptions.method} ${fullUrl}`, httpError);
      }
      
      // Apply error interceptors
      let result: HttpResponse<T> | HttpError = httpError;
      
      for (const interceptor of this.errorInterceptors) {
        result = await interceptor.intercept(httpError);
        
        // If an interceptor returns a valid response, return it
        if ('data' in result) {
          return result as HttpResponse<T>;
        }
      }
      
      // Otherwise throw the error
      throw result;
    }
  }
  
  /**
   * Make a GET request
   * @param url URL to request
   * @param reqOptions Request options
   * @returns Response promise
   */
  public get<T = any>(url: string, reqOptions: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...reqOptions, method: 'GET' });
  }
  
  /**
   * Make a POST request
   * @param url URL to request
   * @param data Request body
   * @param reqOptions Request options
   * @returns Response promise
   */
  public post<T = any>(url: string, data?: any, reqOptions: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...reqOptions, method: 'POST', body: data });
  }
  
  /**
   * Make a PUT request
   * @param url URL to request
   * @param data Request body
   * @param reqOptions Request options
   * @returns Response promise
   */
  public put<T = any>(url: string, data?: any, reqOptions: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...reqOptions, method: 'PUT', body: data });
  }
  
  /**
   * Make a DELETE request
   * @param url URL to request
   * @param reqOptions Request options
   * @returns Response promise
   */
  public delete<T = any>(url: string, reqOptions: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...reqOptions, method: 'DELETE' });
  }
  
  /**
   * Make a PATCH request
   * @param url URL to request
   * @param data Request body
   * @param reqOptions Request options
   * @returns Response promise
   */
  public patch<T = any>(url: string, data?: any, reqOptions: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...reqOptions, method: 'PATCH', body: data });
  }
  
  /**
   * Make a HEAD request
   * @param url URL to request
   * @param reqOptions Request options
   * @returns Response promise
   */
  public head<T = any>(url: string, reqOptions: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...reqOptions, method: 'HEAD' });
  }
  
  /**
   * Make an OPTIONS request
   * @param url URL to request
   * @param reqOptions Request options
   * @returns Response promise
   */
  public optionsRequest<T = any>(url: string, reqOptions: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...reqOptions, method: 'OPTIONS' });
  }
} 