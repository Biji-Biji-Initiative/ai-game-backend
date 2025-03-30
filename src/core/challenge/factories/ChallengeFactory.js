import { challengeLogger } from "../../infra/logging/domainLogger.js";
import Challenge from "../../challenge/models/Challenge.js";
import challengeErrors from "../../challenge/errors/ChallengeErrors.js";
'use strict';
const {
  ChallengeGenerationError
} = challengeErrors;
/**
 * Factory for creating Challenge domain entities
 */
class ChallengeFactory {
  /**
   * Create a new ChallengeFactory
   * @param {Object} dependencies - Service dependencies
   * @param {Object} dependencies.challengeConfigService - Service for challenge configuration
   * @param {Object} dependencies.focusAreaValidationService - Service for validating focus areas
   * @param {Object} [dependencies.logger] - Logger instance
   */
  constructor({
    challengeConfigService,
    focusAreaValidationService,
    logger
  }) {
    if (!challengeConfigService) {
      throw new Error('challengeConfigService is required for ChallengeFactory');
    }
    this.challengeConfigService = challengeConfigService;
    this.focusAreaValidationService = focusAreaValidationService;
    this.logger = logger || challengeLogger.child({
      component: 'factory:challenge'
    });
  }
  /**
   * Create a Challenge entity with validated parameters
   * @param {Object} params - Challenge creation parameters
   * @param {Object} params.user - User object
   * @param {Array} [params.recentChallenges] - User's recent challenges for context
   * @param {string} [params.challengeTypeCode] - Challenge type code
   * @param {string} [params.formatTypeCode] - Format type code
   * @param {string} [params.focusArea] - Focus area
   * @param {string} [params.difficulty] - Difficulty level
   * @param {Object} [params.difficultyManager] - Optional difficulty manager
   * @param {Object} [params.difficultySettings] - Optional pre-calculated difficulty settings
   * @param {Object} [params.config] - Optional configuration for validation
   * @returns {Promise<Challenge>} - A fully configured Challenge entity
   */
  async createChallenge(params) {
    try {
      const {
        user,
        recentChallenges = [],
        challengeTypeCode,
        formatTypeCode,
        focusArea,
        difficulty,
        difficultyManager,
        difficultySettings,
        config
      } = params;
      // Validate user
      if (!user) {
        throw new ChallengeGenerationError('User is required to create a challenge');
      }
      // Determine challenge parameters
      const challengeParams = await this.determineParameters({
        user,
        recentChallenges,
        challengeTypeCode,
        formatTypeCode,
        focusArea,
        difficulty,
        difficultyManager,
        difficultySettings
      });
      // Validate parameters against config if provided
      if (config) {
        await this.validateParameters(challengeParams, config);
      }
      // Fetch challenge type and format type metadata to enrich the challenge
      const enrichedParams = await this.enrichWithMetadata(challengeParams);
      // Create the challenge entity
      const challenge = new Challenge({
        id: Challenge.createNewId(),
        userId: user.email || user.id,
        title: `${enrichedParams.typeMetadata?.name || 'Challenge'}: ${enrichedParams.focusArea}`,
        description: '',
        // Will be filled by the generation service
        instructions: '',
        // Will be filled by the generation service
        challengeType: enrichedParams.challengeTypeCode,
        formatType: enrichedParams.formatTypeCode,
        focusArea: enrichedParams.focusArea,
        difficulty: enrichedParams.difficulty,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        typeMetadata: enrichedParams.typeMetadata,
        formatMetadata: enrichedParams.formatMetadata,
        difficultySettings: enrichedParams.difficultySettings
      });
      return challenge;
    } catch (error) {
      this.logger.error('Error creating challenge', {
        error: error.message
      });
      throw new ChallengeGenerationError(`Failed to create challenge: ${error.message}`);
    }
  }
  /**
   * Determine challenge parameters based on available inputs
   * @param {Object} params - Parameter determination inputs
   * @returns {Promise<Object>} - Determined challenge parameters
   * @private
   */
  async determineParameters(params) {
    const {
      user,
      recentChallenges,
      challengeTypeCode,
      formatTypeCode,
      focusArea,
      difficulty,
      difficultyManager,
      difficultySettings
    } = params;
    // If all parameters are provided, use them directly
    if (challengeTypeCode && formatTypeCode && focusArea && difficulty) {
      return {
        challengeTypeCode,
        formatTypeCode,
        focusArea,
        difficulty,
        difficultySettings: difficultySettings || this.calculateDefaultDifficultySettings(difficulty)
      };
    }
    // If difficultyManager is provided and parameters are missing, use it for recommendations
    if (difficultyManager && (!challengeTypeCode || !focusArea)) {
      // Get optimal next challenge recommendation
      const recommendation = difficultyManager.getNextChallengeRecommendation(user, recentChallenges);
      const determinedParams = {
        challengeTypeCode: challengeTypeCode || recommendation.challengeType,
        formatTypeCode: formatTypeCode || recommendation.formatType,
        focusArea: focusArea || recommendation.focusArea,
        difficulty: difficulty || recommendation.difficulty
      };
      // Calculate optimal difficulty if not explicitly provided
      if (!difficultySettings && difficultyManager) {
        determinedParams.difficultySettings = difficultyManager.calculateOptimalDifficulty(user, recentChallenges, determinedParams.challengeTypeCode);
      } else {
        determinedParams.difficultySettings = difficultySettings || this.calculateDefaultDifficultySettings(determinedParams.difficulty);
      }
      return determinedParams;
    }
    // Use the challenge config service for recommendations when parameters are missing
    const recommendedParams = await this.challengeConfigService.getRecommendedChallengeParameters(user, recentChallenges);
    return {
      challengeTypeCode: challengeTypeCode || recommendedParams.challengeType.code,
      formatTypeCode: formatTypeCode || recommendedParams.formatType.code,
      focusArea: focusArea || recommendedParams.focusArea,
      difficulty: difficulty || recommendedParams.difficulty,
      difficultySettings: difficultySettings || this.calculateDefaultDifficultySettings(difficulty || recommendedParams.difficulty)
    };
  }
  /**
   * Calculate default difficulty settings for a given difficulty level
   * @param {string} difficultyLevel - Difficulty level (easy, medium, hard)
   * @returns {Object} - Difficulty settings
   * @private
   */
  calculateDefaultDifficultySettings(difficultyLevel) {
    const level = difficultyLevel || 'medium';
    return {
      level,
      complexity: level === 'hard' ? 0.8 : level === 'medium' ? 0.6 : 0.4,
      depth: level === 'hard' ? 0.8 : level === 'medium' ? 0.6 : 0.4,
      timeAllocation: level === 'hard' ? 600 : level === 'medium' ? 480 : 360 // in seconds
    };
  }
  /**
   * Validate challenge parameters against provided configuration
   * @param {Object} params - Challenge parameters
   * @param {Object} _config - Configuration to validate against
   * @throws {ChallengeGenerationError} If validation fails
   * @private
   */
  async validateParameters(params, _config) {
    // Validate challenge type
    const validTypes = await this.challengeConfigService.getAllChallengeTypes();
    if (!validTypes.some(type => type.code === params.challengeTypeCode)) {
      throw new ChallengeGenerationError(`Invalid challenge type: ${params.challengeTypeCode}`);
    }
    // Validate format type
    const validFormatTypes = await this.challengeConfigService.getAllFormatTypes();
    if (!validFormatTypes.some(format => format.code === params.formatTypeCode)) {
      throw new ChallengeGenerationError(`Invalid format type: ${params.formatTypeCode}`);
    }
    // Validate focus area using the validation service
    if (this.focusAreaValidationService) {
      const focusAreaValid = await this.focusAreaValidationService.exists(params.focusArea);
      if (!focusAreaValid) {
        throw new ChallengeGenerationError(`Invalid focus area: ${params.focusArea}`);
      }
    } else {
      // Fallback to config service if validation service is not available
      const validFocusAreas = await this.challengeConfigService.getAllFocusAreaConfigs();
      if (!validFocusAreas.some(area => area.code === params.focusArea)) {
        throw new ChallengeGenerationError(`Invalid focus area: ${params.focusArea}`);
      }
    }
    // Validate difficulty level
    const validDifficulties = ['easy', 'medium', 'hard', 'beginner', 'intermediate', 'advanced'];
    if (!validDifficulties.includes(params.difficulty)) {
      throw new ChallengeGenerationError(`Invalid difficulty level: ${params.difficulty}`);
    }
    return true;
  }
  /**
   * Enrich challenge parameters with metadata from config service
   * @param {Object} params - Challenge parameters
   * @returns {Promise<Object>} - Enriched parameters
   * @private
   */
  async enrichWithMetadata(params) {
    const {
      challengeTypeCode,
      formatTypeCode
    } = params;
    // Get challenge type metadata
    const typeMetadata = await this.challengeConfigService.getChallengeTypeByCode(challengeTypeCode);
    // Get format type metadata
    const formatMetadata = await this.challengeConfigService.getFormatTypeByCode(formatTypeCode);
    return {
      ...params,
      typeMetadata,
      formatMetadata
    };
  }
}
export default ChallengeFactory;