/**
 * User Service
 * 
 * Provides hooks for user profile operations.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { ApiResponse } from '../apiResponse';

// Types
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
  preferences?: UserPreferences;
}

export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  fontSize?: 'small' | 'medium' | 'large';
  animationsEnabled?: boolean;
  notifications?: {
    email?: boolean;
    browser?: boolean;
  };
  learningStyle?: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
  preferredDifficulty?: 'Easy' | 'Medium' | 'Hard';
}

/**
 * Hook for getting a user profile by ID
 * 
 * @param userId The ID of the user to retrieve
 * @param enabled Whether the query should execute automatically
 * @returns Query result with user profile data
 */
export const useGetUserProfile = (userId: string, enabled: boolean = true) => {
  return useQuery<ApiResponse<UserProfile>, Error>({
    queryKey: ['user', userId],
    queryFn: () => apiClient.get<UserProfile>(`/users/${userId}`),
    enabled,
  });
};

/**
 * Hook for updating a user profile
 * 
 * @returns Mutation for updating user profile
 */
export const useUpdateUserProfile = () => {
  return useMutation<ApiResponse<UserProfile>, Error, { userId: string; data: UpdateProfileRequest }>({
    mutationFn: ({ userId, data }) => 
      apiClient.put<UserProfile, UpdateProfileRequest>(`/users/${userId}`, data),
    onSuccess: (data) => {
      // Invalidate and refetch the user profile after updating
      // This would use a queryClient.invalidateQueries if we were using a QueryClient provider
      console.log('Profile updated successfully:', data);
    },
  });
};

/**
 * Hook for getting the current user's profile (authenticated user)
 * 
 * @param enabled Whether the query should execute automatically
 * @returns Query result with current user profile data
 */
export const useGetCurrentUserProfile = (enabled: boolean = true) => {
  return useQuery<ApiResponse<UserProfile>, Error>({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.get<UserProfile>('/users/me'),
    enabled,
  });
};

/**
 * Hook for deleting a user account
 * 
 * @returns Mutation for deleting a user account
 */
export const useDeleteUserAccount = () => {
  return useMutation<ApiResponse<void>, Error, string>({
    mutationFn: (userId: string) => 
      apiClient.delete<void>(`/users/${userId}`),
  });
};

/**
 * Hook for getting user preferences
 * 
 * @param userId The ID of the user to retrieve preferences for
 * @param enabled Whether the query should execute automatically
 * @returns Query result with user preferences data
 */
export const useGetUserPreferences = (userId?: string, enabled: boolean = true) => {
  return useQuery<ApiResponse<UserPreferences>, Error>({
    queryKey: ['userPreferences', userId],
    queryFn: async (): Promise<ApiResponse<UserPreferences>> => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock user preferences
      return {
        success: true,
        status: 200,
        data: {
          theme: 'system',
          fontSize: 'medium',
          animationsEnabled: true,
          notifications: {
            email: true,
            browser: true
          },
          learningStyle: 'visual',
          preferredDifficulty: 'Medium'
        }
      };
    },
    enabled: enabled && !!userId,
  });
};

/**
 * Hook for updating user preferences
 * 
 * @returns Mutation for updating user preferences
 */
export const useUpdateUserPreferences = () => {
  return useMutation<ApiResponse<UserPreferences>, Error, UserPreferences>({
    mutationFn: async (preferences): Promise<ApiResponse<UserPreferences>> => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Updating user preferences:', preferences);

      // Mock successful response
      return {
        success: true,
        status: 200,
        data: {
          ...preferences
        }
      };
    }
  });
};
