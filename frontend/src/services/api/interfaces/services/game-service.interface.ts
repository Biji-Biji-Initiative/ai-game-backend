import { ApiResponse } from '../api-client';
import { Game, GameResult } from '../models';
import { GameState, GamePhase } from '@/store/useGameStore';

/**
 * Game Service Interface
 * Defines methods for game state operations
 */
export interface GameService {
  /**
   * Get a list of games with optional filters
   * @param filters Optional filters for games
   * @returns A promise resolving to an array of games
   */
  getGames(filters?: { status?: string; challengeId?: string }): Promise<ApiResponse<Game[]>>;

  /**
   * Get a game by its ID
   * @param id Game ID
   * @returns A promise resolving to the game
   */
  getGameById(id: string): Promise<ApiResponse<Game>>;

  /**
   * Create a new game
   * @param challengeId Challenge ID
   * @returns A promise resolving to the created game
   */
  createGame(challengeId: string): Promise<ApiResponse<Game>>;

  /**
   * Join a game
   * @param gameId Game ID
   * @returns A promise resolving to the updated game
   */
  joinGame(gameId: string): Promise<ApiResponse<Game>>;

  /**
   * Leave a game
   * @param gameId Game ID
   * @returns A promise resolving to the updated game
   */
  leaveGame(gameId: string): Promise<ApiResponse<Game>>;

  /**
   * Start a game
   * @param gameId Game ID
   * @returns A promise resolving to the updated game
   */
  startGame(gameId: string): Promise<ApiResponse<Game>>;

  /**
   * Submit a move in a game
   * @param gameId Game ID
   * @param move Move details
   * @returns A promise resolving to the updated game
   */
  submitMove(gameId: string, move: Record<string, unknown>): Promise<ApiResponse<Game>>;

  /**
   * End a game
   * @param gameId Game ID
   * @returns A promise resolving to the updated game
   */
  endGame(gameId: string): Promise<ApiResponse<Game>>;

  // Additional methods for our state-based game management

  /**
   * Initialize a new game session
   * @param userId Optional user ID
   * @returns A promise resolving to the initial game state
   */
  initializeGame(userId?: string): Promise<GameState>;

  /**
   * Save game progress
   * @param gameState Current game state
   * @returns A promise resolving to the updated game state
   */
  saveGameProgress(gameState: GameState): Promise<GameState>;

  /**
   * Update game phase
   * @param userId User ID
   * @param phase New game phase
   * @returns A promise resolving to the updated game state
   */
  updateGamePhase(userId: string, phase: GamePhase): Promise<GameState>;

  /**
   * Retrieve game state
   * @param userId User ID
   * @param sessionId Optional session ID
   * @returns A promise resolving to the game state
   */
  getGameState(userId: string, sessionId?: string): Promise<GameState>;
  
  /**
   * Get game results
   * @param gameId Game ID
   * @returns A promise resolving to the game results
   */
  getGameResults(gameId: string): Promise<ApiResponse<GameResult>>;
}
