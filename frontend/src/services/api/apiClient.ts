/**
 * API Client
 * 
 * Provides a centralized client for all API calls.
 * Uses real API client or mock API client based on configuration.
 */

import { parseApiError } from './errorHandling';
import { ApiResponse } from './apiResponse';
import { MockApiClient } from './mock-api-client';
import { ApiClient, ApiResponse as ClientApiResponse } from './interfaces/api-client';
import { apiConfig } from '@/config/env';
import { createApiConfig } from './config';

// Create the API configuration
const API_CONFIG = createApiConfig();

// Initialize the appropriate API client based on configuration
let client: ApiClient;

if (apiConfig.isMockingEnabled) {
  // Use mock API client for development and testing
  client = new MockApiClient({
    baseUrl: API_CONFIG.baseUrl,
    headers: API_CONFIG.headers
  });
  
  // Register mock endpoints if needed
  // This would be done by services that need specific mock data
} else {
  // In a real implementation, we would initialize a real API client here
  // For now, we'll still use the mock client since we're frontend-only
  client = new MockApiClient({
    baseUrl: API_CONFIG.baseUrl,
    headers: API_CONFIG.headers
  });
}

// Log configuration during development
if (process.env.NODE_ENV === 'development') {
  console.log(`API Client initialized with config:`, {
    mockingEnabled: apiConfig.isMockingEnabled,
    baseUrl: API_CONFIG.baseUrl,
  });
}

/**
 * Standard API client with consistent REST methods
 */
const apiClient = {
  /**
   * Make a GET request to the API
   * @param url The endpoint URL
   * @param params Optional query parameters
   */
  async get<T>(url: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const response = await client.get<T>(url, params);
      return this.mapToApiResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  },

  /**
   * Make a POST request to the API
   * @param url The endpoint URL
   * @param data Optional request body
   */
  async post<T, D = unknown>(url: string, data?: D): Promise<ApiResponse<T>> {
    try {
      const response = await client.post<T, D>(url, data);
      return this.mapToApiResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  },

  /**
   * Make a PUT request to the API
   * @param url The endpoint URL
   * @param data Optional request body
   */
  async put<T, D = unknown>(url: string, data?: D): Promise<ApiResponse<T>> {
    try {
      const response = await client.put<T, D>(url, data);
      return this.mapToApiResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  },

  /**
   * Make a DELETE request to the API
   * @param url The endpoint URL
   */
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await client.delete<T>(url);
      return this.mapToApiResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  },

  /**
   * Standardized error handling
   */
  /**
   * Map from the client's ApiResponse to our internal ApiResponse format
   */
  mapToApiResponse<T>(response: ClientApiResponse<T>): ApiResponse<T> {
    // Format the error based on its type
    let formattedError = undefined;
    if (response.error) {
      if (typeof response.error === 'string') {
        formattedError = {
          code: 'API_ERROR',
          message: response.error,
          details: undefined
        };
      } else {
        formattedError = {
          code: response.error.code || 'UNKNOWN',
          message: response.error.message,
          details: response.error.details
        };
      }
    }
    
    return {
      data: response.data as T,  // Cast to T as it might be undefined in ClientApiResponse
      error: formattedError,
      status: response.status,
      success: response.ok
    };
  },

  /**
   * Standardized error handling
   */
  handleError<T>(error: unknown): ApiResponse<T> {
    const apiError = parseApiError(error);
    
    return {
      data: null as unknown as T,  // Cast to T for type compatibility
      error: {
        message: apiError.message,
        code: apiError.type || 'UNKNOWN',
        details: apiError.details
      },
      status: apiError.status || 500,
      success: false
    };
  }
};

export default apiClient;
