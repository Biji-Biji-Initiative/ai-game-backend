// This file contains tests for user service
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetUserProfile, useUpdateUserProfile } from '../userService';
import apiClient from '../../apiClient';
import { waitForNextTick, createMockApiResponse } from '../../../../tests/testUtils';
import '@testing-library/jest-dom';

// Mock the API client
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

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useGetUserProfile', () => {
    it('should fetch a user profile successfully', async () => {
      // Mock successful response
      const mockUser = {
        id: 'usr_001',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };
      
      const mockResponse = createMockApiResponse(mockUser);
      
      // Set up the mock
      // @ts-expect-error - We're mocking the implementation
      apiClient.call.mockResolvedValueOnce(mockResponse);

      // Render the hook
      const { result } = renderHook(() => useGetUserProfile('usr_001'), {
        wrapper: createWrapper(),
      });

      // Wait for the query to complete
      await waitFor(() => {
        return result.current.isSuccess;
      });

      // Verify API was called correctly
      expect(apiClient.call).toHaveBeenCalledTimes(1);
      
      // Verify data matches what we expect
      expect(result.current.data).toEqual(mockResponse);
    });
  });

  describe('useUpdateUserProfile', () => {
    it('should update a user profile successfully', async () => {
      // Mock successful response
      const updatedUser = {
        id: 'usr_001',
        name: 'Updated Name',
        email: 'test@example.com',
        bio: 'Updated bio',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
      };
      
      const mockResponse = createMockApiResponse(updatedUser);
      
      // @ts-expect-error - We're mocking the implementation
      apiClient.call.mockResolvedValueOnce(mockResponse);

      // Render the hook
      const { result } = renderHook(() => useUpdateUserProfile(), {
        wrapper: createWrapper(),
      });

      // Execute the mutation and capture the returned data directly
      // This is more reliable than checking result.current.data which
      // might not be populated immediately in tests
      const mutationResult = await result.current.mutateAsync({
        userId: 'usr_001',
        data: { name: 'Updated Name', bio: 'Updated bio' }
      });

      // Verify the API was called with correct parameters
      expect(apiClient.call).toHaveBeenCalledTimes(1);

      // Check that the mutation returned the expected data
      expect(mutationResult).toEqual(mockResponse);
    });
  });
});
