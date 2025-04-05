/**
 * Auth Service
 * 
 * Provides hooks for authentication and user management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
import { z } from 'zod';

// Auth keys for React Query
const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  user: (userId?: string) => [...authKeys.all, 'user', userId] as const,
};

// Auth schemas
const AuthSessionSchema = z.object({
  userId: z.string(),
  token: z.string(),
  expiresAt: z.string(),
});

const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['user', 'admin']).default('user'),
  createdAt: z.string(),
  lastLoginAt: z.string().optional(),
});

type AuthSession = z.infer<typeof AuthSessionSchema>;
type AuthUser = z.infer<typeof AuthUserSchema>;

/**
 * Hook to login user
 */
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      email, 
      password 
    }: { 
      email: string; 
      password: string; 
    }): Promise<ApiResponse<AuthSession>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockSession: AuthSession = {
        userId: 'user_' + Math.random().toString(36).substring(7),
        token: 'mock_token_' + Math.random().toString(36).substring(7),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      };
      
      return {
        success: true,
        status: 200,
        data: mockSession,
      };
    },
    onSuccess: (response) => {
      // Update session in cache
      queryClient.setQueryData(authKeys.session(), response);
      // Invalidate user queries
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
};

/**
 * Hook to register new user
 */
export const useRegister = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      email, 
      password, 
      name 
    }: { 
      email: string; 
      password: string; 
      name?: string; 
    }): Promise<ApiResponse<AuthUser>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: AuthUser = {
        id: 'user_' + Math.random().toString(36).substring(7),
        email,
        name,
        role: 'user',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      
      return {
        success: true,
        status: 201,
        data: mockUser,
      };
    },
    onSuccess: (response) => {
      // Update user in cache
      if (response.data) {
        queryClient.setQueryData(
          authKeys.user(response.data.id),
          response
        );
      }
    },
  });
};

/**
 * Hook to logout user
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<ApiResponse<void>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        status: 200,
      };
    },
    onSuccess: () => {
      // Clear auth-related cache
      queryClient.removeQueries({ queryKey: authKeys.all });
    },
  });
};

/**
 * Hook to get current session
 */
export const useSession = (enabled: boolean = true) => {
  return useQuery({
    queryKey: authKeys.session(),
    queryFn: async (): Promise<ApiResponse<AuthSession>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        success: true,
        status: 200,
        data: {
          userId: 'mock_user_id',
          token: 'mock_session_token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      };
    },
    enabled,
  });
};

/**
 * Hook to get user details
 */
export const useUser = (userId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: authKeys.user(userId),
    queryFn: async (): Promise<ApiResponse<AuthUser>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 400));
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      return {
        success: true,
        status: 200,
        data: {
          id: userId,
          email: `user_${userId}@example.com`,
          name: `User ${userId}`,
          role: 'user',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        },
      };
    },
    enabled: enabled && !!userId,
  });
}; 