/**
 * Real API Client
 * 
 * Implementation of the API client for production use with real HTTP requests
 */

import { ApiClient, ApiOptions, ApiResponse } from './interfaces/api-client';

export class RealApiClient implements ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private tokenKey = 'auth_token';

  constructor(options: ApiOptions = {}) {
    this.baseUrl = options.baseUrl || '/api';
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };
    
    // Initialize auth token if available
    this.setupAuthToken();
  }

  /**
   * Set up authorization token from storage if available
   */
  private setupAuthToken(): void {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(this.tokenKey);
      if (token) {
        this.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  }

  /**
   * Set the auth token for future requests
   */
  public setAuthToken(token: string | null): void {
    if (token) {
      this.headers['Authorization'] = `Bearer ${token}`;
      localStorage.setItem(this.tokenKey, token);
    } else {
      delete this.headers['Authorization'];
      localStorage.removeItem(this.tokenKey);
    }
  }

  /**
   * Format error response
   */
  private createErrorResponse<T>(
    message: string,
    status: number = 500,
    details?: unknown
  ): ApiResponse<T> {
    return {
      data: null,
      error: {
        message,
        code: status.toString(),
        details
      },
      status,
      ok: false
    };
  }

  /**
   * Format success response
   */
  private createSuccessResponse<T>(
    data: T,
    status: number = 200
  ): ApiResponse<T> {
    return {
      data,
      error: null,
      status,
      ok: true
    };
  }

  /**
   * Handle fetch response and convert to ApiResponse
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const status = response.status;
    
    // Handle non-JSON responses
    if (!response.headers.get('content-type')?.includes('application/json')) {
      if (!response.ok) {
        return this.createErrorResponse<T>(`HTTP error ${status}: ${response.statusText}`, status);
      }
      
      const text = await response.text();
      // Since we can't parse the response as T, we have to use any here
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this.createSuccessResponse<any>(text, status);
    }
    
    // Parse JSON response
    try {
      const data = await response.json();
      
      // Handle API error responses
      if (!response.ok) {
        return {
          data: null,
          error: typeof data.error === 'string' 
            ? { message: data.error } 
            : data.error || { 
                message: data.message || `HTTP error ${status}: ${response.statusText}`,
                code: data.code || status.toString(),
                details: data.details
              },
          status,
          ok: false
        };
      }
      
      // Handle successful responses
      return {
        data: data.data !== undefined ? data.data : data,
        error: null,
        status,
        ok: true
      };
    } catch (error) {
      // Handle JSON parsing errors
      return this.createErrorResponse<T>(
        'Failed to parse response as JSON',
        status,
        { error: String(error) }
      );
    }
  }

  /**
   * Perform GET request
   */
  async get<T>(url: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      // Build URL with query parameters
      let fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
      
      if (params) {
        const queryString = new URLSearchParams(params).toString();
        fullUrl = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}${queryString}`;
      }
      
      // Make the request
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: this.headers,
        credentials: 'include' // Include cookies for auth
      });
      
      return this.handleResponse<T>(response);
    } catch (error) {
      // Handle network errors
      return this.createErrorResponse<T>(
        `Network error: ${String(error)}`,
        0, // Use 0 for network errors
        { error }
      );
    }
  }

  /**
   * Perform POST request
   */
  async post<T, D = unknown>(url: string, data?: D): Promise<ApiResponse<T>> {
    try {
      const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: this.headers,
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined
      });
      
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.createErrorResponse<T>(
        `Network error: ${String(error)}`,
        0,
        { error }
      );
    }
  }

  /**
   * Perform PUT request
   */
  async put<T, D = unknown>(url: string, data?: D): Promise<ApiResponse<T>> {
    try {
      const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
      
      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: this.headers,
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined
      });
      
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.createErrorResponse<T>(
        `Network error: ${String(error)}`,
        0,
        { error }
      );
    }
  }

  /**
   * Perform DELETE request
   */
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
      
      const response = await fetch(fullUrl, {
        method: 'DELETE',
        headers: this.headers,
        credentials: 'include'
      });
      
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.createErrorResponse<T>(
        `Network error: ${String(error)}`,
        0,
        { error }
      );
    }
  }
} 