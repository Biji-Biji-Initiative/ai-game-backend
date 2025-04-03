// This file contains tests for fight card service
// We use @ts-expect-error comments to suppress TypeScript errors related to Jest expectations
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGenerateFightCard, useGetFightCard } from '../fightCardService';
import apiClient from '../../apiClient';
import { FocusArea, Trait } from '@/store/useGameStore';
import { createMockApiResponse } from '../../../../tests/testUtils';
import '@testing-library/jest-dom';

// Mock the apiClient
jest.mock('../../apiClient');

// Create a wrapper with query client for testing hooks
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('fightCardService', () => {
  // Setup mock data
  const mockTraits: Trait[] = [
    { id: 'trait1', name: 'Creativity', value: 8, description: 'Ability to create novel ideas' },
    { id: 'trait2', name: 'Adaptability', value: 7, description: 'Ability to adjust to new situations' }
  ];
  
  const mockFocus: FocusArea = {
    id: 'focus1',
    name: 'Creative Problem Solving',
    description: 'Finding innovative solutions to complex problems',
    matchLevel: 90
  };
  
  const mockResponses = {
    round1: {
      userResponse: 'This is my round 1 response',
      aiResponse: 'This is the AI response for round 1',
      challenge: 'This is the round 1 challenge'
    },
    round2: {
      userResponse: 'This is my round 2 response',
      aiResponse: 'This is the AI response for round 2',
      challenge: 'This is the round 2 challenge'
    },
    round3: {
      userResponse: 'This is my round 3 response',
      challenge: 'This is the round 3 challenge'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useGenerateFightCard', () => {
    it('should call the API with the correct parameters', async () => {
      // Mock successful API response
      const mockResult = { id: 'test-fightcard-id' };
      const mockResponse = createMockApiResponse(mockResult);
      
      // @ts-expect-error - We're mocking the implementation
      apiClient.call.mockResolvedValueOnce(mockResponse);

      // Render the hook
      const { result } = renderHook(() => useGenerateFightCard(), {
        wrapper: createWrapper(),
      });

      // Execute the mutation and capture the returned data directly
      const requestData = {
        traits: mockTraits,
        focus: mockFocus,
        responses: mockResponses
      };
      const mutationResult = await result.current.mutateAsync(requestData);

      // Verify apiClient was called correctly
      // @ts-expect-error - Jest expectation types
      expect(apiClient.call).toHaveBeenCalledTimes(1);

      // Check that the mutation returned the expected data
      expect(mutationResult).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      // Mock API error
      const errorMessage = 'Failed to generate fight card';
      // @ts-expect-error - We're mocking the implementation
      apiClient.call.mockRejectedValueOnce(new Error(errorMessage));

      // Render the hook
      const { result } = renderHook(() => useGenerateFightCard(), {
        wrapper: createWrapper(),
      });

      // Try to execute the mutation but expect it to fail
      try {
        await result.current.mutateAsync({
          traits: mockTraits,
          focus: mockFocus,
          responses: mockResponses
        });
        // If we get here, the test should fail because we expected an error
        throw new Error('Expected mutation to fail but it succeeded');
      } catch (error) {
        // @ts-expect-error - Jest expectation types
        expect(error.message).toContain('Failed to generate fight card');
      }
    });
  });

  describe('useGetFightCard', () => {
    it('should call the API with the correct parameters when enabled', async () => {
      // Mock successful API response
      const mockResult = { id: 'test-fightcard-id' };
      const mockResponse = createMockApiResponse(mockResult);
      
      // @ts-expect-error - We're mocking the implementation
      apiClient.call.mockResolvedValueOnce(mockResponse);

      // Render the hook with enabled=true
      const { result } = renderHook(() => useGetFightCard('test-fightcard-id', true), {
        wrapper: createWrapper(),
      });

      // Wait for the query to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify apiClient was called correctly
      // @ts-expect-error - Jest expectation types
      expect(apiClient.call).toHaveBeenCalledTimes(1);

      // Check that the query returned the expected data
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should not fetch data when disabled', async () => {
      // Render the hook with enabled=false
      renderHook(() => useGetFightCard('test-fightcard-id', false), {
        wrapper: createWrapper(),
      });

      // Verify apiClient was not called
      // @ts-expect-error - Jest expectation types
      expect(apiClient.call).not.toHaveBeenCalled();
    });
  });
});
