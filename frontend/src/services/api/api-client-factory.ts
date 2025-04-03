import { ApiClient, ApiOptions } from './interfaces/api-client';
import { MockApiClient } from './mock-api-client';

/**
 * Factory for creating API clients
 * This allows us to easily switch between mock and real implementations
 */
export function createApiClient(options: ApiOptions = {}): ApiClient {
  // For now, we always return a MockApiClient since we're creating a pure frontend repository
  // In the future, we could conditionally return a real implementation based on options.mockMode
  return new MockApiClient(options);
}

/**
 * Default API client instance
 * Use this for most API calls in the application
 */
export const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  mockMode: true,
});
