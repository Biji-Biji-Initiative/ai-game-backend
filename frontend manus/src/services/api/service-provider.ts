import { IS_DEV_MODE } from '@/lib/utils/constants';

// Import mock services for compatibility with existing code
import { UserService, ChallengeService, GameService } from './interfaces/services';
import { MockUserService } from './mocks/user-service.mock';
import { MockChallengeService } from './mocks/challenge-service.mock';
import { MockGameService } from './mocks/game-service.mock';

/**
 * API service provider class
 * Provides access to specific domain service implementations (currently mocks).
 */
export class ApiServiceProvider {
  // No longer needed: private client: SupabaseClient;
  // No longer needed: // Cache for results to prevent unnecessary refetching
  // No longer needed: private _cachedResults = new Map<string, { result: unknown; timestamp: number }>();
  // No longer needed: // Store stable refetch functions to prevent recreation on each render
  // No longer needed: private _stableRefetchFunctions = new Map<string, () => Promise<unknown>>();

  // Service instances (using mocks for now)
  private userService?: UserService;
  private challengeService?: ChallengeService;
  private gameService?: GameService;

  // No longer needs the client argument
  constructor() {
    // No longer needed: this.client = client;

    // Log initialization in dev mode only
    if (IS_DEV_MODE) {
      console.warn('ApiServiceProvider initialized (using mock services)');
    }
  }

  /**
   * Get the UserService implementation
   */
  getUserService(): UserService {
    if (!this.userService) {
      this.userService = new MockUserService();
    }
    return this.userService;
  }

  /**
   * Get the ChallengeService implementation
   */
  getChallengeService(): ChallengeService {
    if (!this.challengeService) {
      this.challengeService = new MockChallengeService();
    }
    return this.challengeService;
  }

  /**
   * Get the GameService implementation
   */
  getGameService(): GameService {
    if (!this.gameService) {
      this.gameService = new MockGameService();
    }
    return this.gameService;
  }

  // Removed generic methods: get, getPaginated, post, update, delete
  // Removed helper methods: _createCacheKey, _getStableRefetch, _clearCacheForUrl
}

// Removed: const createMockSupabaseClient = ...

/**
 * Singleton instance of the API Service Provider
 * Initializes with mock services.
 */
// No longer needs the mock client argument
export const apiServices = new ApiServiceProvider();
