'use strict';

import BaseCoordinator from '../BaseCoordinator.js';

/**
 * LeaderboardCoordinator class
 * 
 * Coordinates operations related to challenge leaderboards, orchestrating the interaction
 * between controllers, services, and repositories while maintaining separation of concerns.
 */
class LeaderboardCoordinator extends BaseCoordinator {
  /**
   * Create a new LeaderboardCoordinator
   * 
   * @param {Object} dependencies - Dependencies required by the coordinator
   * @param {Object} dependencies.leaderboardService - Service for managing leaderboards
   * @param {Object} dependencies.userService - Service for user operations
   * @param {Object} dependencies.challengeService - Service for challenge operations
   * @param {Object} dependencies.promptService - Service for generating prompts
   * @param {Object} [dependencies.logger] - Logger instance
   */
  constructor(dependencies = {}) {
    super({ name: 'LeaderboardCoordinator', logger: dependencies.logger });
    
    this.validateDependencies(dependencies, [
      'leaderboardService',
      'userService',
      'challengeService',
      'promptService'
    ]);
    
    this.leaderboardService = dependencies.leaderboardService;
    this.userService = dependencies.userService;
    this.challengeService = dependencies.challengeService;
    this.promptService = dependencies.promptService;
  }
  
  /**
   * Get global leaderboard
   * 
   * @param {Object} options - Query options (timeframe, limit, offset)
   * @returns {Promise<Object>} Leaderboard data
   */
  async getGlobalLeaderboard(options = {}) {
    return this.executeOperation(async () => {
      return this.leaderboardService.getGlobalLeaderboard(options);
    }, 'getGlobalLeaderboard', { options });
  }
  
  /**
   * Get focus area leaderboard
   * 
   * @param {string} focusAreaId - ID of the focus area
   * @param {Object} options - Query options (timeframe, limit, offset)
   * @returns {Promise<Object>} Leaderboard data
   */
  async getFocusAreaLeaderboard(focusAreaId, options = {}) {
    return this.executeOperation(async () => {
      return this.leaderboardService.getFocusAreaLeaderboard(focusAreaId, options);
    }, 'getFocusAreaLeaderboard', { focusAreaId, options });
  }
  
  /**
   * Get challenge-specific leaderboard
   * 
   * @param {string} challengeId - ID of the challenge
   * @param {Object} options - Query options (timeframe, limit, offset)
   * @returns {Promise<Object>} Leaderboard data
   */
  async getChallengeLeaderboard(challengeId, options = {}) {
    return this.executeOperation(async () => {
      // Verify challenge exists
      await this.challengeService.getChallengeById(challengeId);
      
      return this.leaderboardService.getChallengeLeaderboard(challengeId, options);
    }, 'getChallengeLeaderboard', { challengeId, options });
  }
  
  /**
   * Get similar profiles leaderboard (users with similar traits)
   * 
   * @param {string} userId - ID of the user
   * @param {Object} options - Query options (timeframe, limit, offset)
   * @returns {Promise<Object>} Leaderboard data
   */
  async getSimilarProfilesLeaderboard(userId, options = {}) {
    return this.executeOperation(async () => {
      // Get user data
      const user = await this.userService.getUserById(userId);
      
      return this.leaderboardService.getSimilarProfilesLeaderboard(userId, options);
    }, 'getSimilarProfilesLeaderboard', { userId, options });
  }
  
  /**
   * Get friends leaderboard
   * 
   * @param {string} userId - ID of the user
   * @param {Object} options - Query options (timeframe, limit, offset)
   * @returns {Promise<Object>} Leaderboard data
   */
  async getFriendsLeaderboard(userId, options = {}) {
    return this.executeOperation(async () => {
      // Get user's friends
      const friends = await this.userService.getUserFriends(userId);
      
      return this.leaderboardService.getFriendsLeaderboard(userId, friends, options);
    }, 'getFriendsLeaderboard', { userId, options });
  }
  
  /**
   * Submit score to leaderboard
   * 
   * @param {string} userId - ID of the user
   * @param {string} challengeId - ID of the challenge
   * @param {number} score - Score to submit
   * @param {Object} metadata - Additional metadata about the score
   * @returns {Promise<Object>} Submission result
   */
  async submitScore(userId, challengeId, score, metadata = {}) {
    return this.executeOperation(async () => {
      // Verify challenge exists
      await this.challengeService.getChallengeById(challengeId);
      
      // Submit the score
      const submission = await this.leaderboardService.submitScore(userId, challengeId, score, metadata);
      
      // Get updated user rank
      const userRank = await this.leaderboardService.getUserRank(userId, {
        challengeId,
        timeframe: metadata.timeframe || 'all-time'
      });
      
      // Generate insights if significant rank change
      if (userRank.rankChange && Math.abs(userRank.rankChange) >= 3) {
        const user = await this.userService.getUserById(userId);
        const leaderboard = await this.leaderboardService.getChallengeLeaderboard(challengeId, {
          timeframe: metadata.timeframe || 'all-time',
          limit: 10
        });
        
        const prompt = await this.promptService.createPrompt({
          type: 'leaderboard_insight',
          user,
          leaderboard,
          userRank
        });
        
        const insights = await this.leaderboardService.generateLeaderboardInsights(userId, prompt);
        
        return {
          submission,
          userRank,
          insights
        };
      }
      
      return {
        submission,
        userRank
      };
    }, 'submitScore', { userId, challengeId, score, metadata });
  }
  
  /**
   * Get user's rank across different leaderboards
   * 
   * @param {string} userId - ID of the user
   * @param {Object} options - Query options (timeframe)
   * @returns {Promise<Object>} User rank data
   */
  async getUserRank(userId, options = {}) {
    return this.executeOperation(async () => {
      return this.leaderboardService.getUserRank(userId, options);
    }, 'getUserRank', { userId, options });
  }
  
  /**
   * Get leaderboard insights (trends, improvements, etc.)
   * 
   * @param {string} userId - ID of the user
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Leaderboard insights
   */
  async getLeaderboardInsights(userId, options = {}) {
    return this.executeOperation(async () => {
      // Get user data
      const user = await this.userService.getUserById(userId);
      
      // Get user's rank data
      const userRank = await this.leaderboardService.getUserRank(userId, options);
      
      // Get appropriate leaderboard based on options
      let leaderboard;
      if (options.challengeId) {
        leaderboard = await this.leaderboardService.getChallengeLeaderboard(options.challengeId, options);
      } else if (options.focusAreaId) {
        leaderboard = await this.leaderboardService.getFocusAreaLeaderboard(options.focusAreaId, options);
      } else {
        leaderboard = await this.leaderboardService.getGlobalLeaderboard(options);
      }
      
      // Generate insights
      const prompt = await this.promptService.createPrompt({
        type: 'leaderboard_insight',
        user,
        leaderboard,
        userRank
      });
      
      return this.leaderboardService.generateLeaderboardInsights(userId, prompt);
    }, 'getLeaderboardInsights', { userId, options });
  }
}

export default LeaderboardCoordinator;
