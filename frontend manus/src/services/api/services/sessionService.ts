/**
 * Session Service
 * 
 * Provides React Query hooks for session-related API operations
 */

import { useMutation } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
import { z } from 'zod';

// --- Define types based on Zodios patterns ---

// Define schema for session creation request
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CreateSessionRequestSchema = z.object({
  userEmail: z.string().email().optional(),
  userName: z.string().optional(),
});
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

// Define schema for session response
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SessionResponseSchema = z.object({
  id: z.string().uuid(),
  userEmail: z.string().email(),
  userName: z.string(),
  startedAt: z.string().datetime({ offset: true }),
  lastActiveAt: z.string().datetime({ offset: true }),
  status: z.enum(['active', 'completed', 'abandoned']),
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

// --- React Query Hooks ---

/**
 * Hook to create a new game session
 */
export const useCreateSession = () => {
  return useMutation<ApiResponse<SessionResponse>, Error, CreateSessionRequest>({
    mutationFn: async (data) => {
      // When Zodios client is enabled:
      // return apiClient.post<SessionResponse, CreateSessionRequest>(
      //   '/sessions',
      //   data
      // );
      
      // --- Mock Implementation ---
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const mockResponse: SessionResponse = {
        id: `session-${Math.floor(Math.random() * 1000)}`,
        userEmail: data.userEmail || 'user@example.com',
        userName: data.userName || 'User',
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        status: 'active'
      };
      
      return {
        data: mockResponse,
        status: 201,
        success: true,
        error: undefined
      };
    }
  });
};

/**
 * Hook to get an existing session by ID
 */
export const useGetSession = () => {
  return useMutation<ApiResponse<SessionResponse>, Error, string>({
    mutationFn: async (sessionId) => {
      // When Zodios client is enabled:
      // return apiClient.get<SessionResponse>(
      //   `/sessions/${sessionId}`
      // );
      
      // --- Mock Implementation ---
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!sessionId || sessionId.trim() === '') {
        throw new Error('Session ID is required');
      }
      
      const mockResponse: SessionResponse = {
        id: sessionId,
        userEmail: 'user@example.com',
        userName: 'Example User',
        startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        lastActiveAt: new Date().toISOString(),
        status: 'active'
      };
      
      return {
        data: mockResponse,
        status: 200,
        success: true,
        error: undefined
      };
    }
  });
};
