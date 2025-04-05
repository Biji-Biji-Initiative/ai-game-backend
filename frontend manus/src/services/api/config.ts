/**
 * API Service Configuration
 * 
 * Centralized configuration for the API service layer
 */

import { apiConfig } from '@/config/env';
import { ApiOptions } from './interfaces/api-client';

/**
 * Default API client configuration
 */
export const defaultApiConfig: ApiOptions = {
  baseUrl: apiConfig.baseUrl,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  mockMode: apiConfig.isMockingEnabled,
};

/**
 * Create API client configuration with additional options
 * 
 * @param options Additional API options to merge with defaults
 * @returns Complete API configuration
 */
export function createApiConfig(options: Partial<ApiOptions> = {}): ApiOptions {
  return {
    ...defaultApiConfig,
    headers: {
      ...defaultApiConfig.headers,
      ...(options.headers || {}),
    },
    ...options,
  };
}

/**
 * Configure API timeout in milliseconds
 */
export const API_TIMEOUT = 30000; // 30 seconds

/**
 * Configure API retry settings
 */
export const API_RETRY = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
};
