/**
 * User Service
 * 
 * Provides hooks for user profile operations.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
import { UIUser } from '../../../types/api';
import { schemas } from '@/lib/api/generated-zodios-client';
import { z } from 'zod';

// Define types from schemas
export type UserSchema = z.infer<typeof schemas.User>;

// Define UserPreferences type
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  animationsEnabled: boolean;
  notifications: {
    email: boolean;
    browser: boolean;
  };
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  preferredDifficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

// User keys for React Query
const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  profile: (id: string) => [...userKeys.all, 'profile', id] as const,
};

// Mock user for development
const mockUser: UIUser = {
  id: 'mock-user-1',
  email: 'john@example.com',
  fullName: 'John Doe',
  displayName: 'John D.',
  professionalTitle: 'Software Developer',
  location: 'San Francisco, CA',
  bio: 'Software developer with a passion for AI',
  avatarUrl: 'https://example.com/avatar.jpg',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
  status: 'active',
  roles: ['user'],
  onboardingCompleted: true,
  preferences: {
    theme: 'system',
    fontSize: 'medium',
    animationsEnabled: true,
    notifications: {
      email: true,
      browser: true
    },
    learningStyle: 'visual',
    preferredDifficulty: 'intermediate'
  }
};

// Define request schema for profile updates
const UpdateProfileRequestSchema = z.object({
  fullName: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});
type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

/**
 * Hook for getting a user profile
 */
export const useGetUserProfile = (userId: string) => {
  return useQuery({
    queryKey: userKeys.profile(userId),
    queryFn: async (): Promise<ApiResponse<UIUser>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        status: 200,
        data: {
          ...mockUser,
          id: userId,
        },
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
  });
};

/**
 * Hook for updating a user profile
 */
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateProfileRequest }): Promise<ApiResponse<UIUser>> => {
      // Validate input with schema
      UpdateProfileRequestSchema.parse(data);
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 700));
      
      const updatedUser: UIUser = {
        ...mockUser,
        id: userId,
        fullName: data.fullName || mockUser.fullName,
        bio: data.bio || mockUser.bio,
        avatarUrl: data.avatarUrl || mockUser.avatarUrl,
        lastLoginAt: new Date().toISOString(),
      };
      
      return {
        success: true,
        status: 200,
        data: updatedUser,
      };
    },
    onSuccess: (response, variables) => {
      // Update cache
      queryClient.setQueryData(userKeys.profile(variables.userId), response);
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
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
  return useQuery<ApiResponse<UIUser>, Error>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Mock implementation - Return current user data
      // In the future, this will be replaced with a real API call:
      // const response = await apiClient.get('/users/me');
      
      return {
        success: true,
        status: 200,
        data: mockUser,
        error: undefined
      };
    },
    enabled,
  });
};

/**
 * Hook for deleting a user account
 * 
 * @returns Mutation for deleting user account
 */
export const useDeleteUserAccount = () => {
  return useMutation<ApiResponse<void>, Error, string>({
    mutationFn: async (userId: string): Promise<ApiResponse<void>> => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Deleting user account:', userId);
      
      // Mock successful response
      return {
        success: true,
        status: 200,
        data: undefined,
        error: undefined
      };
      
      // In the future, this will be replaced with a real API call:
      // return apiClient.delete<void>(`/users/${userId}`);
    },
  });
};

/**
 * Hook for getting user preferences
 * UI-specific preferences that are not part of the API
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

      // In a real implementation, we would get the user and extract preferences
      // For mock purposes, we're returning hardcoded preferences
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
          preferredDifficulty: 'intermediate'
        }
      };
    },
    enabled: enabled && !!userId,
  });
};

/**
 * Hook for updating user preferences
 * UI-specific preferences that are not part of the API
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
