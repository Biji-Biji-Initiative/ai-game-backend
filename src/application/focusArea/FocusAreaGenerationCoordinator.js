/**
 * Focus Area Generation Coordinator
 * 
 * Application-level coordinator that handles specifically the generation
 * of focus areas following Single Responsibility Principle.
 * 
 * @module FocusAreaGenerationCoordinator
 * @requires BaseCoordinator
 * @requires FocusAreaError
 */

const BaseCoordinator = require('../BaseCoordinator');
const { FocusAreaError } = require('../../core/focusArea/errors/focusAreaErrors');

/**
 * FocusAreaGenerationCoordinator class
 * Responsible specifically for generating focus areas for users
 */
class FocusAreaGenerationCoordinator extends BaseCoordinator {
  /**
   * Create a new FocusAreaGenerationCoordinator
   * @param {Object} dependencies - Service dependencies
   * @param {Object} dependencies.userRepository - Repository for user operations
   * @param {Object} dependencies.challengeRepository - Repository for challenge operations
   * @param {Object} dependencies.progressRepository - Repository for progress operations
   * @param {Object} dependencies.focusAreaRepository - Repository for focus area operations
   * @param {Object} dependencies.focusAreaThreadService - Service for focus area thread management
   * @param {Object} dependencies.focusAreaGenerationService - Service for focus area generation
   * @param {Object} dependencies.eventBus - Event bus for domain events
   * @param {Object} dependencies.eventTypes - Event type constants
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor(dependencies) {
    super({
      name: 'FocusAreaGenerationCoordinator',
      logger: dependencies?.logger
    });
    
    // Validate critical dependencies
    const requiredDependencies = [
      'userRepository',
      'focusAreaRepository',
      'focusAreaThreadService',
      'focusAreaGenerationService'
    ];
    
    this.validateDependencies(dependencies, requiredDependencies);
    
    // Initialize services
    this.userRepository = dependencies.userRepository;
    this.challengeRepository = dependencies.challengeRepository;
    this.progressRepository = dependencies.progressRepository;
    this.focusAreaRepository = dependencies.focusAreaRepository;
    this.focusAreaThreadService = dependencies.focusAreaThreadService;
    this.focusAreaGenerationService = dependencies.focusAreaGenerationService;
    this.eventBus = dependencies.eventBus;
    this.EventTypes = dependencies.eventTypes;
  }

  /**
   * Generate personalized focus areas based on user data
   * 
   * @param {Object} userData - User profile and preferences
   * @param {Array} challengeHistory - User's challenge history
   * @param {Object} progressData - User's progression data
   * @param {Object} options - Additional options
   * @param {boolean} options.forceRefresh - Force refresh even if cached
   * @returns {Promise<Array>} List of personalized focus areas
   */
  async generateFocusAreasFromUserData(userData, challengeHistory = [], progressData = {}, options = {}) {
    const context = {
      userId: userData.id,
      threadId: userData.focus_area_thread_id,
      forceRefresh: !!options.forceRefresh
    };
    
    return this.executeOperation(async () => {
      // Validate thread ID
      if (!userData.focus_area_thread_id) {
        throw new FocusAreaError('No thread ID available for focus area generation', 400);
      }
      
      // Get previous response ID for conversation continuity
      const previousResponseId = await this.focusAreaThreadService.getLastResponseId(userData.focus_area_thread_id);
      
      // Use core service to generate focus areas
      const focusAreas = await this.focusAreaGenerationService.generateFocusAreas(
        userData, 
        challengeHistory,
        progressData,
        {
          threadId: userData.focus_area_thread_id,
          previousResponseId,
          temperature: 0.9
        }
      );
      
      // Update thread with the latest response
      if (focusAreas.length > 0 && focusAreas[0].metadata?.responseId) {
        await this.focusAreaThreadService.updateWithResponseId(
          userData.focus_area_thread_id, 
          focusAreas[0].metadata.responseId
        );
      }
      
      return focusAreas;
    }, 'generateFocusAreas', context, FocusAreaError);
  }

  /**
   * Create a thread for focus area generation
   * @param {string} userId - User ID
   * @returns {Promise<string>} Thread ID for focus area generation
   */
  async createFocusAreaThread(userId) {
    return this.executeOperation(async () => {
      // Use thread service to create thread
      const threadId = await this.focusAreaThreadService.createThread(userId);
      
      try {
        // Try to update user record with the new thread ID
        await this.userRepository.updateById(userId, { focus_area_thread_id: threadId });
      } catch (updateError) {
        // Log the error but continue, since we already have the thread ID
        this.logger.warn('Could not update user record with thread ID', { 
          userId, 
          threadId,
          error: updateError.message
        });
      }
      
      return threadId;
    }, 'createFocusAreaThread', { userId }, FocusAreaError);
  }

  /**
   * Regenerate focus areas for a user (delete existing ones and create new ones)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Newly generated focus areas
   */
  async regenerateFocusAreas(userId) {
    return this.executeOperation(async () => {
      // Get user data
      const userData = await this.userRepository.findById(userId);
      if (!userData) {
        throw new FocusAreaError(`User with ID ${userId} not found`, 404);
      }
      
      // Get challenge history
      const challengeHistory = await this.challengeRepository?.findByUserId(userId) || [];
      
      // Get user progress data
      const progressData = await this.progressRepository?.findByUserId(userId) || {};
      
      // Delete existing focus areas
      await this.focusAreaRepository.deleteAllForUser(userId);
      
      // Check if user has a thread ID for focus area generation
      if (!userData.focus_area_thread_id) {
        // Create a new thread for the user
        const threadId = await this.createFocusAreaThread(userId);
        userData.focus_area_thread_id = threadId;
      }
      
      // Generate new focus areas with force refresh
      const generatedFocusAreas = await this.generateFocusAreasFromUserData(
        userData, 
        challengeHistory, 
        progressData, 
        { forceRefresh: true }
      );
      
      // Save the generated focus areas to the database
      await this.focusAreaRepository.save(userId, generatedFocusAreas);
      
      return generatedFocusAreas;
    }, 'regenerateFocusAreas', { userId }, FocusAreaError);
  }
}

module.exports = FocusAreaGenerationCoordinator; 