/**
 * Session Service
 * 
 * Provides React Query hooks for session-related API operations
 */

import { useMutation } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { ApiResponse } from '../apiResponse';

/**
 * Types for session-related requests and responses
 */
interface CreateSessionRequest {
  userEmail?: string;
  userName?: string;
}

interface SessionResponse {
  id: string;
  userEmail: string;
  userName: string;
  startedAt: string;
  lastActiveAt: string;
  status: 'active' | 'completed' | 'abandoned';
}

/**
 * Hook to create a new game session
 */
export const useCreateSession = () => {
  return useMutation<ApiResponse<SessionResponse>, Error, CreateSessionRequest>({
    mutationFn: (data) => 
      apiClient.post<SessionResponse, CreateSessionRequest>('/sessions', data),
  });
};

/**
 * Hook to get an existing session by ID
 */
export const useGetSession = () => {
  return useMutation<ApiResponse<SessionResponse>, Error, string>({
    mutationFn: (sessionId) => 
      apiClient.get<SessionResponse>(`/sessions/${sessionId}`),
  });
};
