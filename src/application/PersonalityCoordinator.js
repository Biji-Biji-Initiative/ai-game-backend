/**
 * Personality Coordinator
 * 
 * Coordinates between the Personality domain and other domains.
 * Acts as an application service that handles cross-domain concerns.
 */

const { appLogger } = require('../core/infra/logging/appLogger');

class PersonalityCoordinator {
  /**
   * Create a personality coordinator
   * @param {Object} userService - User domain service
   * @param {Object} personalityService - Personality domain service
   * @param {Object} logger - Logger instance
   */
  constructor(userService, personalityService, logger) {
    this.userService = userService;
    this.personalityService = personalityService;
    this.logger = logger || appLogger.child('personalityCoordinator');
  }
  
  /**
   * Synchronize a user's preferences based on personality AI attitudes
   * This is a cross-domain operation that translates personality domain data to user domain data
   * 
   * @param {string} userId - User ID
   * @param {Object} aiAttitudes - AI attitudes from personality domain
   * @returns {Promise<Object>} Updated user preferences
   */
  async synchronizeUserPreferences(userId, aiAttitudes) {
    try {
      this.logger.debug('Synchronizing user preferences', { userId });
      
      // Get user from user domain
      const user = await this.userService.getUserById(userId);
      if (!user) {
        this.logger.warn('User not found for preferences synchronization', { userId });
        return null;
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
      
      this.logger.info('User preferences synchronized', { userId });
      return user.preferences;
    } catch (error) {
      this.logger.error('Error synchronizing user preferences', {
        error: error.message,
        userId,
        stack: error.stack
      });
      throw error;
    }
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