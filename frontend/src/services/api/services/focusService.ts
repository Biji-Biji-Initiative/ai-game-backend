/**
 * Focus Areas Service
 * 
 * Provides React Query hooks for focus area-related API operations
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { Trait, FocusArea } from '@/store/useGameStore';
import { ApiResponse } from '../apiResponse';

/**
 * Hook to fetch all available focus areas
 */
export const useGetFocusAreas = () => {
  return useQuery<ApiResponse<FocusArea[]>, Error>({
    queryKey: ['focusAreas'],
    queryFn: () => apiClient.get<FocusArea[]>('/focus-areas'),
  });
};

/**
 * Type for focus area recommendation request
 */
interface RecommendFocusAreasRequest {
  traits: Trait[];
  attitudes?: { id: string; attitude: string; strength: number }[];
  professionalContext?: { title?: string; location?: string };
}

/**
 * Hook to get recommended focus areas based on user's traits and context
 */
export const useRecommendFocusAreas = () => {
  return useMutation<ApiResponse<FocusArea[]>, Error, RecommendFocusAreasRequest>({
    mutationFn: (data) => apiClient.post<FocusArea[], RecommendFocusAreasRequest>(
      '/focus-areas/recommend',
      data
    ),
  });
};

/**
 * Type for focus area selection request
 */
interface SaveFocusAreaRequest {
  userEmail?: string;
  focusAreaId: string;
  personalityContext?: {
    traits: Trait[];
    attitudes?: { id: string; attitude: string; strength: number }[];
  };
  professionalContext?: {
    title?: string;
    location?: string;
  };
}

/**
 * Hook to save user's selected focus area with full user context
 */
export const useSaveFocusAreaSelection = () => {
  return useMutation<ApiResponse<FocusArea>, Error, SaveFocusAreaRequest>({
    mutationFn: (data) => apiClient.post<FocusArea, SaveFocusAreaRequest>(
      '/focus-areas/select',
      data
    ),
  });
};
