import { GameService } from '../interfaces/services/game-service.interface';
import { ApiResponse } from '../interfaces/api-client';
import { Game, GameResult } from '../interfaces/models';
import { GameState, GamePhase } from '@/store/useGameStore';

// Fix relative path to properly import mock utils
import { mockDelay, generateMockId } from '@/services/api/utils/mock-utils';

/**
 * Mock implementation of the Game Service
 */
export class MockGameService implements GameService {
  // In-memory storage for Game objects
  private games = new Map<string, Game>();
  // In-memory storage for game states
  private gameStates = new Map<string, GameState>();
  
  /**
   * Get all games with optional filters
   */
  async getGames(filters?: { status?: string; challengeId?: string }): Promise<ApiResponse<Game[]>> {
    await mockDelay(200, 600);
    
    let filteredGames = Array.from(this.games.values());
    
    if (filters?.status) {
      filteredGames = filteredGames.filter(game => game.status === filters.status);
    }
    
    if (filters?.challengeId) {
      filteredGames = filteredGames.filter(game => game.challengeId === filters.challengeId);
    }
    
    return {
      data: filteredGames,
      status: 200,
      ok: true,
      error: null
    };
  }

  /**
   * Get a game by ID
   */
  async getGameById(id: string): Promise<ApiResponse<Game>> {
    await mockDelay(200, 400);
    
    const game = this.games.get(id);
    
    if (!game) {
      return {
        data: null,
        status: 404,
        ok: false,
        error: 'Game not found',
      };
    }
    
    return {
      data: game,
      status: 200,
      ok: true,
      error: null
    };
  }

  /**
   * Create a new game
   */
  async createGame(challengeId: string): Promise<ApiResponse<Game>> {
    await mockDelay(300, 700);
    
    const gameId = generateMockId('game_');
    const now = new Date().toISOString();
    
    const newGame: Game = {
      id: gameId,
      challengeId,
      status: 'waiting',
      players: [],
      moves: [],
      createdAt: now,
      updatedAt: now,
    };
    
    this.games.set(gameId, newGame);
    
    return {
      data: newGame,
      status: 201,
      ok: true,
      error: null
    };
  }

  /**
   * Join a game
   */
  async joinGame(gameId: string): Promise<ApiResponse<Game>> {
    await mockDelay(200, 500);
    
    const game = this.games.get(gameId);
    
    if (!game) {
      return {
        data: null,
        status: 404,
        ok: false,
        error: 'Game not found',
      };
    }
    
    // Mock player joining
    const playerId = generateMockId('player_');
    game.players.push({
      id: playerId,
      name: `Player ${game.players.length + 1}`,
      joinedAt: new Date().toISOString(),
    });
    game.updatedAt = new Date().toISOString();
    
    return {
      data: game,
      status: 200,
      ok: true,
      error: null
    };
  }

  /**
   * Leave a game
   */
  async leaveGame(gameId: string): Promise<ApiResponse<Game>> {
    await mockDelay(200, 500);
    
    const game = this.games.get(gameId);
    
    if (!game) {
      return {
        data: null,
        status: 404,
        ok: false,
        error: 'Game not found',
      };
    }
    
    // Mock player leaving (remove last player for simplicity)
    if (game.players.length > 0) {
      game.players.pop();
    }
    
    game.updatedAt = new Date().toISOString();
    
    return {
      data: game,
      status: 200,
      ok: true,
      error: null
    };
  }

  /**
   * Start a game
   */
  async startGame(gameId: string): Promise<ApiResponse<Game>> {
    await mockDelay(300, 700);
    
    const game = this.games.get(gameId);
    
    if (!game) {
      return {
        data: null,
        status: 404,
        ok: false,
        error: 'Game not found',
      };
    }
    
    // Update game status
    game.status = 'in_progress';
    game.startedAt = new Date().toISOString();
    game.updatedAt = new Date().toISOString();
    
    return {
      data: game,
      status: 200,
      ok: true,
      error: null
    };
  }

  /**
   * Submit a move in a game
   */
  async submitMove(gameId: string, move: Record<string, unknown>): Promise<ApiResponse<Game>> {
    await mockDelay(300, 700);
    
    const game = this.games.get(gameId);
    
    if (!game) {
      return {
        data: null,
        status: 404,
        ok: false,
        error: 'Game not found',
      };
    }
    
    // Add move to game
    game.moves.push({
      id: generateMockId('move_'),
      playerId: move.playerId as string,
      action: move.action as string,
      data: move,
      timestamp: new Date().toISOString(),
    });
    
    game.updatedAt = new Date().toISOString();
    
    return {
      data: game,
      status: 200,
      ok: true,
      error: null
    };
  }

  /**
   * End a game
   */
  async endGame(gameId: string): Promise<ApiResponse<Game>> {
    await mockDelay(300, 700);
    
    const game = this.games.get(gameId);
    
    if (!game) {
      return {
        data: null,
        status: 404,
        ok: false,
        error: 'Game not found',
      };
    }
    
    // Update game status
    game.status = 'completed';
    game.endedAt = new Date().toISOString();
    game.updatedAt = new Date().toISOString();
    
    return {
      data: game,
      status: 200,
      ok: true,
      error: null
    };
  }

  /**
   * Initialize a new game session
   */
  async initializeGame(userId?: string): Promise<GameState> {
    await mockDelay(300, 800);
    
    const sessionId = `session_${Date.now()}`;
    const initialState: GameState = {
      userId: userId || 'anonymous',
      sessionId,
      gamePhase: GamePhase.WELCOME,
      traits: [],
      focus: null,
      responses: {},
      preferences: {
        darkMode: false,
        soundEnabled: true,
        animationsEnabled: true,
      },
      history: [],
      timestamp: new Date().toISOString(),
    };
    
    // Store game state
    this.gameStates.set(sessionId, initialState);
    
    return initialState;
  }

  /**
   * Save game progress
   */
  async saveGameProgress(gameState: GameState): Promise<GameState> {
    await mockDelay(300, 800);
    
    const { sessionId } = gameState;
    if (!sessionId) {
      throw new Error('Session ID is required to save game progress');
    }
    
    const updatedState = {
      ...gameState,
      timestamp: new Date().toISOString(),
    };
    
    // Store updated game state
    this.gameStates.set(sessionId, updatedState);
    
    return updatedState;
  }

  /**
   * Update game phase
   */
  async updateGamePhase(userId: string, phase: GamePhase): Promise<GameState> {
    await mockDelay(300, 800);
    
    // Find the latest session for this user
    let latestState: GameState | undefined;
    let latestSessionId = '';
    
    this.gameStates.forEach((state, sessionId) => {
      if (state.userId === userId) {
        const stateTime = state.timestamp ? new Date(state.timestamp) : new Date(0);
        const latestTime = latestState?.timestamp ? new Date(latestState.timestamp) : new Date(0);
        
        if (!latestState || stateTime > latestTime) {
          latestState = state;
          latestSessionId = sessionId;
        }
      }
    });
    
    if (!latestState) {
      return this.initializeGame(userId);
    }
    
    const updatedState = {
      ...latestState,
      gamePhase: phase,
      timestamp: new Date().toISOString(),
    };
    
    // Store updated game state
    this.gameStates.set(latestSessionId, updatedState);
    
    return updatedState;
  }

  /**
   * Retrieve game state
   */
  async getGameState(userId: string, sessionId?: string): Promise<GameState> {
    await mockDelay(300, 800);
    
    if (sessionId) {
      const state = this.gameStates.get(sessionId);
      if (state && state.userId === userId) {
        return state;
      }
    }
    
    // Find the latest session for this user
    let latestState: GameState | undefined;
    
    this.gameStates.forEach((state) => {
      if (state.userId === userId) {
        const stateTime = state.timestamp ? new Date(state.timestamp) : new Date(0);
        const latestTime = latestState?.timestamp ? new Date(latestState.timestamp) : new Date(0);
        
        if (!latestState || stateTime > latestTime) {
          latestState = state;
        }
      }
    });
    
    if (latestState) {
      return latestState;
    }
    
    // If no game state found, initialize a new one
    return this.initializeGame(userId);
  }

  /**
   * Get game results
   * @param gameId Game ID
   * @returns Promise resolving to game results
   */
  async getGameResults(gameId: string): Promise<ApiResponse<GameResult>> {
    await mockDelay();
    
    const game = this.games.get(gameId);
    if (!game) {
      return {
        ok: false,
        data: null,
        status: 404,
        error: {
          message: `Game with ID ${gameId} not found`,
          code: 'NOT_FOUND'
        }
      };
    }

    if (game.status !== 'completed') {
      return {
        ok: false,
        data: null,
        status: 400,
        error: {
          message: `Game with ID ${gameId} is not finished yet`,
          code: 'GAME_NOT_FINISHED'
        }
      };
    }

    // Generate mock game results
    const result: GameResult = {
      gameId,
      challengeId: game.challengeId,
      winner: 'user-123', // Example: user always wins in mock
      players: [
        { userId: 'user-123', score: 100 },
        { userId: 'ai-456', score: 85 }
      ],
      createdAt: game.endedAt || new Date().toISOString()
    };

    return {
      ok: true,
      data: result,
      status: 200,
      error: null
    };
  }
}
