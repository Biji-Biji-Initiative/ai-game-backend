import { LeaderboardSchema, leaderboardEntrySchema, leaderboardFilterSchema, leaderboardScoreSubmissionSchema } from '../schemas/LeaderboardSchema.js';
import { getLeaderboardSchema, submitLeaderboardScoreSchema, getUserLeaderboardPositionSchema } from '../schemas/leaderboardApiSchemas.js';
'use strict';

/**
 * Service for managing leaderboards
 * Handles leaderboard creation, score submission, and retrieval
 */
class LeaderboardService {
  /**
   * Create a new LeaderboardService
   * @param {Object} config - Configuration for the service
   * @param {Object} config.repository - Repository for leaderboard persistence
   * @param {Object} config.aiModule - AI module for leaderboard insights
   * @param {Object} config.logger - Logger instance
   */
  constructor(config) {
    this.repository = config.repository;
    this.aiModule = config.aiModule;
    this.logger = config.logger || console;
  }

  /**
   * Get leaderboard data with filtering
   * @param {Object} params - Parameters for leaderboard retrieval
   * @param {string} [params.type] - Type of leaderboard to retrieve
   * @param {string} [params.timeframe='all_time'] - Time period for the leaderboard
   * @param {string} [params.focusArea] - Focus area to filter by
   * @param {string} [params.challengeId] - Challenge to filter by
   * @param {number} [params.limit=20] - Maximum number of entries to return
   * @param {number} [params.offset=0] - Number of entries to skip
   * @returns {Promise<Object>} Leaderboard data
   */
  async getLeaderboard(params = {}) {
    try {
      // Validate parameters
      const validatedParams = getLeaderboardSchema.parse(params);
      
      // Get leaderboard from repository
      const leaderboard = await this.repository.getLeaderboard({
        type: validatedParams.type,
        timeframe: validatedParams.timeframe,
        focusArea: validatedParams.focusArea,
        challengeId: validatedParams.challengeId,
        limit: validatedParams.limit,
        offset: validatedParams.offset
      });
      
      return leaderboard;
    } catch (error) {
      this.logger.error('Error getting leaderboard', {
        type: params.type,
        timeframe: params.timeframe,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Submit a score to a leaderboard
   * @param {Object} params - Parameters for score submission
   * @param {string} params.userId - ID of the user submitting the score
   * @param {string} params.username - Display name of the user
   * @param {number} params.score - Score to submit to the leaderboard
   * @param {string} [params.challengeId] - ID of the related challenge
   * @param {string} [params.focusArea] - Focus area for this submission
   * @param {Object} [params.metadata] - Additional metadata
   * @returns {Promise<Object>} Submission result with leaderboard position
   */
  async submitLeaderboardScore(params) {
    try {
      // Validate parameters
      const validatedParams = submitLeaderboardScoreSchema.parse(params);
      
      // Create leaderboard entry
      const entry = {
        userId: validatedParams.userId,
        username: validatedParams.username,
        score: validatedParams.score,
        completedAt: new Date().toISOString(),
        focusArea: validatedParams.focusArea,
        challengeId: validatedParams.challengeId,
        metadata: validatedParams.metadata || {}
      };
      
      // Submit score to repository
      const result = await this.repository.submitScore(entry);
      
      this.logger.info('Score submitted to leaderboard', {
        userId: validatedParams.userId,
        score: validatedParams.score,
        rank: result.rank
      });
      
      return result;
    } catch (error) {
      this.logger.error('Error submitting leaderboard score', {
        userId: params.userId,
        score: params.score,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a user's position on a leaderboard
   * @param {Object} params - Parameters for position retrieval
   * @param {string} params.userId - ID of the user
   * @param {string} [params.type='global'] - Type of leaderboard
   * @param {string} [params.timeframe='all_time'] - Time period
   * @param {string} [params.challengeId] - Challenge ID
   * @param {string} [params.focusArea] - Focus area
   * @param {boolean} [params.includeNeighbors=true] - Include entries above and below
   * @param {number} [params.neighborCount=3] - Number of neighbors
   * @returns {Promise<Object>} User's position and neighboring entries
   */
  async getUserLeaderboardPosition(params) {
    try {
      // Validate parameters
      const validatedParams = getUserLeaderboardPositionSchema.parse(params);
      
      // Get user position from repository
      const position = await this.repository.getUserPosition({
        userId: validatedParams.userId,
        type: validatedParams.type,
        timeframe: validatedParams.timeframe,
        challengeId: validatedParams.challengeId,
        focusArea: validatedParams.focusArea,
        includeNeighbors: validatedParams.includeNeighbors,
        neighborCount: validatedParams.neighborCount
      });
      
      return position;
    } catch (error) {
      this.logger.error('Error getting user leaderboard position', {
        userId: params.userId,
        type: params.type,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get leaderboard insights for a user
   * @param {string} userId - ID of the user
   * @param {string} [leaderboardType='global'] - Type of leaderboard
   * @returns {Promise<Object>} Leaderboard insights
   */
  async getLeaderboardInsights(userId, leaderboardType = 'global') {
    try {
      // Get user position
      const position = await this.getUserLeaderboardPosition({
        userId,
        type: leaderboardType,
        includeNeighbors: true,
        neighborCount: 5
      });
      
      // Get top performers
      const topPerformers = await this.repository.getTopPerformers({
        type: leaderboardType,
        limit: 5
      });
      
      // Import prompt builder
      const { LeaderboardPromptBuilder } = await import('../../prompt/builders/FeaturePromptBuilders.js');
      const promptBuilder = new LeaderboardPromptBuilder();
      
      // Build prompt for leaderboard insights
      const prompt = promptBuilder.buildLeaderboardInsightPrompt({
        userId,
        userPosition: {
          rank: position.rank,
          score: position.score,
          percentile: position.percentile
        },
        leaderboardType,
        topPerformers: topPerformers.map(entry => ({
          rank: entry.rank,
          username: entry.username,
          score: entry.score
        }))
      });
      
      // Process prompt with AI
      const result = await this.aiModule.processPrompt({
        userId,
        contextType: 'leaderboard',
        contextId: `insights-${leaderboardType}-${Date.now()}`,
        prompt
      });
      
      // Parse AI response
      let insights;
      try {
        insights = JSON.parse(result.response);
      } catch (error) {
        this.logger.error('Error parsing leaderboard insights response', {
          userId,
          leaderboardType,
          error: error.message,
          response: result.response
        });
        throw new Error('Failed to parse leaderboard insights response');
      }
      
      return {
        position,
        topPerformers,
        insights
      };
    } catch (error) {
      this.logger.error('Error getting leaderboard insights', {
        userId,
        leaderboardType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Compare user performance with average and top performers
   * @param {string} userId - ID of the user
   * @param {string} [challengeId] - ID of the challenge
   * @returns {Promise<Object>} Performance comparison
   */
  async comparePerformance(userId, challengeId) {
    try {
      // Get user performance
      const userPerformance = await this.repository.getUserPerformance(userId, challengeId);
      
      // Get average performance
      const averagePerformance = await this.repository.getAveragePerformance(challengeId);
      
      // Get top performance
      const topPerformance = await this.repository.getTopPerformance(challengeId);
      
      // Import prompt builder
      const { LeaderboardPromptBuilder } = await import('../../prompt/builders/FeaturePromptBuilders.js');
      const promptBuilder = new LeaderboardPromptBuilder();
      
      // Build prompt for performance comparison
      const prompt = promptBuilder.buildPerformanceComparisonPrompt({
        userPerformance,
        averagePerformance,
        topPerformance
      });
      
      // Process prompt with AI
      const result = await this.aiModule.processPrompt({
        userId,
        contextType: 'leaderboard',
        contextId: `comparison-${challengeId || 'overall'}-${Date.now()}`,
        prompt
      });
      
      // Parse AI response
      let comparison;
      try {
        comparison = JSON.parse(result.response);
      } catch (error) {
        this.logger.error('Error parsing performance comparison response', {
          userId,
          challengeId,
          error: error.message,
          response: result.response
        });
        throw new Error('Failed to parse performance comparison response');
      }
      
      return {
        userPerformance,
        averagePerformance,
        topPerformance,
        comparison
      };
    } catch (error) {
      this.logger.error('Error comparing performance', {
        userId,
        challengeId,
        error: error.message
      });
      throw error;
    }
  }
}

export default LeaderboardService;
