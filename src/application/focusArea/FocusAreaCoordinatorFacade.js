/**
 * Focus Area Coordinator Facade
 * 
 * Provides a backward-compatible facade over the refactored coordinators
 * to maintain the existing API while internally following SRP.
 * 
 * @module FocusAreaCoordinatorFacade
 * @requires BaseCoordinator
 * @requires FocusAreaError
 */

const BaseCoordinator = require('../BaseCoordinator');
const { FocusAreaError } = require('../../core/focusArea/errors/focusAreaErrors');
const FocusAreaGenerationCoordinator = require('./FocusAreaGenerationCoordinator');
const FocusAreaManagementCoordinator = require('./FocusAreaManagementCoordinator');

/**
 * FocusAreaCoordinatorFacade class
 * Provides a unified interface to the specialized coordinators 
 */
class FocusAreaCoordinatorFacade extends BaseCoordinator {
  /**
   * Create a new FocusAreaCoordinatorFacade
   * @param {Object} dependencies - Service dependencies
   */
  constructor(dependencies) {
    super({
      name: 'FocusAreaCoordinatorFacade',
      logger: dependencies?.logger
    });
    
    // Create specialized coordinators
    this.generationCoordinator = new FocusAreaGenerationCoordinator(dependencies);
    this.managementCoordinator = new FocusAreaManagementCoordinator({
      ...dependencies,
      focusAreaGenerationCoordinator: this.generationCoordinator
    });
  }

  /**
   * Generate personalized focus areas based on user data
   * @param {Object} userData - User profile and preferences
   * @param {Array} challengeHistory - User's challenge history
   * @param {Object} progressData - User's progression data
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} List of personalized focus areas
   */
  async generateFocusAreasFromUserData(userData, challengeHistory = [], progressData = {}, options = {}) {
    return this.generationCoordinator.generateFocusAreasFromUserData(
      userData, 
      challengeHistory, 
      progressData, 
      options
    );
  }

  /**
   * Create a thread for focus area generation
   * @param {string} userId - User ID
   * @returns {Promise<string>} Thread ID for focus area generation
   */
  async createFocusAreaThread(userId) {
    return this.generationCoordinator.createFocusAreaThread(userId);
  }

  /**
   * Get focus areas for a user
   * @param {string} userId - User ID
   * @param {Object} options - Options
   * @returns {Promise<Array>} List of personalized focus areas
   */
  async getFocusAreas(userId, options = {}) {
    return this.managementCoordinator.getFocusAreas(userId, options);
  }

  /**
   * Regenerate focus areas for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Newly generated focus areas
   */
  async regenerateFocusAreas(userId) {
    return this.generationCoordinator.regenerateFocusAreas(userId);
  }

  /**
   * Get focus areas for a user by email
   * @param {string} userEmail - User email
   * @param {Object} options - Options
   * @returns {Promise<Array>} List of personalized focus areas
   */
  async getFocusAreasForUser(userEmail, options = {}) {
    return this.managementCoordinator.getFocusAreasForUser(userEmail, options);
  }

  /**
   * Set focus areas for a user
   * @param {string} email - User email
   * @param {Array} focusAreas - Focus areas to set
   * @returns {Promise<boolean>} Success status
   */
  async setFocusAreasForUser(email, focusAreas) {
    return this.managementCoordinator.setFocusAreasForUser(email, focusAreas);
  }

  /**
   * Set a user's focus area
   * @param {string} email - User email
   * @param {string} focusArea - Focus area to set
   * @returns {Promise<Object>} Updated user object
   */
  async setUserFocusArea(email, focusArea) {
    return this.managementCoordinator.setUserFocusArea(email, focusArea);
  }
}

// For backward compatibility, make the facade the default export
module.exports = FocusAreaCoordinatorFacade; 