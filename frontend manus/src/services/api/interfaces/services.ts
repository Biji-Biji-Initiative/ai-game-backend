import { ApiResponse } from './api-client';
import { User, Challenge, Game, AIAgent, Leaderboard, GameResult, FocusArea, HumanEdgeProfile } from './models';
import { Trait } from '../services/traitsService';

/**
 * User service interface
 */
export interface UserService {
  getCurrentUser(): Promise<ApiResponse<User>>;
  getUserById(id: string): Promise<ApiResponse<User>>;
  updateUser(user: Partial<User>): Promise<ApiResponse<User>>;
  createSession(): Promise<ApiResponse<void>>;
  getRecommendedFocusAreas(): Promise<ApiResponse<FocusArea[]>>;
  saveUserFocus(focusId: string): Promise<ApiResponse<void>>;
  saveUserTraits(traits: Record<string, number>): Promise<ApiResponse<void>>;
  getHumanEdgeProfile(): Promise<ApiResponse<HumanEdgeProfile>>;
}

/**
 * Challenge service interface
 */
export interface ChallengeService {
  getChallenges(filters?: { difficulty?: string; tags?: string[]; search?: string }): Promise<ApiResponse<Challenge[]>>;
  getChallengeById(id: string): Promise<ApiResponse<Challenge>>;
  createChallenge(challenge: Omit<Challenge, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Challenge>>;
  updateChallenge(id: string, challenge: Partial<Challenge>): Promise<ApiResponse<Challenge>>;
  deleteChallenge(id: string): Promise<ApiResponse<void>>;
  getChallengeForRound(round: number): Promise<ApiResponse<Challenge>>;
  submitChallengeResponse(challengeId: string, response: Record<string, unknown>): Promise<ApiResponse<void>>;
  getTraits(): Promise<ApiResponse<Trait[]>>;
}

/**
 * Game service interface
 */
export interface GameService {
  getGames(filters?: { status?: string; challengeId?: string }): Promise<ApiResponse<Game[]>>;
  getGameById(id: string): Promise<ApiResponse<Game>>;
  createGame(challengeId: string): Promise<ApiResponse<Game>>;
  joinGame(gameId: string): Promise<ApiResponse<Game>>;
  leaveGame(gameId: string): Promise<ApiResponse<Game>>;
  startGame(gameId: string): Promise<ApiResponse<Game>>;
  submitMove(gameId: string, move: Record<string, unknown>): Promise<ApiResponse<Game>>;
  getGameResults(gameId: string): Promise<ApiResponse<GameResult>>;
}

/**
 * AI Agent service interface
 */
export interface AIAgentService {
  getAgents(): Promise<ApiResponse<AIAgent[]>>;
  getAgentById(id: string): Promise<ApiResponse<AIAgent>>;
  createAgent(agent: Omit<AIAgent, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<AIAgent>>;
  updateAgent(id: string, agent: Partial<AIAgent>): Promise<ApiResponse<AIAgent>>;
  deleteAgent(id: string): Promise<ApiResponse<void>>;
}

/**
 * Leaderboard service interface
 */
export interface LeaderboardService {
  getLeaderboard(limit?: number): Promise<ApiResponse<Leaderboard[]>>;
  getUserStats(userId: string): Promise<ApiResponse<Leaderboard>>;
}

/**
 * Auth service interface
 */
export interface AuthService {
  login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>>;
  register(email: string, password: string, username: string): Promise<ApiResponse<{ user: User; token: string }>>;
  logout(): Promise<ApiResponse<void>>;
  resetPassword(email: string): Promise<ApiResponse<void>>;
  changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<void>>;
}
