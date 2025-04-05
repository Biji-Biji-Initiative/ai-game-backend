/**
 * Tests for focus service
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetFocusAreas, useRecommendFocusAreas, useSaveFocusAreaSelection } from '../focusService';
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

describe('focusService', () => {
  beforeEach(() => {
    resetApiMocks();
  });
  
  describe('useGetFocusAreas', () => {
    it('should call the API with the correct parameters', async () => {
      // Mock successful API response
      const mockFocusAreas = [
        { id: 'focus1', name: 'Creative Thinking', description: 'Creative problem solving', matchLevel: 85 },
        { id: 'focus2', name: 'Emotional Intelligence', description: 'Understanding emotions', matchLevel: 75 }
      ];
      const mockResponse = createMockApiResponse(mockFocusAreas);
      
      mockApiCall(mockResponse);

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useGetFocusAreas(), {
        wrapper: createWrapper(),
      });

      // Wait for the query to complete using waitFor
      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      // Verify apiClient was called with correct params
      expect(mockApiClient.call).toHaveBeenCalledWith(
        expect.any(Function),
        '/focus-areas',
        'GET',
        undefined
      );
      
      // Check the result is now available
      expect(result.current.data).toEqual(mockResponse);
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      const errorMessage = 'Failed to fetch focus areas';
      mockApiError(new Error(errorMessage));

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useGetFocusAreas(), {
        wrapper: createWrapper(),
      });

      // Wait for the query to complete with error
      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });
      
      expect(result.current.error).toBeDefined();
    });
  });
  
  describe('useRecommendFocusAreas', () => {
    it('should call the API with the correct parameters', async () => {
      // Mock successful API response
      const mockRecommendations = [
        { id: 'focus1', name: 'Creative Thinking', description: 'Creative problem solving', matchLevel: 85 },
        { id: 'focus2', name: 'Emotional Intelligence', description: 'Understanding emotions', matchLevel: 75 }
      ];
      const mockResponse = createMockApiResponse(mockRecommendations);
      
      mockApiCall(mockResponse);

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useRecommendFocusAreas(), {
        wrapper: createWrapper(),
      });

      // Execute the mutation
      const mockTraits = [
        { id: 'trait1', name: 'Creativity', description: 'Creative thinking', value: 80 },
        { id: 'trait2', name: 'Empathy', description: 'Understanding others', value: 75 }
      ];
      
      const mutationResult = await result.current.mutateAsync({ traits: mockTraits });

      // Verify apiClient was called with correct params
      expect(mockApiClient.call).toHaveBeenCalledWith(
        expect.any(Function),
        '/focus-areas/recommend',
        'POST',
        { traits: mockTraits }
      );
      
      // Check the result is now available
      expect(mutationResult).toEqual(mockResponse);
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      const errorMessage = 'Failed to fetch recommendations';
      mockApiError(new Error(errorMessage));

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useRecommendFocusAreas(), {
        wrapper: createWrapper(),
      });

      // Try to execute the mutation but expect it to fail
      try {
        await result.current.mutateAsync({ traits: [] });
        // If we get here, the test should fail because we expected an error
        throw new Error('Expected mutation to fail but it succeeded');
      } catch (error) {
        expect(error.message).toContain('Failed to fetch recommendations');
      }
    });
  });
  
  describe('useSaveFocusAreaSelection', () => {
    it('should call the API with the correct parameters', async () => {
      // Mock successful API response
      const mockResponse = createMockApiResponse({ success: true });
      
      mockApiCall(mockResponse);

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useSaveFocusAreaSelection(), {
        wrapper: createWrapper(),
      });

      // Execute the mutation
      const mockData = { userEmail: 'test@example.com', focusAreaId: 'focus1' };
      const mutationResult = await result.current.mutateAsync(mockData);

      // Verify apiClient was called with correct params
      expect(mockApiClient.call).toHaveBeenCalledWith(
        expect.any(Function),
        '/focus-areas/select',
        'POST',
        mockData
      );
      
      // Check the result is now available
      expect(mutationResult).toEqual(mockResponse);
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      const errorMessage = 'Failed to save focus area selection';
      mockApiError(new Error(errorMessage));

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useSaveFocusAreaSelection(), {
        wrapper: createWrapper(),
      });

      // Try to execute the mutation but expect it to fail
      try {
        await result.current.mutateAsync({ userEmail: 'test@example.com', focusAreaId: 'focus1' });
        // If we get here, the test should fail because we expected an error
        throw new Error('Expected mutation to fail but it succeeded');
      } catch (error) {
        expect(error.message).toContain('Failed to save focus area selection');
      }
    });
  });
});
