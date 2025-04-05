/**
 * Tests for profile service
 * Using @ts-expect-error comments to suppress TypeScript errors related to Jest expectations
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGenerateProfile, useGetSharedProfile } from '../profileService';
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

describe('profileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('useGenerateProfile', () => {
    it('should call the API with the correct parameters', async () => {
      // Mock successful API response
      const mockProfile = {
        id: 'profile-123',
        traits: [
          { id: 'trait1', name: 'Creativity', description: 'Creative thinking', value: 80 }
        ],
        focus: {
          id: 'focus1',
          name: 'Creative Thinking',
          description: 'Creative problem solving',
          matchLevel: 85
        },
        strengths: ['Innovative thinking', 'Novel solutions'],
        insights: 'You excel at coming up with unique solutions',
        recommendations: ['Focus on creative tasks', 'Leverage your imagination'],
        createdAt: '2023-01-01T00:00:00Z'
      };
      const mockResponse = createMockApiResponse(mockProfile);
      
      // @ts-expect-error - We're mocking the implementation
      apiClient.call.mockResolvedValueOnce(mockResponse);

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useGenerateProfile(), {
        wrapper: createWrapper(),
      });

      // Execute the mutation
      const mockData = {
        userEmail: 'test@example.com',
        sessionId: 'session-123',
        traits: [
          { id: 'trait1', name: 'Creativity', description: 'Creative thinking', value: 80 }
        ],
        focus: {
          id: 'focus1',
          name: 'Creative Thinking',
          description: 'Creative problem solving',
          matchLevel: 85
        },
        responses: {
          round1: { userResponse: 'response1', aiResponse: 'ai-response1', challenge: 'challenge1' },
          round2: { userResponse: 'response2', aiResponse: 'ai-response2', challenge: 'challenge2' },
          round3: { userResponse: 'response3', aiResponse: 'ai-response3', challenge: 'challenge3' }
        }
      };
      
      const mutationResult = await result.current.mutateAsync(mockData);

      // Verify apiClient was called with correct params
      // @ts-expect-error - Jest expectation types
      expect(apiClient.call).toHaveBeenCalledWith(
        // @ts-expect-error - Jest expectation types
        expect.any(Function),
        '/profiles/generate',
        'POST',
        mockData
      );
      
      // @ts-expect-error - Jest expectation types
      expect(mutationResult).toEqual(mockResponse);
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      const errorMessage = 'Failed to generate profile';
      // @ts-expect-error - We're mocking the implementation
      apiClient.call.mockRejectedValueOnce(new Error(errorMessage));

      // Render the hook with our standardized wrapper
      const { result } = renderHook(() => useGenerateProfile(), {
        wrapper: createWrapper(),
      });

      // Try to execute the mutation but expect it to fail
      const mockData = {
        userEmail: 'test@example.com',
        sessionId: 'session-123',
        traits: [{ id: 'trait1', name: 'Creativity', description: 'Creative thinking', value: 80 }],
        focus: { id: 'focus1', name: 'Creative Thinking', description: 'Creative problem solving', matchLevel: 85 },
        responses: {}
      };
      
      try {
        await result.current.mutateAsync(mockData);
        // If we get here, the test should fail because we expected an error
        throw new Error('Expected mutation to fail but it succeeded');
      } catch (error) {
        // @ts-expect-error - Jest expectation types
        expect(error.message).toContain('Failed to generate profile');
      }
    });
  });
  
  describe('useGetSharedProfile', () => {
    it('should call the API with the correct parameters', async () => {
      // Mock successful API response
      const mockProfile = {
        id: 'profile-123',
        traits: [
          { id: 'trait1', name: 'Creativity', description: 'Creative thinking', value: 80 }
        ],
        focus: {
          id: 'focus1',
          name: 'Creative Thinking',
          description: 'Creative problem solving',
          matchLevel: 85
        },
        strengths: ['Innovative thinking', 'Novel solutions'],
        insights: 'You excel at coming up with unique solutions',
        recommendations: ['Focus on creative tasks', 'Leverage your imagination'],
        createdAt: '2023-01-01T00:00:00Z'
      };
      const mockResponse = createMockApiResponse(mockProfile);
      
      // @ts-expect-error - We're mocking the implementation
      apiClient.call.mockResolvedValue(mockResponse);

      // Render the hook with our standardized wrapper
      const profileId = 'profile-123';
      const { result } = renderHook(() => useGetSharedProfile(profileId), {
        wrapper: createWrapper(),
      });

      // Wait for the query to complete using waitFor
      await waitFor(() => {
        // @ts-expect-error - Jest expectation types
        expect(result.current.status).toBe('success');
      });

      // Verify apiClient was called with correct params - including profileId as fourth parameter
      // @ts-expect-error - Jest expectation types
      expect(apiClient.call).toHaveBeenCalledWith(
        // @ts-expect-error - Jest expectation types
        expect.any(Function),
        `/profiles/${profileId}`,
        'GET',
        profileId
      );
      
      // @ts-expect-error - Jest expectation types
      expect(result.current.data).toEqual(mockResponse);
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      const errorMessage = 'Failed to fetch profile';
      // @ts-expect-error - We're mocking the implementation
      apiClient.call.mockRejectedValue(new Error(errorMessage));

      // Render the hook with our standardized wrapper
      const profileId = 'profile-123';
      const { result } = renderHook(() => useGetSharedProfile(profileId), {
        wrapper: createWrapper(),
      });

      // Wait for the query to complete with error using waitFor
      await waitFor(() => {
        // @ts-expect-error - Jest expectation types
        expect(result.current.status).toBe('error');
      });
      
      // @ts-expect-error - Jest expectation types
      expect(result.current.error).toBeDefined();
    });
  });
});
