/**
 * Fight Card Service
 * 
 * Provides hooks for managing fight cards and matchups
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
import { z } from 'zod';

// Fight card keys for React Query
const fightCardKeys = {
  all: ['fightCard'] as const,
  lists: () => [...fightCardKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...fightCardKeys.lists(), filters] as const,
  details: () => [...fightCardKeys.all, 'detail'] as const,
  detail: (id: string) => [...fightCardKeys.details(), id] as const,
  matchups: (cardId: string) => [...fightCardKeys.all, 'matchups', cardId] as const,
  matchup: (cardId: string, matchupId: string) => [...fightCardKeys.matchups(cardId), matchupId] as const,
};

// Fight card schemas
const FighterSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().optional(),
  stats: z.object({
    strength: z.number(),
    speed: z.number(),
    technique: z.number(),
    defense: z.number(),
  }),
  record: z.object({
    wins: z.number(),
    losses: z.number(),
    draws: z.number(),
  }),
});

const MatchupSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  fighter1: FighterSchema,
  fighter2: FighterSchema,
  weight: z.string(),
  rounds: z.number(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
  result: z.object({
    winner: z.string().optional(),
    method: z.string().optional(),
    round: z.number().optional(),
    time: z.string().optional(),
  }).optional(),
  startTime: z.string(),
});

const FightCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  venue: z.string(),
  description: z.string().optional(),
  status: z.enum(['upcoming', 'in_progress', 'completed']),
  mainEvent: MatchupSchema,
  coMainEvent: MatchupSchema.optional(),
  matchups: z.array(MatchupSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

type Fighter = z.infer<typeof FighterSchema>;
type Matchup = z.infer<typeof MatchupSchema>;
type FightCard = z.infer<typeof FightCardSchema>;

/**
 * Hook to get all fight cards with optional filters
 */
export const useFightCards = (filters?: Record<string, unknown>, enabled: boolean = true) => {
  return useQuery({
    queryKey: fightCardKeys.list(filters || {}),
    queryFn: async (): Promise<ApiResponse<FightCard[]>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockFightCard: FightCard = {
        id: 'card-1',
        title: 'Ultimate Championship 2024',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        venue: 'Arena Stadium',
        description: 'A night of epic matchups',
        status: 'upcoming',
        mainEvent: {
          id: 'match-1',
          cardId: 'card-1',
          fighter1: {
            id: 'fighter-1',
            name: 'Alex "The Thunder" Thompson',
            stats: { strength: 90, speed: 85, technique: 88, defense: 87 },
            record: { wins: 15, losses: 2, draws: 0 },
          },
          fighter2: {
            id: 'fighter-2',
            name: 'Mike "The Storm" Johnson',
            stats: { strength: 88, speed: 89, technique: 86, defense: 85 },
            record: { wins: 14, losses: 3, draws: 1 },
          },
          weight: 'Heavyweight',
          rounds: 5,
          status: 'scheduled',
          startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        matchups: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      return {
        success: true,
        status: 200,
        data: [mockFightCard],
      };
    },
    enabled,
  });
};

/**
 * Hook to get a specific fight card by ID
 */
export const useFightCard = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: fightCardKeys.detail(id),
    queryFn: async (): Promise<ApiResponse<FightCard>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!id) {
        throw new Error('Fight Card ID is required');
      }
      
      const mockFightCard: FightCard = {
        id,
        title: 'Ultimate Championship 2024',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        venue: 'Arena Stadium',
        description: 'A night of epic matchups',
        status: 'upcoming',
        mainEvent: {
          id: 'match-1',
          cardId: id,
          fighter1: {
            id: 'fighter-1',
            name: 'Alex "The Thunder" Thompson',
            stats: { strength: 90, speed: 85, technique: 88, defense: 87 },
            record: { wins: 15, losses: 2, draws: 0 },
          },
          fighter2: {
            id: 'fighter-2',
            name: 'Mike "The Storm" Johnson',
            stats: { strength: 88, speed: 89, technique: 86, defense: 85 },
            record: { wins: 14, losses: 3, draws: 1 },
          },
          weight: 'Heavyweight',
          rounds: 5,
          status: 'scheduled',
          startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        matchups: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      return {
        success: true,
        status: 200,
        data: mockFightCard,
      };
    },
    enabled: enabled && !!id,
  });
};

/**
 * Hook to get matchups for a specific fight card
 */
export const useCardMatchups = (cardId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: fightCardKeys.matchups(cardId),
    queryFn: async (): Promise<ApiResponse<Matchup[]>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 400));
      
      if (!cardId) {
        throw new Error('Fight Card ID is required');
      }
      
      const mockMatchups: Matchup[] = [
        {
          id: 'match-1',
          cardId,
          fighter1: {
            id: 'fighter-1',
            name: 'Alex "The Thunder" Thompson',
            stats: { strength: 90, speed: 85, technique: 88, defense: 87 },
            record: { wins: 15, losses: 2, draws: 0 },
          },
          fighter2: {
            id: 'fighter-2',
            name: 'Mike "The Storm" Johnson',
            stats: { strength: 88, speed: 89, technique: 86, defense: 85 },
            record: { wins: 14, losses: 3, draws: 1 },
          },
          weight: 'Heavyweight',
          rounds: 5,
          status: 'scheduled',
          startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      
      return {
        success: true,
        status: 200,
        data: mockMatchups,
      };
    },
    enabled: enabled && !!cardId,
  });
};

/**
 * Hook to update matchup result
 */
export const useUpdateMatchupResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      cardId,
      matchupId,
      result,
    }: { 
      cardId: string;
      matchupId: string;
      result: {
        winner: string;
        method: string;
        round: number;
        time: string;
      };
    }): Promise<ApiResponse<Matchup>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const mockMatchup: Matchup = {
        id: matchupId,
        cardId,
        fighter1: {
          id: 'fighter-1',
          name: 'Alex "The Thunder" Thompson',
          stats: { strength: 90, speed: 85, technique: 88, defense: 87 },
          record: { wins: 15, losses: 2, draws: 0 },
        },
        fighter2: {
          id: 'fighter-2',
          name: 'Mike "The Storm" Johnson',
          stats: { strength: 88, speed: 89, technique: 86, defense: 85 },
          record: { wins: 14, losses: 3, draws: 1 },
        },
        weight: 'Heavyweight',
        rounds: 5,
        status: 'completed',
        result,
        startTime: new Date().toISOString(),
      };
      
      return {
        success: true,
        status: 200,
        data: mockMatchup,
      };
    },
    onSuccess: (response, variables) => {
      // Update matchup in cache
      queryClient.setQueryData(
        fightCardKeys.matchup(variables.cardId, variables.matchupId),
        response
      );
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: fightCardKeys.matchups(variables.cardId),
      });
      queryClient.invalidateQueries({
        queryKey: fightCardKeys.detail(variables.cardId),
      });
    },
  });
};
