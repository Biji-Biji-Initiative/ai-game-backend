/**
 * Authentication Service
 * 
 * Provides hooks for user authentication operations.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { ApiResponse } from '../apiResponse';
import { UserProfile } from './userService';

// Types
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  photoUrl?: string;
  provider: 'google' | 'email' | 'guest';
  token: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Hook for authenticating with Google
 * @returns Mutation for Google authentication
 */
export const useGoogleAuth = () => {
  return useMutation<ApiResponse<LoginResponse>, Error>({
    mutationFn: async () => {
      // In a real implementation, this would redirect to Google OAuth
      // For now, we'll simulate a successful login with mock data
      console.log('Simulating Google authentication');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        data: {
          user: {
            id: 'google-user-123',
            email: 'user@example.com',
            name: 'Example User',
            photoUrl: 'https://placekitten.com/100/100',
            provider: 'google',
            token: 'mock-google-auth-token'
          },
          token: 'mock-jwt-token'
        },
        message: 'Successfully authenticated with Google',
        statusCode: 200
      };
    },
  });
};

/**
 * Hook for creating an account with email and password
 * @returns Mutation for email signup
 */
export const useEmailSignup = () => {
  return useMutation<ApiResponse<LoginResponse>, Error, SignupRequest>({
    mutationFn: async (credentials) => {
      // In a real implementation, this would call the API
      console.log('Simulating email signup with:', credentials);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        success: true,
        data: {
          user: {
            id: `email-user-${Math.floor(Math.random() * 1000)}`,
            email: credentials.email,
            name: credentials.name,
            provider: 'email',
            token: 'mock-email-auth-token'
          },
          token: 'mock-jwt-token'
        },
        message: 'Account created successfully',
        statusCode: 201
      };
    },
  });
};

/**
 * Hook for logging in with email and password
 * @returns Mutation for email login
 */
export const useEmailLogin = () => {
  return useMutation<ApiResponse<LoginResponse>, Error, LoginRequest>({
    mutationFn: async (credentials) => {
      // In a real implementation, this would call the API
      console.log('Simulating email login with:', credentials);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      return {
        success: true,
        data: {
          user: {
            id: `email-user-${Math.floor(Math.random() * 1000)}`,
            email: credentials.email,
            name: 'User', // In real implementation, this would come from the backend
            provider: 'email',
            token: 'mock-email-auth-token'
          },
          token: 'mock-jwt-token'
        },
        message: 'Login successful',
        statusCode: 200
      };
    },
  });
};

/**
 * Hook for logging out the current user
 * @returns Mutation for logout
 */
export const useLogout = () => {
  return useMutation<ApiResponse<void>, Error>({
    mutationFn: async () => {
      // In a real implementation, this would call the API
      console.log('Simulating logout');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        success: true,
        data: undefined,
        message: 'Logged out successfully',
        statusCode: 200
      };
    },
  });
};

/**
 * Hook to check if the user is authenticated
 * @returns Query result with authentication status
 */
export const useAuthStatus = () => {
  return useQuery<ApiResponse<{ isAuthenticated: boolean; user?: AuthUser }>, Error>({
    queryKey: ['auth', 'status'],
    queryFn: async () => {
      // In a real implementation, this would validate the token with the API
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        return {
          success: true,
          data: { isAuthenticated: false },
          message: 'Not authenticated',
          statusCode: 200
        };
      }
      
      // Mock authenticated response
      return {
        success: true,
        data: {
          isAuthenticated: true,
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'Example User',
            provider: 'google',
            token
          }
        },
        message: 'Authenticated',
        statusCode: 200
      };
    },
    // Don't refetch on window focus for this example
    refetchOnWindowFocus: false,
  });
}; 