// Export interfaces
export * from './interfaces/api-client';
export * from './interfaces/models';
export * from './interfaces/services';

// Export service provider
export { apiServices } from './service-provider';

// Export API client factory
export { createApiClient, apiClient } from './api-client-factory';

// Re-export service provider and all services for easy imports
export { createApiHook } from './create-api-hook';

// Re-export API types
export type { ApiResult, ApiServiceError, PaginatedApiResult } from './api-types';
