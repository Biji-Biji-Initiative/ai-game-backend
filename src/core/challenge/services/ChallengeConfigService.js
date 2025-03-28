/**
 * Challenge Config Service
 * 
 * Domain service for challenge configuration operations.
 * Provides a unified interface for accessing challenge-related configuration data.
 * Encapsulates repository implementation details from clients.
 */

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
  }

  /**
   * Get challenge type by code
   * @param {string} typeCode - Challenge type code
   * @returns {Promise<Object>} Challenge type data
   */
  async getChallengeType(typeCode) {
    if (!typeCode) {
      throw new Error('Type code is required to get challenge type');
    }
    
    const type = await this.challengeTypeRepository.getChallengeTypeByCode(typeCode);
    
    if (!type) {
      throw new Error(`Challenge type with code '${typeCode}' not found`);
    }
    
    return type;
  }

  /**
   * Get all challenge types
   * @returns {Promise<Array<Object>>} Array of challenge types
   */
  async getAllChallengeTypes() {
    return await this.challengeTypeRepository.getChallengeTypes();
  }

  /**
   * Get format type by code
   * @param {string} formatCode - Format type code
   * @returns {Promise<Object>} Format type data
   */
  async getFormatType(formatCode) {
    if (!formatCode) {
      throw new Error('Format code is required to get format type');
    }
    
    const format = await this.formatTypeRepository.getFormatTypeByCode(formatCode);
    
    if (!format) {
      throw new Error(`Format type with code '${formatCode}' not found`);
    }
    
    return format;
  }

  /**
   * Get all format types
   * @returns {Promise<Array<Object>>} Array of format types
   */
  async getAllFormatTypes() {
    return await this.formatTypeRepository.getFormatTypes();
  }

  /**
   * Get focus area config by code
   * @param {string} focusAreaCode - Focus area code
   * @returns {Promise<Object>} Focus area config data
   */
  async getFocusAreaConfig(focusAreaCode) {
    if (!focusAreaCode) {
      throw new Error('Focus area code is required to get focus area config');
    }
    
    const focusArea = await this.focusAreaConfigRepository.getFocusAreaByCode(focusAreaCode);
    
    if (!focusArea) {
      throw new Error(`Focus area with code '${focusAreaCode}' not found`);
    }
    
    return focusArea;
  }

  /**
   * Get all focus area configs
   * @returns {Promise<Array<Object>>} Array of focus area configs
   */
  async getAllFocusAreaConfigs() {
    return await this.focusAreaConfigRepository.getFocusAreas();
  }

  /**
   * Get difficulty level by code
   * @param {string} difficultyCode - Difficulty level code
   * @returns {Promise<Object>} Difficulty level data
   */
  async getDifficultyLevel(difficultyCode) {
    if (!difficultyCode) {
      throw new Error('Difficulty code is required to get difficulty level');
    }
    
    const difficulty = await this.difficultyLevelRepository.getDifficultyLevelByCode(difficultyCode);
    
    if (!difficulty) {
      throw new Error(`Difficulty level with code '${difficultyCode}' not found`);
    }
    
    return difficulty;
  }

  /**
   * Get all difficulty levels
   * @returns {Promise<Array<Object>>} Array of difficulty levels
   */
  async getAllDifficultyLevels() {
    return await this.difficultyLevelRepository.getDifficultyLevels();
  }

  /**
   * Get recommended challenge parameters based on user profile
   * @param {Object} user - User profile data
   * @param {Array} recentChallenges - User's recent challenges
   * @returns {Promise<Object>} Recommended challenge parameters
   */
  async getRecommendedChallengeParameters(user, recentChallenges = []) {
    if (!user) {
      throw new Error('User data is required for parameter recommendations');
    }
    
    // Get all available types
    const challengeTypes = await this.getAllChallengeTypes();
    const formatTypes = await this.getAllFormatTypes();
    const focusAreas = await this.getAllFocusAreaConfigs();
    
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