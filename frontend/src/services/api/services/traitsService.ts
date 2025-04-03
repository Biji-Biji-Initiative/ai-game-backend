/**
 * Traits Service
 * 
 * Provides React Query hooks for trait assessment-related API operations
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { Trait } from '@/store/useGameStore';
import { ApiResponse } from '../apiResponse';

export const useGetTraits = () => {
  return useQuery<ApiResponse<Trait[]>, Error>({
    queryKey: ['traits'],
    queryFn: () => apiClient.get<Trait[]>('/traits'),
  });
};

export interface TraitAssessmentRequest {
  userEmail?: string;
  traits: Trait[];
}

export interface TraitAssessmentResponse {
  id: string;
  userEmail: string;
  traits: Trait[];
  createdAt: string;
  updatedAt: string;
}

export const useSaveTraitAssessment = () => {
  return useMutation<ApiResponse<TraitAssessmentResponse>, Error, TraitAssessmentRequest>({
    mutationFn: (data) => 
      apiClient.post<TraitAssessmentResponse, TraitAssessmentRequest>('/traits/assessment', data),
  });
};

export const useGetTraitAssessment = (userEmail: string) => {
  return useQuery<ApiResponse<TraitAssessmentResponse>, Error>({
    queryKey: ['traitAssessment', userEmail],
    queryFn: () => apiClient.get<TraitAssessmentResponse>(`/traits/assessment/${userEmail}`),
    // Only fetch if userEmail is provided
    enabled: !!userEmail,
  });
};
