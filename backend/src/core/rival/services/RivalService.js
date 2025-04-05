import { RivalSchema, RivalGenerationParamsSchema, RivalPerformanceUpdateSchema } from '../schemas/RivalSchema.js';
import { generateRivalSchema, getRivalByIdSchema, updateRivalPerformanceSchema, compareWithRivalSchema } from '../schemas/rivalApiSchemas.js';
'use strict';

/**
 * Service for managing rivals
 * Handles rival generation, retrieval, and updates
 */
class RivalService {
  /**
   * Create a new RivalService
   * @param {Object} config - Configuration for the service
   * @param {Object} config.repository - Repository for rival persistence
   * @param {Object} config.aiModule - AI module for rival generation
   * @param {Object} config.logger - Logger instance
   */
  constructor(config) {
    this.repository = config.repository;
    this.aiModule = config.aiModule;
    this.logger = config.logger || console;
  }

  /**
   * Generate a new rival based on user traits
   * @param {Object} params - Parameters for rival generation
   * @param {string} params.userId - ID of the user
   * @param {Array} params.userTraits - User traits to base the rival on
   * @param {Array} [params.userAttitudes] - User AI attitudes
   * @param {string} [params.focusArea] - Focus area for the rival
   * @param {string} [params.difficultyLevel] - Difficulty level of the rival
   * @returns {Promise<Object>} Generated rival
   */
  async generateRival(params) {
    try {
      // Validate parameters
      const validatedParams = generateRivalSchema.parse(params);
      
      // Import prompt builder
      const { RivalPromptBuilder } = await import('../../prompt/builders/FeaturePromptBuilders.js');
      const promptBuilder = new RivalPromptBuilder();
      
      // Build prompt for rival generation
      const prompt = promptBuilder.buildRivalGenerationPrompt({
        userTraits: validatedParams.userTraits,
        userAttitudes: validatedParams.userAttitudes,
        focusArea: validatedParams.focusArea,
        difficultyLevel: validatedParams.difficultyLevel
      });
      
      // Process prompt with AI
      const result = await this.aiModule.processPrompt({
        userId: validatedParams.userId,
        contextType: 'rival',
        contextId: `generation-${Date.now()}`,
        prompt
      });
      
      // Parse AI response
      let rivalData;
      try {
        rivalData = JSON.parse(result.response);
      } catch (error) {
        this.logger.error('Error parsing rival generation response', {
          userId: validatedParams.userId,
          error: error.message,
          response: result.response
        });
        throw new Error('Failed to parse rival generation response');
      }
      
      // Validate rival data
      const validatedRival = RivalSchema.parse({
        ...rivalData,
        userId: validatedParams.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Save rival to repository
      const savedRival = await this.repository.saveRival(validatedRival);
      
      this.logger.info('Rival generated', {
        userId: validatedParams.userId,
        rivalId: savedRival.id
      });
      
      return savedRival;
    } catch (error) {
      this.logger.error('Error generating rival', {
        userId: params.userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a rival by ID
   * @param {string} rivalId - ID of the rival to retrieve
   * @returns {Promise<Object>} Retrieved rival
   */
  async getRivalById(rivalId) {
    try {
      // Validate parameters
      const validatedParams = getRivalByIdSchema.parse({ rivalId });
      
      // Get rival from repository
      const rival = await this.repository.getRivalById(validatedParams.rivalId);
      
      if (!rival) {
        throw new Error(`Rival not found with ID: ${validatedParams.rivalId}`);
      }
      
      return rival;
    } catch (error) {
      this.logger.error('Error getting rival by ID', {
        rivalId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get rivals for a user
   * @param {string} userId - ID of the user
   * @returns {Promise<Array<Object>>} User's rivals
   */
  async getRivalsForUser(userId) {
    try {
      // Get rivals from repository
      const rivals = await this.repository.getRivalsByUserId(userId);
      
      return rivals;
    } catch (error) {
      this.logger.error('Error getting rivals for user', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update rival performance for a round
   * @param {Object} params - Parameters for performance update
   * @param {string} params.rivalId - ID of the rival to update
   * @param {string} params.roundKey - Round to update performance for
   * @param {number} params.score - Score for the round
   * @param {number} params.userScore - User's score for the round
   * @returns {Promise<Object>} Updated rival
   */
  async updateRivalPerformance(params) {
    try {
      // Validate parameters
      const validatedParams = updateRivalPerformanceSchema.parse(params);
      
      // Get rival from repository
      const rival = await this.repository.getRivalById(validatedParams.rivalId);
      
      if (!rival) {
        throw new Error(`Rival not found with ID: ${validatedParams.rivalId}`);
      }
      
      // Update performance
      const updatedPerformance = {
        ...rival.performance,
        [validatedParams.roundKey]: validatedParams.score
      };
      
      // Update rival
      const updatedRival = {
        ...rival,
        performance: updatedPerformance,
        updatedAt: new Date().toISOString()
      };
      
      // Save updated rival
      const savedRival = await this.repository.saveRival(updatedRival);
      
      this.logger.info('Rival performance updated', {
        rivalId: validatedParams.rivalId,
        roundKey: validatedParams.roundKey,
        score: validatedParams.score
      });
      
      return savedRival;
    } catch (error) {
      this.logger.error('Error updating rival performance', {
        rivalId: params.rivalId,
        roundKey: params.roundKey,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Compare user with rival
   * @param {Object} params - Parameters for comparison
   * @param {string} params.rivalId - ID of the rival to compare with
   * @param {string} params.userId - ID of the user to compare
   * @param {boolean} [params.includeDetails=true] - Whether to include detailed comparison
   * @returns {Promise<Object>} Comparison result
   */
  async compareWithRival(params) {
    try {
      // Validate parameters
      const validatedParams = compareWithRivalSchema.parse(params);
      
      // Get rival from repository
      const rival = await this.repository.getRivalById(validatedParams.rivalId);
      
      if (!rival) {
        throw new Error(`Rival not found with ID: ${validatedParams.rivalId}`);
      }
      
      // Get user performance data
      const userPerformance = await this.repository.getUserPerformance(validatedParams.userId);
      
      // Import prompt builder
      const { RivalPromptBuilder } = await import('../../prompt/builders/FeaturePromptBuilders.js');
      const promptBuilder = new RivalPromptBuilder();
      
      // Build prompt for rival comparison
      const prompt = promptBuilder.buildRivalComparisonPrompt({
        rival,
        user: { id: validatedParams.userId, performance: userPerformance },
        performanceData: {
          rival: rival.performance,
          user: userPerformance
        }
      });
      
      // Process prompt with AI
      const result = await this.aiModule.processPrompt({
        userId: validatedParams.userId,
        contextType: 'rival',
        contextId: validatedParams.rivalId,
        prompt
      });
      
      // Parse AI response
      let comparisonData;
      try {
        comparisonData = JSON.parse(result.response);
      } catch (error) {
        this.logger.error('Error parsing rival comparison response', {
          userId: validatedParams.userId,
          rivalId: validatedParams.rivalId,
          error: error.message,
          response: result.response
        });
        throw new Error('Failed to parse rival comparison response');
      }
      
      // Update rival with comparison data
      const updatedRival = {
        ...rival,
        overallComparison: comparisonData,
        updatedAt: new Date().toISOString()
      };
      
      // Save updated rival
      const savedRival = await this.repository.saveRival(updatedRival);
      
      this.logger.info('Rival comparison completed', {
        userId: validatedParams.userId,
        rivalId: validatedParams.rivalId
      });
      
      return {
        rival: savedRival,
        comparison: comparisonData
      };
    } catch (error) {
      this.logger.error('Error comparing with rival', {
        rivalId: params.rivalId,
        userId: params.userId,
        error: error.message
      });
      throw error;
    }
  }
}

export default RivalService;
