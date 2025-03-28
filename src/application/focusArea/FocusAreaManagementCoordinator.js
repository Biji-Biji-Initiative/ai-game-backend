/**
 * Focus Area Management Coordinator
 * 
 * Application-level coordinator that handles retrieval and management
 * of focus areas following Single Responsibility Principle.
 * 
 * @module FocusAreaManagementCoordinator
 * @requires BaseCoordinator
 * @requires FocusAreaError
 */

const BaseCoordinator = require('../BaseCoordinator');
const { FocusAreaError } = require('../../core/focusArea/errors/focusAreaErrors');

/**
 * FocusAreaManagementCoordinator class
 * Responsible specifically for managing and retrieving focus areas
 */
class FocusAreaManagementCoordinator extends BaseCoordinator {
  /**
   * Create a new FocusAreaManagementCoordinator
   * @param {Object} dependencies - Service dependencies
   * @param {Object} dependencies.userRepository - Repository for user operations
   * @param {Object} dependencies.focusAreaRepository - Repository for focus area operations
   * @param {Object} dependencies.eventBus - Event bus for domain events
   * @param {Object} dependencies.eventTypes - Event type constants
   * @param {Object} dependencies.focusAreaGenerationCoordinator - Coordinator for generating focus areas
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor(dependencies) {
    super({
      name: 'FocusAreaManagementCoordinator',
      logger: dependencies?.logger
    });
    
    // Validate critical dependencies
    const requiredDependencies = [
      'userRepository',
      'focusAreaRepository'
    ];
    
    this.validateDependencies(dependencies, requiredDependencies);
    
    // Initialize services
    this.userRepository = dependencies.userRepository;
    this.focusAreaRepository = dependencies.focusAreaRepository;
    this.eventBus = dependencies.eventBus;
    this.EventTypes = dependencies.eventTypes;
    this.focusAreaGenerationCoordinator = dependencies.focusAreaGenerationCoordinator;
  }

  /**
   * Get focus areas for a user
   * @param {string} userId - User ID
   * @param {Object} options - Options
   * @param {boolean} options.forceRefresh - Force refresh from API even if cached
   * @param {boolean} options.nameOnly - Return only focus area names
   * @returns {Promise<Array>} List of personalized focus areas
   */
  async getFocusAreas(userId, options = {}) {
    return this.executeOperation(async () => {
      // First check if the user has existing focus areas in the database
      let existingFocusAreas = [];
      
      try {
        existingFocusAreas = await this.focusAreaRepository.findByUserId(userId);
      } catch (error) {
        this.logger.warn('Error fetching existing focus areas, continuing with generation', {
          userId,
          error: error.message
        });
      }
      
      // If focus areas exist and not forcing refresh, return them
      if (existingFocusAreas.length > 0 && !options.forceRefresh) {
        return options.nameOnly 
          ? existingFocusAreas.map(area => area.name)
          : existingFocusAreas;
      }
      
      // No focus areas found or forcing refresh, use generation coordinator
      if (!this.focusAreaGenerationCoordinator) {
        throw new FocusAreaError('Focus area generation coordinator not available', 500);
      }
      
      // Generate new focus areas
      const generatedFocusAreas = await this.focusAreaGenerationCoordinator.regenerateFocusAreas(userId);
      
      // Return focus areas based on requested format
      return options.nameOnly 
        ? generatedFocusAreas.map(area => area.name)
        : generatedFocusAreas;
    }, 'getFocusAreas', { userId, options }, FocusAreaError);
  }

  /**
   * Get focus areas for a user by email
   * @param {string} userEmail - User email
   * @param {Object} options - Options
   * @returns {Promise<Array>} List of personalized focus areas
   */
  async getFocusAreasForUser(userEmail, options = {}) {
    return this.executeOperation(async () => {
      // Find user by email
      const user = await this.userRepository.findByEmail(userEmail);
      if (!user) {
        throw new FocusAreaError(`User with email ${userEmail} not found`, 404);
      }
      
      // Get focus areas using the user's ID
      return this.getFocusAreas(user.id, { ...options, nameOnly: true });
    }, 'getFocusAreasForUser', { userEmail }, FocusAreaError);
  }

  /**
   * Set focus areas for a user
   * @param {string} email - User email
   * @param {Array} focusAreas - Focus areas to set
   * @returns {Promise<boolean>} Success status
   */
  async setFocusAreasForUser(email, focusAreas) {
    return this.executeOperation(async () => {
      // Get the user
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new FocusAreaError(`User with email ${email} not found`, 404);
      }
      
      // Save focus areas
      await this.focusAreaRepository.deleteAllForUser(user.id);
      await this.focusAreaRepository.save(user.id, focusAreas);
      
      // Publish a domain event if event bus is available
      if (this.eventBus && this.EventTypes) {
        await this.eventBus.publishEvent(this.EventTypes.USER_FOCUS_AREAS_SET, {
          userId: user.id,
          email: user.email,
          focusAreas
        });
      }
      
      return true;
    }, 'setFocusAreasForUser', { email, focusAreaCount: focusAreas?.length }, FocusAreaError);
  }

  /**
   * Set a user's focus area
   * @param {string} email - User email
   * @param {string} focusArea - Focus area to set
   * @returns {Promise<Object>} Updated user object
   */
  async setUserFocusArea(email, focusArea) {
    return this.executeOperation(async () => {
      // Get the user
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new FocusAreaError(`User with email ${email} not found`, 404);
      }
      
      // Update the user's focus area
      const updates = { focus_area: focusArea };
      const updatedUser = await this.userRepository.updateByEmail(email, updates);
      
      // Publish a domain event if event bus is available
      if (this.eventBus && this.EventTypes) {
        await this.eventBus.publishEvent(this.EventTypes.USER_FOCUS_AREA_SET, {
          userId: user.id,
          email: user.email,
          focusArea
        });
      }
      
      return updatedUser;
    }, 'setUserFocusArea', { email, focusArea }, FocusAreaError);
  }
}

module.exports = FocusAreaManagementCoordinator; 