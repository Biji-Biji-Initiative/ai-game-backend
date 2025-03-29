'use strict';

/**
 * Personality Coordinator
 * 
 * Coordinates between the Personality domain and other domains.
 * Acts as an application service that handles cross-domain concerns.
 */
const BaseCoordinator = require('./BaseCoordinator');

/**
 * Class representing Personality Coordinator
 * Extends BaseCoordinator for standardized error handling and operation execution
 */
class PersonalityCoordinator extends BaseCoordinator {
  /**
   * Create a personality coordinator
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.userService - User domain service
   * @param {Object} dependencies.personalityService - Personality domain service
   * @param {Object} dependencies.personalityDataLoader - Personality data loader with caching
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor(dependencies) {
    // Call super with name and logger
    super({
      name: 'PersonalityCoordinator',
      logger: dependencies?.logger
    });

    // Validate required dependencies
    const requiredDependencies = [
      'userService',
      'personalityService',
      'personalityDataLoader'
    ];
    
    this.validateDependencies(dependencies, requiredDependencies);

    // Initialize services
    this.userService = dependencies.userService;
    this.personalityService = dependencies.personalityService;
    this.dataLoader = dependencies.personalityDataLoader;
  }
  
  /**
   * Synchronize a user's preferences based on personality AI attitudes
   * This is a cross-domain operation that translates personality domain data to user domain data
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated user preferences
   */
  synchronizeUserPreferences(userId) {
    return this.executeOperation(async () => {
      // Get user from user domain
      const user = await this.userService.getUserById(userId);
      if (!user) {
        this.logger.warn('User not found for preferences synchronization', { userId });
        return null;
      }
      
      // Get AI attitudes using the data loader (cached)
      const aiAttitudes = await this.dataLoader.getAiAttitudes(userId);
      if (!aiAttitudes || Object.keys(aiAttitudes).length === 0) {
        this.logger.info('No AI attitudes found for user, using defaults', { userId });
        // Continue with default attitudes
      }
      
      // Map attitudes to preferences (pure function, no domain knowledge)
      const preferences = this._mapAttitudesToPreferences(aiAttitudes);
      
      // Update user preferences through user domain model
      this.logger.debug('Updating user preferences', { 
        userId, 
        preferences: Object.keys(preferences) 
      });
      
      // Use the dedicated domain model method to update preferences
      user.updateAIPreferences(preferences);
      
      // Save user through the UserService rather than directly with repository
      await this.userService.updateUser(userId, { preferences: user.preferences });
      
      return user.preferences;
    }, 'synchronizeUserPreferences', { userId });
  }
  
  /**
   * Get AI attitudes for a user (cached)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} AI attitudes
   */
  getAiAttitudes(userId) {
    return this.executeOperation(() => {
      return this.dataLoader.getAiAttitudes(userId);
    }, 'getAiAttitudes', { userId });
  }
  
  /**
   * Get personality traits for a user (cached)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Personality traits
   */
  getPersonalityTraits(userId) {
    return this.executeOperation(() => {
      return this.dataLoader.getPersonalityTraits(userId);
    }, 'getPersonalityTraits', { userId });
  }
  
  /**
   * Map AI attitudes to user preferences
   * Pure mapping function with no domain knowledge or side effects
   * 
   * @param {Object} aiAttitudes - AI attitudes from personality domain
   * @returns {Object} User preferences
   * @private
   */
  _mapAttitudesToPreferences(aiAttitudes) {
    // Set detail level based on tech_savvy and early_adopter scores
    const techSum = (aiAttitudes.tech_savvy || 50) + (aiAttitudes.early_adopter || 50);
    let detailLevel = 'detailed';
    
    if (techSum > 150) {
      detailLevel = 'comprehensive';
    } else if (techSum < 100) {
      detailLevel = 'basic';
    }
    
    // Set communication style based on attitudes
    let communicationStyle = 'casual';
    
    if (aiAttitudes.security_conscious && aiAttitudes.security_conscious > 70) {
      communicationStyle = 'formal';
    } else if (aiAttitudes.experimental && aiAttitudes.experimental > 70) {
      communicationStyle = 'casual';
    } else if (aiAttitudes.ethical_concern && aiAttitudes.ethical_concern > 70) {
      communicationStyle = 'technical';
    }
    
    // Set response format preferences
    let responseFormat = 'mixed';
    
    if (aiAttitudes.skeptical && aiAttitudes.skeptical > 70) {
      responseFormat = 'structured';
    } else if (aiAttitudes.early_adopter && aiAttitudes.early_adopter > 70) {
      responseFormat = 'conversational';
    }
    
    return {
      detailLevel,
      communicationStyle,
      responseFormat
    };
  }
}

module.exports = PersonalityCoordinator; 