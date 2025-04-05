import { useQuery } from '@tanstack/react-query';
import { apiServices, type ApiServiceProvider } from './service-provider';

/**
 * Creates a custom React Query hook for API calls
 * 
 * @param hookFunction Function that takes apiProvider and parameters, returns query data
 * @returns Custom hook that can be used in components
 */
export function createApiHook<P extends any[], R>(
  hookFunction: (apiProvider: ApiServiceProvider, ...params: P) => R
) {
  // Return a function that will be the custom hook
  return (...params: P) => {
    // Use the existing singleton instance of ApiServiceProvider
    // This is critical to prevent creating new instances on every render
    const apiProvider = apiServices;
    
    // Execute the hook function with the API provider and parameters
    const result = hookFunction(apiProvider, ...params);
    
    // Simply return the result without trying to modify it
    // The stability should be handled in the service provider's get method
    return result;
  };
} 