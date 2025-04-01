/**
 * Network Utility Functions
 * Utilities for handling network requests and responses
 */

/**
 * Interface for request options
 */
export interface RequestOptions extends RequestInit {
  baseUrl?: string;
  params?: Record<string, string | number | boolean | undefined>;
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onProgress?: (progress: ProgressEvent) => void;
}

/**
 * Type for response handling
 */
export type ResponseHandler<T> = (response: Response) => Promise<T>;

/**
 * Error class for network requests
 */
export class NetworkError extends Error {
  status: number;
  statusText: string;
  response?: any;
  
  constructor(message: string, status: number, statusText: string, response?: any) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
    this.statusText = statusText;
    this.response = response;
  }
}

/**
 * Adds query parameters to a URL
 * @param url Base URL
 * @param params Query parameters
 * @returns URL with query parameters
 */
export function addQueryParams(url: string, params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return url;
  
  const urlObj = new URL(url);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      urlObj.searchParams.append(key, String(value));
    }
  });
  
  return urlObj.toString();
}

/**
 * Creates a response handler based on the response type
 * @param responseType Type of response to handle
 * @returns Response handler function
 */
function createResponseHandler<T>(responseType: string): ResponseHandler<T> {
  switch (responseType) {
    case 'json':
      return response => response.json();
    case 'text':
      return response => response.text() as Promise<any>;
    case 'blob':
      return response => response.blob() as Promise<any>;
    case 'arrayBuffer':
      return response => response.arrayBuffer() as Promise<any>;
    case 'formData':
      return response => response.formData() as Promise<any>;
    default:
      return response => response.json();
  }
}

/**
 * Base function for making network requests
 * @param url URL to request
 * @param options Request options
 * @returns Promise with the response data
 */
export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  // Extract custom options
  const {
    baseUrl = '',
    params,
    responseType = 'json',
    timeout = 30000,
    retries = 0,
    retryDelay = 1000,
    onProgress,
    ...fetchOptions
  } = options;
  
  // Build full URL
  const fullUrl = baseUrl ? new URL(url, baseUrl).toString() : url;
  const urlWithParams = addQueryParams(fullUrl, params);
  
  // Create abort controller for timeout
  const controller = new AbortController();
  if (!fetchOptions.signal) {
    fetchOptions.signal = controller.signal;
  }
  
  // Set timeout
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // Create response handler
  const handleResponse = createResponseHandler<T>(responseType);
  
  try {
    // Add progress handling if provided
    if (onProgress && fetchOptions.method === 'GET') {
      return await fetchWithProgress<T>(urlWithParams, fetchOptions, handleResponse, onProgress);
    }
    
    // Make the request
    const response = await fetch(urlWithParams, fetchOptions);
    
    // Check for success
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      
      throw new NetworkError(
        `Request failed with status ${response.status}`,
        response.status,
        response.statusText,
        errorData
      );
    }
    
    // Process the response
    return await handleResponse(response);
  } catch (error) {
    // Handle retries
    if (retries > 0 && !(error instanceof DOMException && error.name === 'AbortError')) {
      return await retry<T>(urlWithParams, options, retries, retryDelay);
    }
    
    // Rethrow error
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Makes a request with progress tracking
 * @param url URL to request
 * @param options Fetch options
 * @param handleResponse Response handler
 * @param onProgress Progress callback
 * @returns Promise with the response data
 */
async function fetchWithProgress<T>(
  url: string,
  options: RequestInit,
  handleResponse: ResponseHandler<T>,
  onProgress: (progress: ProgressEvent) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    // Use XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();
    
    xhr.open(options.method || 'GET', url);
    
    // Set headers
    if (options.headers) {
      const headers = options.headers as Record<string, string>;
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }
    
    // Set up progress tracking
    xhr.onprogress = onProgress;
    
    // Handle completion
    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          // Create a mock response to use with the handler
          const response = new Response(xhr.response, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers(
              xhr.getAllResponseHeaders()
                .split('\r\n')
                .filter(Boolean)
                .reduce((acc, line) => {
                  const [key, value] = line.split(': ');
                  acc[key.toLowerCase()] = value;
                  return acc;
                }, {} as Record<string, string>)
            )
          });
          
          resolve(await handleResponse(response));
        } catch (error) {
          reject(error);
        }
      } else {
        reject(
          new NetworkError(
            `Request failed with status ${xhr.status}`,
            xhr.status,
            xhr.statusText,
            xhr.response
          )
        );
      }
    };
    
    // Handle errors
    xhr.onerror = () => {
      reject(new NetworkError('Network error', 0, '', null));
    };
    
    xhr.ontimeout = () => {
      reject(new NetworkError('Request timeout', 0, '', null));
    };
    
    // Send the request
    xhr.send(options.body as any);
  });
}

/**
 * Retries a failed request
 * @param url URL to request
 * @param options Request options
 * @param retries Number of retries left
 * @param delay Delay between retries
 * @returns Promise with the response data
 */
async function retry<T>(
  url: string,
  options: RequestOptions,
  retries: number,
  delay: number
): Promise<T> {
  // Wait for the specified delay
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Retry the request with one less retry
  return request<T>(url, {
    ...options,
    retries: retries - 1,
    retryDelay: delay * 2 // Exponential backoff
  });
}

/**
 * Makes a GET request
 * @param url URL to request
 * @param options Request options
 * @returns Promise with the response data
 */
export function get<T>(url: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(url, {
    ...options,
    method: 'GET'
  });
}

/**
 * Makes a POST request
 * @param url URL to request
 * @param data Data to send
 * @param options Request options
 * @returns Promise with the response data
 */
export function post<T>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
  return request<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}

/**
 * Makes a PUT request
 * @param url URL to request
 * @param data Data to send
 * @param options Request options
 * @returns Promise with the response data
 */
export function put<T>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
  return request<T>(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}

/**
 * Makes a PATCH request
 * @param url URL to request
 * @param data Data to send
 * @param options Request options
 * @returns Promise with the response data
 */
export function patch<T>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
  return request<T>(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}

/**
 * Makes a DELETE request
 * @param url URL to request
 * @param options Request options
 * @returns Promise with the response data
 */
export function del<T>(url: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(url, {
    ...options,
    method: 'DELETE'
  });
}

/**
 * Checks if the browser is online
 * @returns Whether the browser is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Adds event listeners for online/offline events
 * @param onlineCallback Callback for online event
 * @param offlineCallback Callback for offline event
 * @returns Cleanup function to remove listeners
 */
export function addConnectivityListeners(
  onlineCallback: () => void,
  offlineCallback: () => void
): () => void {
  window.addEventListener('online', onlineCallback);
  window.addEventListener('offline', offlineCallback);
  
  return () => {
    window.removeEventListener('online', onlineCallback);
    window.removeEventListener('offline', offlineCallback);
  };
} 