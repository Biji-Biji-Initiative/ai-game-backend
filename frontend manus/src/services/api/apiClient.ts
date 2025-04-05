/**
 * API Client
 * 
 * Provides a centralized client for all API calls.
 * Uses real API client or mock API client based on configuration.
 * Now integrated with Zodios for type-safe API calls.
 */

import { parseApiError } from './errorHandling';
import { ApiResponse } from './apiResponse';
import { MockApiClient } from './mock-api-client';
import { ApiClient, ApiResponse as ClientApiResponse } from './interfaces/api-client';
import { apiConfig } from '@/config/env';
import { createApiConfig } from './config';
// Import the Zodios client from the generated file
import { api as zodiosClient } from '../../lib/api/generated-zodios-client';
// Import Zodios types
import { ZodiosError } from '@zodios/core';

// Create the API configuration
const API_CONFIG = createApiConfig();

// Initialize the appropriate API client based on configuration
let client: ApiClient;
// Initialize the Zodios client for type-safe API calls when not mocking
// Will be uncommented when we're ready to use it
// const zodiosClient = API_CONFIG.baseUrl ? createZodiosClient(API_CONFIG.baseUrl) : null;

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
  
  // When we're ready to use the real API:
  // We can use the Zodios client here, but we need to adapt it to our ApiClient interface
  // This is a future enhancement
}

// Log configuration during development
if (process.env.NODE_ENV === 'development') {
  console.warn(`API Client initialized with config:`, {
    mockingEnabled: apiConfig.isMockingEnabled,
    baseUrl: API_CONFIG.baseUrl,
  });
}

/**
 * Standard API client with consistent REST methods
 * In the future, this can be updated to use Zodios directly when not in mock mode
 */
const apiClient = {
  /**
   * Make a GET request to the API
   * @param url The endpoint URL
   * @param params Optional query parameters
   */
  async get<T>(url: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      // When we're ready to use Zodios directly, we can implement it here
      // if (!apiConfig.isMockingEnabled && zodiosClient) {
      //   try {
      //     const response = await zodiosClient.get(url, { params });
      //     return {
      //       data: response as T,
      //       status: 200,
      //       success: true,
      //       error: undefined
      //     };
      //   } catch (error) {
      //     return this.handleZodiosError<T>(error);
      //   }
      // }
      
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
      // When we're ready to use Zodios directly, we can implement it here
      // if (!apiConfig.isMockingEnabled && zodiosClient) {
      //   try {
      //     const response = await zodiosClient.post(url, data);
      //     return {
      //       data: response as T,
      //       status: 200,
      //       success: true,
      //       error: undefined
      //     };
      //   } catch (error) {
      //     return this.handleZodiosError<T>(error);
      //   }
      // }
      
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
   * Handle errors from Zodios client
   * This will be used when we switch to Zodios
   */
  handleZodiosError<T>(error: unknown): ApiResponse<T> {
    if (error instanceof ZodiosError) {
      // Extract error properties correctly from ZodiosError
      const errorStatus = typeof error.cause === 'object' && error.cause && 'status' in error.cause 
        ? Number(error.cause.status) 
        : 500;
      
      // We need to keep this as ApiResponse<T> for compatibility with method signatures
      return {
        // TypeScript limitation: we need this cast because the API requires data to be T
        // In practice, errors will always have null data
        data: null as unknown as T,
        error: {
          message: error.message,
          code: String(errorStatus) || 'UNKNOWN',
          details: error.cause && typeof error.cause === 'object' && 'data' in error.cause
            ? JSON.stringify(error.cause.data)
            : undefined
        },
        status: errorStatus,
        success: false
      };
    }
    
    return this.handleError<T>(error);
  },

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
    
    // Handle response data safely
    const responseData = response.data === undefined ? null : response.data;
    
    // Return formatted response
    return {
      // We need to maintain the same return type as defined in the method signature
      data: responseData as T,
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
    
    // We need to keep this as ApiResponse<T> for compatibility with method signatures
    return {
      // TypeScript limitation: we need this cast because the API requires data to be T
      // In practice, errors will always have null data
      data: null as unknown as T,
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
