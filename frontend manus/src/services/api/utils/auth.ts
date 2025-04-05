/**
 * Authentication Utility
 * Handles token refresh and auth-related functionality
 */

import { apiClient } from '../api-client-factory';
import { ApiResponse } from '../interfaces/api-client';
import { RealApiClient } from '../real-api-client';

// Constants
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Types
interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

/**
 * Get the current authentication token
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {return null;}
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Get the current refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') {return null;}
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Set authentication tokens
 */
export function setAuthTokens(token: string, refreshToken?: string): void {
  if (typeof window === 'undefined') {return;}
  
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  
  // Update the API client with the new token
  if (apiClient instanceof RealApiClient) {
    apiClient.setAuthToken(token);
  }
}

/**
 * Clear all authentication tokens
 */
export function clearAuthTokens(): void {
  if (typeof window === 'undefined') {return;}
  
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  
  // Remove the token from the API client
  if (apiClient instanceof RealApiClient) {
    apiClient.setAuthToken(null);
  }
}

/**
 * Attempt to refresh the authentication token
 * @returns A promise that resolves to true if the token was refreshed successfully
 */
export async function refreshAuthToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    return false;
  }
  
  try {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', { refreshToken });
    
    if (response.ok && response.data) {
      setAuthTokens(response.data.token, response.data.refreshToken);
      return true;
    }
    
    // If refresh failed, clear tokens and consider the user logged out
    clearAuthTokens();
    return false;
  } catch (error) {
    console.error('Error refreshing token:', error);
    clearAuthTokens();
    return false;
  }
}

/**
 * Check if a response indicates the need for authentication token refresh
 */
export function isAuthRefreshNeeded(response: ApiResponse<unknown>): boolean {
  return response.status === 401 && 
         response.error !== null && 
         typeof response.error === 'object' &&
         response.error !== null &&
         'code' in response.error && 
         response.error.code === 'token_expired';
}

/**
 * Handle authentication errors in API responses
 * @param response The API response to check
 * @param retryFn A function to retry the original request if token refresh succeeds
 * @returns The original response or the result of the retry
 */
export async function handleAuthErrors<T>(
  response: ApiResponse<T>,
  retryFn: () => Promise<ApiResponse<T>>
): Promise<ApiResponse<T>> {
  // If the response doesn't need auth refresh, return it as-is
  if (!isAuthRefreshNeeded(response)) {
    return response;
  }
  
  // Try to refresh the token
  const refreshed = await refreshAuthToken();
  
  // If refresh succeeded, retry the original request
  if (refreshed) {
    return retryFn();
  }
  
  // If refresh failed, return the original error response
  return response;
} 