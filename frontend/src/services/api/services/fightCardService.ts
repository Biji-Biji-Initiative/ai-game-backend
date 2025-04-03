/**
 * Fight Card Service
 * 
 * Provides React Query hooks for fight card-related API operations
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { FocusArea, Trait } from '@/store/useGameStore';
import { ApiResponse } from '../apiResponse';

/**
 * Types for fight card-related requests and responses
 */
interface GenerateFightCardRequest {
  userEmail?: string;
  sessionId?: string;
  traits: Trait[];
  focus: FocusArea;
  responses?: {
    round1?: { userResponse: string; aiResponse?: string; challenge?: string };
    round2?: { userResponse: string; aiResponse?: string; challenge?: string };
    round3?: { userResponse: string; aiResponse?: string; challenge?: string };
  };
}

interface FightCard {
  id: string;
  userEmail: string;
  sessionId: string;
  traits: Trait[];
  focus: FocusArea;
  rounds: {
    round1: { challenge: string; userResponse?: string; aiResponse?: string };
    round2: { challenge: string; userResponse?: string; aiResponse?: string };
    round3: { challenge: string; userResponse?: string; aiResponse?: string };
  };
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed';
}

/**
 * Hook to generate a fight card based on user traits, focus area, and responses
 */
export const useGenerateFightCard = () => {
  return useMutation<ApiResponse<FightCard>, Error, GenerateFightCardRequest>({
    mutationFn: (data) => 
      apiClient.post<FightCard, GenerateFightCardRequest>('/fight-cards/generate', data),
  });
};

/**
 * Hook to fetch a fight card by ID
 */
export const useGetFightCard = (fightCardId: string, enabled = false) => {
  return useQuery<ApiResponse<FightCard>, Error>({
    queryKey: ['fightCard', fightCardId],
    queryFn: () => apiClient.get<FightCard>(`/fight-cards/${fightCardId}`),
    enabled: enabled && !!fightCardId,
    // Disable automatic refetching
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
