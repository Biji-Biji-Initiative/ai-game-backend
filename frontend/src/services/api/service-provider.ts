import { MockApiClient } from './mock-api-client';
import { UserService, ChallengeService, GameService } from './interfaces/services';
import { MockUserService } from './mocks/user-service.mock';
import { MockChallengeService } from './mocks/challenge-service.mock';
import { MockGameService } from './mocks/game-service.mock';
import { createApiConfig } from './config';
import { apiConfig } from '@/config/env';

/**
 * API Service Provider
 * This class provides access to all API services
 */
class ApiServiceProvider {
  private apiClient: MockApiClient;
  private userService?: UserService;
  private challengeService?: ChallengeService;
  private gameService?: GameService;
  
  constructor() {
    // Use configuration from environment
    this.apiClient = new MockApiClient(createApiConfig());
    
    // Log initialization in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`ApiServiceProvider initialized with: ${apiConfig.isMockingEnabled ? 'mock' : 'real'} implementation`);
    }
  }

  /**
   * Get the UserService implementation
   */
  getUserService(): UserService {
    if (!this.userService) {
      this.userService = new MockUserService();
      // In the future, we could implement a factory pattern based on config:
      // this.userService = apiConfig.isMockingEnabled ? new MockUserService() : new RealUserService();
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

  // Additional service getters can be added here as needed
}

/**
 * Singleton instance of the API Service Provider
 */
export const apiServices = new ApiServiceProvider();
