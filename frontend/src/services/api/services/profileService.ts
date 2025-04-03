/**
 * Profile Service
 * 
 * Provides React Query hooks for human edge profile-related API operations
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { Trait, FocusArea, Profile } from '@/store/useGameStore';
import { ApiResponse } from '../apiResponse';

/**
 * Types for profile-related requests
 */
interface GenerateProfileRequest {
  userEmail?: string;
  sessionId?: string;
  personalityContext?: {
    traits: Trait[];
    attitudes?: { id: string; attitude: string; strength: number }[];
  };
  professionalContext?: {
    title?: string;
    location?: string;
  };
  focus: FocusArea;
  responses: {
    round1?: { userResponse: string; aiResponse?: string; challenge?: string };
    round2?: { userResponse: string; aiResponse?: string; challenge?: string };
    round3?: { userResponse: string; aiResponse?: string; challenge?: string };
  };
}

/**
 * Hook to generate a human edge profile based on game data
 */
export const useGenerateProfile = () => {
  return useMutation<ApiResponse<Profile>, Error, GenerateProfileRequest>({
    mutationFn: (data) => 
      apiClient.post<Profile, GenerateProfileRequest>(
        '/profiles/generate',
        data
      ),
  });
};

/**
 * Hook to fetch a shared profile by ID
 */
export const useGetSharedProfile = (profileId: string) => {
  return useQuery<ApiResponse<Profile>, Error>({
    queryKey: ['profile', profileId],
    queryFn: () => apiClient.get<Profile>(`/profiles/${profileId}`),
    // Only fetch if profileId is provided
    enabled: !!profileId,
  });
};
