/**
 * Tests for challenge service
 * Using @ts-expect-error comments to suppress TypeScript errors related to Jest expectations
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGenerateChallenge, useSubmitResponse, useGetAIResponse } from '../challengeService';
import apiClient from '../../apiClient';
import { createMockApiResponse } from '@/tests/testUtils';

// Mock the apiClient module
jest.mock('../../apiClient', () => ({
  call: jest.fn(),
}));

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
  
  // Add display name to the wrapper component to fix lint warning
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  
  return TestWrapper;
};

describe('challengeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('useGenerateChallenge', () => {
    it('should call the API with the correct parameters', async () => {
      // Mock successful API response
      const mockChallenge = {
        id: 'challenge-123',
        text: 'Describe a creative solution to climate change',
        round: 1,
        type: 'openEnded'
      };
      const mockResponse = createMockApiResponse(mockChallenge);
      
      // @ts-expect-error - We're mocking the implementation
      apiClient.call.mockResolvedValueOnce(mockResponse);

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useGenerateChallenge(), {
        wrapper: createWrapper(),
      });

      // Execute the mutation
      const mockData = {
        userEmail: 'test@example.com',
        focusAreaId: 'focus-1',
        focusArea: 'Creative Thinking',
        traits: [
          { id: 'trait1', name: 'Creativity', description: 'Creative thinking', value: 80 }
        ],
        round: 1,
        challengeType: 'openEnded',
        formatType: 'text',
        difficulty: 'medium'
      };
      
      const mutationResult = await result.current.mutateAsync(mockData);

      // Verify apiClient was called with correct params
      // @ts-expect-error - Jest expectation types
      expect(apiClient.call).toHaveBeenCalledWith(
        // @ts-expect-error - Jest expectation types
        expect.any(Function),
        '/challenges/generate',
        'POST',
        mockData
      );
      
      // @ts-expect-error - Jest expectation types
      expect(mutationResult).toEqual(mockResponse);
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      const errorMessage = 'Failed to generate challenge';
      // @ts-expect-error - We're mocking the implementation
      apiClient.call.mockRejectedValueOnce(new Error(errorMessage));

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useGenerateChallenge(), {
        wrapper: createWrapper(),
      });

      // Try to execute the mutation but expect it to fail
      const mockData = { 
        userEmail: 'test@example.com', 
        focusArea: 'Creative Thinking',
        round: 1
      };
      
      try {
        await result.current.mutateAsync(mockData);
        // If we get here, the test should fail because we expected an error
        throw new Error('Expected mutation to fail but it succeeded');
      } catch (error) {
        // @ts-expect-error - Jest expectation types
        expect(error.message).toContain('Failed to generate challenge');
      }
    });
  });
  
  describe('useSubmitResponse', () => {
    it('should call the API with the correct parameters', async () => {
      // Mock successful API response
      const mockResponse = createMockApiResponse({ 
        id: 'response-123',
        status: 'submitted',
        createdAt: '2023-01-01T00:00:00Z'
      });
      
      // @ts-expect-error - We're mocking the implementation
      apiClient.call.mockResolvedValueOnce(mockResponse);

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useSubmitResponse(), {
        wrapper: createWrapper(),
      });

      // Execute the mutation
      const mockData = {
        userEmail: 'test@example.com',
        challengeId: 'challenge-123',
        response: 'This is my response to the challenge.',
        round: 1
      };
      
      const mutationResult = await result.current.mutateAsync(mockData);

      // Verify apiClient was called with correct params
      // @ts-expect-error - Jest expectation types
      expect(apiClient.call).toHaveBeenCalledWith(
        // @ts-expect-error - Jest expectation types
        expect.any(Function),
        `/challenges/${mockData.challengeId}/responses`,
        'POST',
        mockData
      );
      
      // @ts-expect-error - Jest expectation types
      expect(mutationResult).toEqual(mockResponse);
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      const errorMessage = 'Failed to submit response';
      // @ts-expect-error - We're mocking the implementation
      apiClient.call.mockRejectedValueOnce(new Error(errorMessage));

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useSubmitResponse(), {
        wrapper: createWrapper(),
      });

      // Try to execute the mutation but expect it to fail
      const mockData = { 
        userEmail: 'test@example.com',
        challengeId: 'challenge-123',
        response: 'This is my response',
        round: 1
      };
      
      try {
        await result.current.mutateAsync(mockData);
        // If we get here, the test should fail because we expected an error
        throw new Error('Expected mutation to fail but it succeeded');
      } catch (error) {
        // @ts-expect-error - Jest expectation types
        expect(error.message).toContain('Failed to submit response');
      }
    });
  });
  
  describe('useGetAIResponse', () => {
    it('should call the API with the correct parameters when enabled', async () => {
      // Mock successful API response
      const mockAIResponse = {
        id: 'ai-response-123',
        text: 'This is the AI response to the challenge',
        analysis: 'Analysis of the challenge and response',
        createdAt: '2023-01-01T00:00:00Z'
      };
      const mockResponse = createMockApiResponse(mockAIResponse);
      
      // @ts-expect-error - We're mocking the implementation
      apiClient.call.mockResolvedValue(mockResponse);

      // Render the hook with our standardized wrapper
      const challengeId = 'challenge-123';
      const round = 1;
      const { result } = renderHook(() => useGetAIResponse(challengeId, round, true), {
        wrapper: createWrapper(),
      });

      // Wait for the query to complete using waitFor
      await waitFor(() => {
        // @ts-expect-error - Jest expectation types
        expect(result.current.status).toBe('success');
      });

      // Verify apiClient was called with correct params
      // @ts-expect-error - Jest expectation types
      expect(apiClient.call).toHaveBeenCalledWith(
        // @ts-expect-error - Jest expectation types
        expect.any(Function),
        `/challenges/${challengeId}/ai-response`,
        'GET',
        { challengeId, round }
      );
      
      // @ts-expect-error - Jest expectation types
      expect(result.current.data).toEqual(mockResponse);
    });
    
    it('should not call API when disabled', async () => {
      // Render the hook with our standardized wrapper but disabled
      const challengeId = 'challenge-123';
      const round = 1;
      const { result } = renderHook(() => useGetAIResponse(challengeId, round, false), {
        wrapper: createWrapper(),
      });

      // Wait for any potential queries to complete
      await waitFor(() => {
        // @ts-expect-error - Jest expectation types
        expect(result.current.fetchStatus).toBe('idle');
      });

      // Verify apiClient was not called
      // @ts-expect-error - Jest expectation types
      expect(apiClient.call).not.toHaveBeenCalled();
    });
    
    it('should not call API when challengeId is empty', async () => {
      // Render the hook with our standardized wrapper but empty challengeId
      const { result } = renderHook(() => useGetAIResponse('', 1, true), {
        wrapper: createWrapper(),
      });

      // Wait for any potential queries to complete
      await waitFor(() => {
        // @ts-expect-error - Jest expectation types
        expect(result.current.fetchStatus).toBe('idle');
      });

      // Verify apiClient was not called
      // @ts-expect-error - Jest expectation types
      expect(apiClient.call).not.toHaveBeenCalled();
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      const errorMessage = 'Failed to fetch AI response';
      // @ts-expect-error - We're mocking the implementation
      apiClient.call.mockRejectedValue(new Error(errorMessage));

      // Render the hook with our standardized wrapper
      const challengeId = 'challenge-123';
      const round = 1;
      const { result } = renderHook(() => useGetAIResponse(challengeId, round, true), {
        wrapper: createWrapper(),
      });

      // Wait for the query to complete with error
      await waitFor(() => {
        // @ts-expect-error - Jest expectation types
        expect(result.current.status).toBe('error');
      });
      
      // @ts-expect-error - Jest expectation types
      expect(result.current.error).toBeDefined();
    });
  });
});
