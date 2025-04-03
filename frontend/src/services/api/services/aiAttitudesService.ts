/**
 * AI Attitudes Service
 * 
 * Provides React Query hooks for AI attitudes-related API operations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { ApiResponse } from '../apiResponse';
import { AiAttitude } from '@/store/useGameStore';

// Query keys for caching
export const aiAttitudesKeys = {
  all: ['ai-attitudes'] as const,
  list: () => [...aiAttitudesKeys.all, 'list'] as const,
  user: (userId: string) => [...aiAttitudesKeys.all, 'user', userId] as const,
};

/**
 * Hook to save a user's AI attitude
 */
interface SaveAiAttitudeRequest {
  userId: string;
  attitude: AiAttitude;
}

export const useSaveAiAttitude = () => {
  const queryClient = useQueryClient();
  
  return useMutation<ApiResponse<AiAttitude>, Error, SaveAiAttitudeRequest>({
    mutationFn: ({ userId, attitude }) => {
      // For development, we'll continue using the mock implementation
      // but structure it to match the new apiClient pattern
      console.log(`Saving attitude for user ${userId}:`, attitude);
      
      // In a real implementation, this would be:
      // return apiClient.post<AiAttitude, SaveAiAttitudeRequest>(`/users/${userId}/ai-attitudes`, { userId, attitude });
      
      // Mock implementation
      return new Promise<ApiResponse<AiAttitude>>((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            status: 200,
            data: attitude,
            error: undefined
          });
        }, 500);
      });
    },
    onSuccess: (data, variables) => {
      // Update cache with the new attitude
      queryClient.invalidateQueries({ queryKey: aiAttitudesKeys.user(variables.userId) });
    },
  });
};

/**
 * Hook to save multiple AI attitudes at once
 */
interface SaveAiAttitudesRequest {
  userId: string;
  attitudes: AiAttitude[];
}

export const useSaveAiAttitudes = () => {
  const queryClient = useQueryClient();
  
  return useMutation<ApiResponse<AiAttitude[]>, Error, SaveAiAttitudesRequest>({
    mutationFn: ({ userId, attitudes }) => {
      // For development, we'll continue using the mock implementation
      // but structure it to match the new apiClient pattern
      console.log(`Saving ${attitudes.length} attitudes for user ${userId}`);
      
      // In a real implementation, this would be:
      // return apiClient.post<AiAttitude[], SaveAiAttitudesRequest>(`/users/${userId}/ai-attitudes/batch`, { userId, attitudes });
      
      // Mock implementation
      return new Promise<ApiResponse<AiAttitude[]>>((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            status: 200,
            data: attitudes,
            error: undefined
          });
        }, 500);
      });
    },
    onSuccess: (data, variables) => {
      // Update cache with the new attitudes
      queryClient.invalidateQueries({ queryKey: aiAttitudesKeys.user(variables.userId) });
    },
  });
};

/**
 * Hook to get a user's AI attitudes
 */
export const useGetAiAttitudes = (userId: string) => {
  // In a real implementation, we would use the userId to fetch data
  console.log(`Fetching attitudes for user ${userId}`);
  return {
    isLoading: false,
    error: null,
    data: {
      success: true,
      data: [] // Mock empty data
    }
  };
};
