/**
 * Game Service
 * 
 * Provides hooks for game state management and progression
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
import { GamePhase } from '@/store/useGameStore';
import { z } from 'zod';

// Game keys for React Query
const gameKeys = {
  all: ['game'] as const,
  state: (userId?: string, sessionId?: string) => [...gameKeys.all, 'state', userId, sessionId] as const,
  progress: (userId?: string, sessionId?: string) => [...gameKeys.all, 'progress', userId, sessionId] as const,
  phase: (userId?: string, sessionId?: string) => [...gameKeys.all, 'phase', userId, sessionId] as const,
};

// Game state schema
const GameStateSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  gamePhase: z.nativeEnum(GamePhase),
  score: z.number(),
  progress: z.number(),
  lastUpdated: z.string(),
});

type GameState = z.infer<typeof GameStateSchema>;

/**
 * Hook to initialize a new game session
 */
export const useInitializeGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, sessionId }: { userId: string; sessionId: string }): Promise<ApiResponse<GameState>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const initialState: GameState = {
        userId,
        sessionId,
        gamePhase: GamePhase.WELCOME,
        score: 0,
        progress: 0,
        lastUpdated: new Date().toISOString(),
      };
      
      return {
        success: true,
        status: 201,
        data: initialState,
      };
    },
    onSuccess: (response, variables) => {
      // Update game state in cache
      queryClient.setQueryData(
        gameKeys.state(variables.userId, variables.sessionId),
        response
      );
    },
  });
};

/**
 * Hook to get current game state
 */
export const useGameState = (userId?: string, sessionId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: gameKeys.state(userId, sessionId),
    queryFn: async (): Promise<ApiResponse<GameState>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        status: 200,
        data: {
          userId: userId || 'mock-user',
          sessionId: sessionId || 'mock-session',
          gamePhase: GamePhase.WELCOME,
          score: 0,
          progress: 0,
          lastUpdated: new Date().toISOString(),
        },
      };
    },
    enabled: enabled && !!userId && !!sessionId,
  });
};

/**
 * Hook to save game progress
 */
export const useSaveGameProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      sessionId, 
      progress, 
      score 
    }: { 
      userId: string; 
      sessionId: string; 
      progress: number; 
      score: number; 
    }): Promise<ApiResponse<GameState>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const updatedState: GameState = {
        userId,
        sessionId,
        gamePhase: GamePhase.ROUND1,
        score,
        progress,
        lastUpdated: new Date().toISOString(),
      };
      
      return {
        success: true,
        status: 200,
        data: updatedState,
      };
    },
    onSuccess: (response, variables) => {
      // Update game state in cache
      queryClient.setQueryData(
        gameKeys.state(variables.userId, variables.sessionId),
        response
      );
      // Invalidate progress queries
      queryClient.invalidateQueries({
        queryKey: gameKeys.progress(variables.userId, variables.sessionId),
      });
    },
  });
};

/**
 * Hook to update game phase
 */
export const useUpdateGamePhase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      sessionId, 
      phase 
    }: { 
      userId: string; 
      sessionId: string; 
      phase: GamePhase; 
    }): Promise<ApiResponse<GameState>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const updatedState: GameState = {
        userId,
        sessionId,
        gamePhase: phase,
        score: 0,
        progress: 0,
        lastUpdated: new Date().toISOString(),
      };
      
      return {
        success: true,
        status: 200,
        data: updatedState,
      };
    },
    onSuccess: (response, variables) => {
      // Update game state in cache
      queryClient.setQueryData(
        gameKeys.state(variables.userId, variables.sessionId),
        response
      );
      // Invalidate phase queries
      queryClient.invalidateQueries({
        queryKey: gameKeys.phase(variables.userId, variables.sessionId),
      });
    },
  });
};
