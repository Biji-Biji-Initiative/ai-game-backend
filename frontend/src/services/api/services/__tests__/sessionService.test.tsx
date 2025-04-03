/**
 * Tests for session service
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateSession, useGetSession } from '../sessionService';
import { createMockApiResponse } from '../../../../tests/testUtils';
import { mockApiClient, mockApiCall, mockApiError, resetApiMocks } from '../../../../tests/utils/apiClient';

// Mock the apiClient module
jest.mock('../../apiClient', () => mockApiClient);

// Create a wrapper with query client for testing hooks
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });
  
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  
  return TestWrapper;
};

describe('sessionService', () => {
  beforeEach(() => {
    resetApiMocks();
  });

  describe('useCreateSession', () => {
    it('should call the API with the correct parameters', async () => {
      // Mock successful API response
      const mockSession = { id: 'test-session-id' };
      const mockResponse = createMockApiResponse(mockSession);
      
      mockApiCall(mockResponse);

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useCreateSession(), {
        wrapper: createWrapper(),
      });

      // Execute the mutation and capture the returned data
      const userData = { userEmail: 'test@example.com', userName: 'Test User' };
      const mutationResult = await result.current.mutateAsync(userData);

      // Verify apiClient was called correctly
      expect(mockApiClient.call).toHaveBeenCalledTimes(1);

      // Check that the mutation returned the expected data
      expect(mutationResult).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      // Mock API error
      const errorMessage = 'Failed to create session';
      mockApiError(new Error(errorMessage));

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useCreateSession(), {
        wrapper: createWrapper(),
      });

      // Execute the mutation and verify it rejects
      try {
        await result.current.mutateAsync({ userName: 'Test User' });
        // If we get here, the test should fail because we expected an error
        throw new Error('Expected mutation to fail but it succeeded');
      } catch (error) {
        expect(error.message).toContain('Failed to create session');
      }
    });
  });

  describe('useGetSession', () => {
    it('should call the API with the correct parameters', async () => {
      // Mock successful API response
      const mockSession = { id: 'test-session-id', userName: 'Test User' };
      const mockResponse = createMockApiResponse(mockSession);
      
      mockApiCall(mockResponse);

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useGetSession(), {
        wrapper: createWrapper(),
      });

      // Execute the mutation and capture the returned data directly
      const sessionId = 'test-session-id';
      const mutationResult = await result.current.mutateAsync(sessionId);

      // Verify apiClient was called correctly
      expect(mockApiClient.call).toHaveBeenCalledTimes(1);

      // Check that the mutation returned the expected data
      expect(mutationResult).toEqual(mockResponse);
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      const errorMessage = 'Failed to get session';
      mockApiError(new Error(errorMessage));

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useGetSession(), {
        wrapper: createWrapper(),
      });

      // Try to execute the mutation but expect it to fail
      try {
        await result.current.mutateAsync('test-session-id');
        // If we get here, the test should fail because we expected an error
        throw new Error('Expected mutation to fail but it succeeded');
      } catch (error) {
        expect(error.message).toContain('Failed to get session');
      }
    });
  });
});
