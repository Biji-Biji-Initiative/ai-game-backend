'use strict';

/**
 * Challenge Config Service
 * 
 * Domain service for challenge configuration operations.
 * Provides a unified interface for accessing challenge-related configuration data.
 * Encapsulates repository implementation details from clients.
 */

const { createErrorMapper, withServiceErrorHandling } = require('../../../core/infra/errors/errorStandardization');
const { ChallengeConfigError } = require('../errors/ChallengeErrors');
const { challengeLogger } = require('../../../core/infra/logging/domainLogger');

/**
 * Challenge Config Service class
 */
class ChallengeConfigService {
  /**
   * Create a new ChallengeConfigService
   * @param {Object} dependencies - Dependencies
   * @param {Object} dependencies.challengeTypeRepository - Repository for challenge types
   * @param {Object} dependencies.formatTypeRepository - Repository for format types
   * @param {Object} dependencies.focusAreaConfigRepository - Repository for focus area configurations
   * @param {Object} dependencies.difficultyLevelRepository - Repository for difficulty levels
   * @param {Object} [dependencies.logger] - Logger instance
   */
  constructor({ 
    challengeTypeRepository, 
    formatTypeRepository, 
    focusAreaConfigRepository, 
    difficultyLevelRepository,
    logger 
  }) {
    if (!challengeTypeRepository) {
      throw new Error('challengeTypeRepository is required for ChallengeConfigService');
    }
    
    if (!formatTypeRepository) {
      throw new Error('formatTypeRepository is required for ChallengeConfigService');
    }
    
    if (!focusAreaConfigRepository) {
      throw new Error('focusAreaConfigRepository is required for ChallengeConfigService');
    }
    
    if (!difficultyLevelRepository) {
      throw new Error('difficultyLevelRepository is required for ChallengeConfigService');
    }
    
    this.challengeTypeRepository = challengeTypeRepository;
    this.formatTypeRepository = formatTypeRepository;
    this.focusAreaConfigRepository = focusAreaConfigRepository;
    this.difficultyLevelRepository = difficultyLevelRepository;
    this.logger = logger || challengeLogger.child({ component: 'service:challenge-config' });

    // Create error mapper for standardized error handling
    const errorMapper = createErrorMapper({
      'EntityNotFoundError': ChallengeConfigError,
      'ValidationError': ChallengeConfigError
    }, ChallengeConfigError);

    // Apply standardized error handling to methods
    this.getChallengeType = withServiceErrorHandling(this.getChallengeType.bind(this), {
      methodName: 'getChallengeType',
      domainName: 'challenge',
      logger: this.logger,
      errorMapper
    });

    this.getAllChallengeTypes = withServiceErrorHandling(this.getAllChallengeTypes.bind(this), {
      methodName: 'getAllChallengeTypes',
      domainName: 'challenge',
      logger: this.logger,
      errorMapper
    });

    this.getFormatType = withServiceErrorHandling(this.getFormatType.bind(this), {
      methodName: 'getFormatType',
      domainName: 'challenge',
      logger: this.logger,
      errorMapper
    });

    this.getAllFormatTypes = withServiceErrorHandling(this.getAllFormatTypes.bind(this), {
      methodName: 'getAllFormatTypes',
      domainName: 'challenge',
      logger: this.logger,
      errorMapper
    });

    this.getFocusAreaConfig = withServiceErrorHandling(this.getFocusAreaConfig.bind(this), {
      methodName: 'getFocusAreaConfig',
      domainName: 'challenge',
      logger: this.logger,
      errorMapper
    });

    this.getAllFocusAreaConfigs = withServiceErrorHandling(this.getAllFocusAreaConfigs.bind(this), {
      methodName: 'getAllFocusAreaConfigs',
      domainName: 'challenge',
      logger: this.logger,
      errorMapper
    });

    this.getDifficultyLevel = withServiceErrorHandling(this.getDifficultyLevel.bind(this), {
      methodName: 'getDifficultyLevel',
      domainName: 'challenge',
      logger: this.logger,
      errorMapper
    });

    this.getAllDifficultyLevels = withServiceErrorHandling(this.getAllDifficultyLevels.bind(this), {
      methodName: 'getAllDifficultyLevels',
      domainName: 'challenge',
      logger: this.logger,
      errorMapper
    });

    this.getRecommendedChallengeParameters = withServiceErrorHandling(this.getRecommendedChallengeParameters.bind(this), {
      methodName: 'getRecommendedChallengeParameters',
      domainName: 'challenge',
      logger: this.logger,
      errorMapper
    });

    this.getDifficultySettings = withServiceErrorHandling(this.getDifficultySettings.bind(this), {
      methodName: 'getDifficultySettings',
      domainName: 'challenge',
      logger: this.logger,
      errorMapper
    });

    this.validateChallengeConfig = withServiceErrorHandling(this.validateChallengeConfig.bind(this), {
      methodName: 'validateChallengeConfig',
      domainName: 'challenge',
      logger: this.logger,
      errorMapper
    });
  }

  /**
   * Get challenge type by code
   * @param {string} typeCode - Challenge type code
   * @returns {Promise<Object>} Challenge type data
   * @throws {ChallengeConfigError} If type not found or invalid code
   */
  async getChallengeType(typeCode) {
    if (!typeCode) {
      throw new ChallengeConfigError('Type code is required to get challenge type');
    }
    
    const type = await this.challengeTypeRepository.getChallengeTypeByCode(typeCode);
    
    if (!type) {
      throw new ChallengeConfigError(`Challenge type with code '${typeCode}' not found`);
    }
    
    return type;
  }

  /**
   * Get all challenge types
   * @returns {Promise<Array<Object>>} Array of challenge types
   */
  getAllChallengeTypes() {
    return this.challengeTypeRepository.getChallengeTypes();
  }

  /**
   * Get format type by code
   * @param {string} formatCode - Format type code
   * @returns {Promise<Object>} Format type data
   * @throws {ChallengeConfigError} If format not found or invalid code
   */
  async getFormatType(formatCode) {
    if (!formatCode) {
      throw new ChallengeConfigError('Format code is required to get format type');
    }
    
    const format = await this.formatTypeRepository.getFormatTypeByCode(formatCode);
    
    if (!format) {
      throw new ChallengeConfigError(`Format type with code '${formatCode}' not found`);
    }
    
    return format;
  }

  /**
   * Get all format types
   * @returns {Promise<Array<Object>>} Array of format types
   */
  getAllFormatTypes() {
    return this.formatTypeRepository.getFormatTypes();
  }

  /**
   * Get focus area config by code
   * @param {string} focusAreaCode - Focus area code
   * @returns {Promise<Object>} Focus area config data
   * @throws {ChallengeConfigError} If focus area not found or invalid code
   */
  async getFocusAreaConfig(focusAreaCode) {
    if (!focusAreaCode) {
      throw new ChallengeConfigError('Focus area code is required to get focus area config');
    }
    
    const focusArea = await this.focusAreaConfigRepository.getFocusAreaByCode(focusAreaCode);
    
    if (!focusArea) {
      throw new ChallengeConfigError(`Focus area with code '${focusAreaCode}' not found`);
    }
    
    return focusArea;
  }

  /**
   * Get all focus area configs
   * @returns {Promise<Array<Object>>} Array of focus area configs
   */
  getAllFocusAreaConfigs() {
    return this.focusAreaConfigRepository.getFocusAreas();
  }

  /**
   * Get difficulty level by code
   * @param {string} difficultyCode - Difficulty level code
   * @returns {Promise<Object>} Difficulty level data
   * @throws {ChallengeConfigError} If difficulty level not found or invalid code
   */
  async getDifficultyLevel(difficultyCode) {
    if (!difficultyCode) {
      throw new ChallengeConfigError('Difficulty code is required to get difficulty level');
    }
    
    const difficulty = await this.difficultyLevelRepository.getDifficultyLevelByCode(difficultyCode);
    
    if (!difficulty) {
      throw new ChallengeConfigError(`Difficulty level with code '${difficultyCode}' not found`);
    }
    
    return difficulty;
  }

  /**
   * Get all difficulty levels
   * @returns {Promise<Array<Object>>} Array of difficulty levels
   */
  getAllDifficultyLevels() {
    return this.difficultyLevelRepository.getDifficultyLevels();
  }

  /**
   * Get difficulty settings for a specific difficulty level
   * @param {string} difficultyCode - Difficulty level code (easy, medium, hard)
   * @param {string} challengeTypeCode - Challenge type code
   * @returns {Promise<Object>} Difficulty settings
   */
  async getDifficultySettings(difficultyCode, challengeTypeCode) {
    // Get base difficulty level
    const difficultyLevel = await this.getDifficultyLevel(difficultyCode);
    
    // Get challenge type for type-specific settings
    const challengeType = await this.getChallengeType(challengeTypeCode);
    
    // Merge the base settings with any type-specific settings
    const baseSettings = difficultyLevel.settings || {};
    const typeSettings = (challengeType.difficultySettings || {})[difficultyCode] || {};
    
    return {
      ...baseSettings,
      ...typeSettings,
      level: difficultyCode
    };
  }

  /**
   * Validate a challenge configuration
   * @param {Object} config - Challenge configuration to validate
   * @param {string} config.challengeTypeCode - Challenge type code
   * @param {string} config.formatTypeCode - Format type code
   * @param {string} config.focusArea - Focus area code
   * @param {string} config.difficulty - Difficulty level code
   * @returns {Promise<boolean>} True if valid, throws error if invalid
   */
  async validateChallengeConfig(config) {
    if (!config) {
      throw new ChallengeConfigError('Config object is required for validation');
    }

    const validationPromises = [];
    const errors = [];

    // Validate challenge type if specified
    if (config.challengeTypeCode) {
      validationPromises.push(
        this.getChallengeType(config.challengeTypeCode)
          .catch(err => {
            errors.push(`Invalid challenge type: ${err.message}`);
          })
      );
    }

    // Validate format type if specified
    if (config.formatTypeCode) {
      validationPromises.push(
        this.getFormatType(config.formatTypeCode)
          .catch(err => {
            errors.push(`Invalid format type: ${err.message}`);
          })
      );
    }

    // Validate focus area if specified
    if (config.focusArea) {
      validationPromises.push(
        this.getFocusAreaConfig(config.focusArea)
          .catch(err => {
            errors.push(`Invalid focus area: ${err.message}`);
          })
      );
    }

    // Validate difficulty if specified
    if (config.difficulty) {
      validationPromises.push(
        this.getDifficultyLevel(config.difficulty)
          .catch(err => {
            errors.push(`Invalid difficulty: ${err.message}`);
          })
      );
    }

    // Wait for all validation checks to complete
    await Promise.all(validationPromises);

    // If there are any errors, throw with all error messages
    if (errors.length > 0) {
      throw new ChallengeConfigError(`Challenge configuration validation failed: ${errors.join('; ')}`);
    }

    return true;
  }

  /**
   * Get recommended challenge parameters based on user profile
   * @param {Object} user - User profile data
   * @param {Array} recentChallenges - User's recent challenges
   * @returns {Promise<Object>} Recommended challenge parameters
   * @throws {ChallengeConfigError} If user data is missing or invalid
   */
  async getRecommendedChallengeParameters(user, recentChallenges = []) {
    if (!user) {
      throw new ChallengeConfigError('User data is required for parameter recommendations');
    }
    
    // Get all available types
    const challengeTypes = await this.getAllChallengeTypes();
    const formatTypes = await this.getAllFormatTypes();
    // We load all focus areas for potential future use but don't currently use the variable
    // const focusAreas = await this.getAllFocusAreaConfigs();
    
    // Default values
    let recommendedType = challengeTypes.find(t => t.code === 'critical-analysis') || challengeTypes[0];
    let recommendedFormat = formatTypes.find(f => f.code === 'scenario') || formatTypes[0];
    let recommendedFocusArea = user.focusArea || 'AI Ethics';
    let recommendedDifficulty = 'medium';
    
    // Determine if there are completed challenges to base recommendations on
    const completedChallenges = recentChallenges.filter(c => c.status === 'completed');
    
    if (completedChallenges.length > 0) {
      // Get the most recent challenge
      const lastChallenge = completedChallenges[0];
      
      // Get the last challenge's focus area
      recommendedFocusArea = lastChallenge.focusArea;
      
      // If user scored well, increase difficulty
      const lastScore = lastChallenge.score || 0;
      if (lastScore > 80) {
        recommendedDifficulty = 'hard';
      } else if (lastScore < 60) {
        recommendedDifficulty = 'easy';
      }
      
      // Vary the challenge type to provide diversity
      const usedTypeCodes = completedChallenges.map(c => c.challengeType);
      const unusedTypes = challengeTypes.filter(t => !usedTypeCodes.includes(t.code));
      
      if (unusedTypes.length > 0) {
        // Recommend a type the user hasn't tried yet
        recommendedType = unusedTypes[0];
      } else {
        // If all types have been used, pick a different one from the last
        const lastTypeCode = lastChallenge.challengeType;
        recommendedType = challengeTypes.find(t => t.code !== lastTypeCode) || recommendedType;
      }
      
      // Same for format types
      const usedFormatCodes = completedChallenges.map(c => c.formatType);
      const unusedFormats = formatTypes.filter(f => !usedFormatCodes.includes(f.code));
      
      if (unusedFormats.length > 0) {
        recommendedFormat = unusedFormats[0];
      } else {
        const lastFormatCode = lastChallenge.formatType;
        recommendedFormat = formatTypes.find(f => f.code !== lastFormatCode) || recommendedFormat;
      }
    }
    
    // Build and return the recommendation
    return {
      challengeType: {
        code: recommendedType.code,
        name: recommendedType.name,
        metadata: {
          description: recommendedType.description
        }
      },
      formatType: {
        code: recommendedFormat.code,
        name: recommendedFormat.name,
        metadata: {
          description: recommendedFormat.description
        }
      },
      focusArea: recommendedFocusArea,
      difficulty: recommendedDifficulty
    };
  }
}

module.exports = ChallengeConfigService;
