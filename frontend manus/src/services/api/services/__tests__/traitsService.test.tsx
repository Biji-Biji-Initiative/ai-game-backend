/**
 * Tests for traits service
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetTraits, useSaveTraitAssessment, useGetTraitAssessment } from '../traitsService';
import { createMockApiResponse } from '@/tests/testUtils';
import { mockApiClient, mockApiCall, mockApiError, resetApiMocks } from '@/tests/utils/apiClient';

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

describe('traitsService', () => {
  beforeEach(() => {
    resetApiMocks();
  });
  
  describe('useGetTraits', () => {
    it('should call the API with the correct parameters', async () => {
      // Mock successful API response
      const mockTraits = [
        { id: 'trait1', name: 'Creativity', description: 'Creative thinking', value: 0 },
        { id: 'trait2', name: 'Empathy', description: 'Understanding others', value: 0 }
      ];
      const mockResponse = createMockApiResponse(mockTraits);
      
      mockApiCall(mockResponse);

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useGetTraits(), {
        wrapper: createWrapper(),
      });

      // Wait for the query to complete using waitFor
      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      // Verify apiClient was called with correct params
      expect(mockApiClient.call).toHaveBeenCalledWith(
        expect.any(Function),
        '/traits',
        'GET',
        undefined
      );
      
      // Check the result is now available
      expect(result.current.data).toEqual(mockResponse);
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      const errorMessage = 'Failed to fetch traits';
      mockApiError(new Error(errorMessage));

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useGetTraits(), {
        wrapper: createWrapper(),
      });

      // Wait for the query to complete with error
      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });
      
      expect(result.current.error).toBeDefined();
    });
  });
  
  describe('useSaveTraitAssessment', () => {
    it('should call the API with the correct parameters', async () => {
      // Mock successful API response
      const mockResponse = createMockApiResponse({ success: true });
      
      mockApiCall(mockResponse);

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useSaveTraitAssessment(), {
        wrapper: createWrapper(),
      });

      // Execute the mutation
      const mockTraits = [
        { id: 'trait1', name: 'Creativity', description: 'Creative thinking', value: 80 },
        { id: 'trait2', name: 'Empathy', description: 'Understanding others', value: 75 }
      ];
      const mockData = { userEmail: 'test@example.com', traits: mockTraits };
      
      const mutationResult = await result.current.mutateAsync(mockData);

      // Verify apiClient was called with correct params
      expect(mockApiClient.call).toHaveBeenCalledWith(
        expect.any(Function),
        '/traits/assessment',
        'POST',
        mockData
      );
      
      expect(mutationResult).toEqual(mockResponse);
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      const errorMessage = 'Failed to save trait assessment';
      mockApiError(new Error(errorMessage));

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useSaveTraitAssessment(), {
        wrapper: createWrapper(),
      });

      // Try to execute the mutation but expect it to fail
      const mockData = { 
        userEmail: 'test@example.com', 
        traits: [{ id: 'trait1', name: 'Creativity', description: 'Creative thinking', value: 80 }] 
      };
      
      try {
        await result.current.mutateAsync(mockData);
        // If we get here, the test should fail because we expected an error
        throw new Error('Expected mutation to fail but it succeeded');
      } catch (error) {
        expect(error.message).toContain('Failed to save trait assessment');
      }
    });
  });
  
  describe('useGetTraitAssessment', () => {
    it('should call the API with the correct parameters', async () => {
      // Mock successful API response
      const mockTraits = [
        { id: 'trait1', name: 'Creativity', description: 'Creative thinking', value: 80 },
        { id: 'trait2', name: 'Empathy', description: 'Understanding others', value: 75 }
      ];
      const mockResponse = createMockApiResponse(mockTraits);
      
      mockApiCall(mockResponse);

      // Render the hook with our standardized wrapper
      const userEmail = 'test@example.com';
      const { result } = renderHook(() => useGetTraitAssessment(userEmail), {
        wrapper: createWrapper(),
      });

      // Wait for the query to complete
      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      // Verify apiClient was called with correct params
      expect(mockApiClient.call).toHaveBeenCalledWith(
        expect.any(Function),
        `/traits/assessment/${userEmail}`,
        'GET',
        { userEmail }
      );
      
      expect(result.current.data).toEqual(mockResponse);
    });
    
    it('should not call API if userEmail is empty', async () => {
      // Render the hook with our standardized wrapper and empty userEmail
      const { result } = renderHook(() => useGetTraitAssessment(''), {
        wrapper: createWrapper(),
      });

      // Wait briefly to ensure hooks have a chance to execute
      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle');
      });

      // Verify apiClient was not called
      expect(mockApiClient.call).not.toHaveBeenCalled();
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      const errorMessage = 'Failed to fetch trait assessment';
      mockApiError(new Error(errorMessage));

      // Render the hook with our standardized wrapper
      const userEmail = 'test@example.com';
      const { result } = renderHook(() => useGetTraitAssessment(userEmail), {
        wrapper: createWrapper(),
      });

      // Wait for the query to complete with error
      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });
      
      expect(result.current.error).toBeDefined();
    });
  });
});
