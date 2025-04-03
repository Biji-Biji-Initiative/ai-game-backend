/**
 * Game Service
 * 
 * Provides React Query hooks for game-related API operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiServices } from '@/services/api';
import { GameState, GamePhase } from '@/store/useGameStore';
import { Game } from '../interfaces/models';
import { ApiResponse } from '../interfaces/api-client';
// Import the extended GameService interface that has all the methods we need
import { GameService } from '../interfaces/services/game-service.interface';

// Query keys for caching
export const gameKeys = {
  all: ['games'] as const,
  state: (userId: string, sessionId?: string) => 
    [...gameKeys.all, 'state', userId, sessionId] as const,
  results: (gameId: string) => 
    [...gameKeys.all, 'results', gameId] as const,
};

/**
 * Hook to initialize a new game
 */
export const useInitializeGame = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => {
      // Cast to unknown first to avoid type conflicts
      const gameService = apiServices.getGameService() as unknown as GameService;
      return gameService.initializeGame(userId);
    },
    onSuccess: (data: GameState) => {
      // Update cache with the new game state
      if (data.userId) {
        queryClient.setQueryData(
          gameKeys.state(data.userId, data.sessionId || ''), 
          data
        );
      }
    },
  });
};

/**
 * Hook to save game progress
 */
export const useSaveGameProgress = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (gameState: GameState) => {
      // Cast to unknown first to avoid type conflicts
      const gameService = apiServices.getGameService() as unknown as GameService;
      return gameService.saveGameProgress(gameState);
    },
    onSuccess: (data: GameState) => {
      // Update cache with the updated game state
      if (data.userId) {
        queryClient.setQueryData(
          gameKeys.state(data.userId, data.sessionId || ''), 
          data
        );
      }
    },
  });
};

/**
 * Hook to update game phase
 */
export const useUpdateGamePhase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, phase }: { userId: string; phase: GamePhase }) => {
      // Cast to unknown first to avoid type conflicts
      const gameService = apiServices.getGameService() as unknown as GameService;
      return gameService.updateGamePhase(userId, phase);
    },
    onSuccess: (data: GameState) => {
      // Update cache with the updated game state
      if (data.userId) {
        queryClient.setQueryData(
          gameKeys.state(data.userId, data.sessionId || ''), 
          data
        );
      }
    },
  });
};

/**
 * Hook to get game state
 */
export const useGameState = (userId: string, sessionId?: string) => {
  return useQuery({
    queryKey: gameKeys.state(userId, sessionId || ''),
    queryFn: () => {
      // Cast to unknown first to avoid type conflicts
      const gameService = apiServices.getGameService() as unknown as GameService;
      return gameService.getGameState(userId, sessionId || '');
    },
    staleTime: 60 * 1000, // 1 minute
  });
};

/**
 * Standard Game API Hooks
 */

// Query keys for game API
export const standardGameKeys = {
  all: ['api-games'] as const,
  lists: () => [...standardGameKeys.all, 'list'] as const,
  list: (filters: Record<string, string>) => [...standardGameKeys.lists(), filters] as const,
  details: () => [...standardGameKeys.all, 'detail'] as const,
  detail: (id: string) => [...standardGameKeys.details(), id] as const,
};

/**
 * Hook to fetch games with optional filters
 */
export const useGames = (filters?: { status?: string; challengeId?: string }) => {
  return useQuery({
    queryKey: standardGameKeys.list(filters || {}),
    queryFn: () => apiServices.getGameService().getGames(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Hook to fetch a game by ID
 */
export const useGame = (id: string) => {
  return useQuery({
    queryKey: standardGameKeys.detail(id),
    queryFn: () => apiServices.getGameService().getGameById(id),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!id,
  });
};

/**
 * Hook to create a game
 */
export const useCreateGame = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (challengeId: string) => apiServices.getGameService().createGame(challengeId),
    onSuccess: (response: ApiResponse<Game>) => {
      if (response.data) {
        queryClient.invalidateQueries({ queryKey: standardGameKeys.lists() });
      }
    },
  });
};

/**
 * Hook to join a game
 */
export const useJoinGame = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (gameId: string) => apiServices.getGameService().joinGame(gameId),
    onSuccess: (response: ApiResponse<Game>) => {
      if (response.data) {
        // Update the cache for this specific game
        queryClient.setQueryData(
          standardGameKeys.detail(response.data.id), 
          response
        );
        
        // Invalidate the list to refresh it
        queryClient.invalidateQueries({ queryKey: standardGameKeys.lists() });
      }
    },
  });
};

/**
 * Hook to leave a game
 */
export const useLeaveGame = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (gameId: string) => apiServices.getGameService().leaveGame(gameId),
    onSuccess: (response: ApiResponse<Game>) => {
      if (response.data) {
        // Update the cache for this specific game
        queryClient.setQueryData(
          standardGameKeys.detail(response.data.id), 
          response
        );
        
        // Invalidate the list to refresh it
        queryClient.invalidateQueries({ queryKey: standardGameKeys.lists() });
      }
    },
  });
};

/**
 * Hook to start a game
 */
export const useStartGame = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (gameId: string) => apiServices.getGameService().startGame(gameId),
    onSuccess: (response: ApiResponse<Game>) => {
      if (response.data) {
        // Update the cache for this specific game
        queryClient.setQueryData(
          standardGameKeys.detail(response.data.id), 
          response
        );
        
        // Invalidate the list to refresh it
        queryClient.invalidateQueries({ queryKey: standardGameKeys.lists() });
      }
    },
  });
};

/**
 * Hook to submit a move in a game
 */
export const useSubmitMove = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ gameId, move }: { gameId: string; move: Record<string, unknown> }) => 
      apiServices.getGameService().submitMove(gameId, move),
    onSuccess: (response: ApiResponse<Game>) => {
      if (response.data) {
        // Update the cache for this specific game
        queryClient.setQueryData(
          standardGameKeys.detail(response.data.id), 
          response
        );
      }
    },
  });
};

/**
 * Hook to end a game
 */
export const useEndGame = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (gameId: string) => {
      // Cast to unknown first to avoid type conflicts
      const gameService = apiServices.getGameService() as unknown as GameService;
      return gameService.endGame(gameId);
    },
    onSuccess: (response: ApiResponse<Game>) => {
      if (response.data) {
        // Update the cache for this specific game
        queryClient.setQueryData(
          standardGameKeys.detail(response.data.id), 
          response
        );
        
        // Invalidate the list to refresh it
        queryClient.invalidateQueries({ queryKey: standardGameKeys.lists() });
      }
    },
  });
};

/**
 * Hook to get game results
 */
export const useGameResults = (gameId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: gameKeys.results(gameId),
    queryFn: () => {
      // Cast to unknown first to avoid type conflicts
      const gameService = apiServices.getGameService() as unknown as GameService;
      return gameService.getGameResults(gameId);
    },
    enabled: enabled && !!gameId,
    staleTime: 5 * 60 * 1000, // 5 minutes - results don't change often
  });
};
