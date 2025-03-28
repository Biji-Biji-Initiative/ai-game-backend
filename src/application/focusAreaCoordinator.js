/**
 * Focus Area Coordinator
 * 
 * Application-level coordinator that orchestrates domain services for focus areas
 * This coordinator follows DDD principles by delegating business logic to domain services
 * and coordinating across multiple domains.
 * 
 * @module focusAreaCoordinator
 * @requires logger
 */

const { logger } = require('../core/infra/logging/logger');
const { FocusAreaError } = require('../core/focusArea/errors/focusAreaErrors');

/**
 * FocusAreaCoordinator class
 * Manages focus area operations across domains
 */
class FocusAreaCoordinator {
  /**
   * Create a new FocusAreaCoordinator
   * @param {Object} dependencies - Service dependencies
   * @param {Object} dependencies.userRepository - Repository for user operations
   * @param {Object} dependencies.challengeRepository - Repository for challenge operations
   * @param {Object} dependencies.progressRepository - Repository for progress operations
   * @param {Object} dependencies.focusAreaRepository - Repository for focus area operations
   * @param {Object} dependencies.focusAreaThreadService - Service for focus area thread management
   * @param {Object} dependencies.focusAreaGenerationService - Service for focus area generation
   * @param {Object} dependencies.eventBus - Event bus for domain events
   * @param {Object} dependencies.EventTypes - Event type constants
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor(dependencies) {
    // Validate required dependencies
    if (!dependencies) {
      throw new Error('Dependencies are required for FocusAreaCoordinator');
    }
    
    const {
      userRepository,
      challengeRepository,
      progressRepository,
      focusAreaRepository,
      focusAreaThreadService,
      focusAreaGenerationService,
      eventBus,
      EventTypes,
      logger: customLogger
    } = dependencies;
    
    // Validate critical dependencies
    if (!userRepository) throw new Error('userRepository is required');
    if (!focusAreaRepository) throw new Error('focusAreaRepository is required');
    if (!focusAreaThreadService) throw new Error('focusAreaThreadService is required');
    if (!focusAreaGenerationService) throw new Error('focusAreaGenerationService is required');
    
    this.userRepository = userRepository;
    this.challengeRepository = challengeRepository;
    this.progressRepository = progressRepository;
    this.focusAreaRepository = focusAreaRepository;
    this.focusAreaThreadService = focusAreaThreadService;
    this.focusAreaGenerationService = focusAreaGenerationService;
    this.eventBus = eventBus;
    this.EventTypes = EventTypes;
    this.logger = customLogger || logger.child({ service: 'focusAreaCoordinator' });
  }

  /**
   * Generate personalized focus areas based on user data
   * This is a coordinator method that orchestrates the core domain services
   * 
   * @param {Object} userData - User profile and preferences
   * @param {Array} challengeHistory - User's challenge history
   * @param {Object} progressData - User's progression data
   * @param {Object} options - Additional options
   * @param {boolean} options.forceRefresh - Force refresh even if cached
   * @returns {Promise<Array>} List of personalized focus areas
   */
  async generateFocusAreasFromUserData(userData, challengeHistory = [], progressData = {}, options = {}) {
    try {
      // Extract key data points from user profile
      const { 
        focus_area_thread_id: threadId = null,
        id: userId = ''
      } = userData;
      
      // Validate thread ID
      if (!threadId) {
        throw new FocusAreaError('No thread ID available for focus area generation', 400);
      }
      
      this.logger.info('Initiating focus area generation process', { 
        userId,
        threadId,
        forceRefresh: !!options.forceRefresh
      });
      
      // Get previous response ID for conversation continuity
      const previousResponseId = await this.focusAreaThreadService.getLastResponseId(threadId);
      
      // Use core service to generate focus areas
      const focusAreas = await this.focusAreaGenerationService.generateFocusAreas(
        userData, 
        challengeHistory,
        progressData,
        {
          threadId,
          previousResponseId,
          temperature: 0.9
        }
      );
      
      // Update thread with the latest response
      if (focusAreas.length > 0 && focusAreas[0].metadata?.responseId) {
        await this.focusAreaThreadService.updateWithResponseId(threadId, focusAreas[0].metadata.responseId);
      }
      
      this.logger.info('Successfully generated focus areas using core service', {
        count: focusAreas.length,
        userId
      });
      
      // Return focus area objects for proper domain handling
      return focusAreas;
    } catch (error) {
      this.logger.error('Error generating focus areas from user data', { 
        error: error.message,
        userId: userData.id
      });
      
      // Wrap in domain error if not already
      if (!(error instanceof FocusAreaError)) {
        throw new FocusAreaError(`Failed to generate focus areas: ${error.message}`, 500);
      }
      
      throw error;
    }
  }

  /**
   * Create a thread for focus area generation
   * @param {string} userId - User ID
   * @returns {Promise<string>} Thread ID for focus area generation
   */
  async createFocusAreaThread(userId) {
    try {
      this.logger.info('Creating new thread for focus area generation', { userId });
      
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
      
      this.logger.info('Successfully created focus area thread', { userId, threadId });
      return threadId;
    } catch (error) {
      this.logger.error('Error creating focus area thread', { 
        error: error.message,
        userId
      });
      
      // Wrap in domain error if not already
      if (!(error instanceof FocusAreaError)) {
        throw new FocusAreaError(`Failed to create focus area thread: ${error.message}`, 500);
      }
      
      throw error;
    }
  }

  /**
   * Get focus areas for a user
   * @param {string} userId - User ID
   * @param {Object} options - Options
   * @param {boolean} options.forceRefresh - Force refresh from API even if cached
   * @returns {Promise<Array>} List of personalized focus areas
   */
  async getFocusAreas(userId, options = {}) {
    try {
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
        this.logger.info('Found existing focus areas for user', {
          userId,
          count: existingFocusAreas.length
        });
        
        return options.nameOnly 
          ? existingFocusAreas.map(area => area.name)
          : existingFocusAreas;
      }
      
      // No focus areas found or forcing refresh, generate new ones
      // Get user data
      let userData;
      try {
        userData = await this.userRepository.findById(userId);
        
        if (!userData) {
          throw new FocusAreaError(`User with ID ${userId} not found`, 404);
        }
      } catch (error) {
        if (error instanceof FocusAreaError) {
          throw error;
        }
        throw new FocusAreaError(`Failed to fetch user data: ${error.message}`, 500);
      }
      
      // Get challenge history
      let challengeHistory = [];
      try {
        challengeHistory = await this.challengeRepository?.findByUserId(userId) || [];
      } catch (error) {
        this.logger.warn('Error fetching challenge history, using empty array', {
          userId,
          error: error.message
        });
      }
      
      // Get user progress data
      let progressData = {};
      try {
        progressData = await this.progressRepository?.findByUserId(userId) || {};
      } catch (error) {
        this.logger.warn('Error fetching user progress, using empty object', {
          userId,
          error: error.message
        });
      }
      
      // Check if user has a thread ID for focus area generation
      if (!userData.focus_area_thread_id) {
        // Create a new thread for the user
        const threadId = await this.createFocusAreaThread(userId);
        userData.focus_area_thread_id = threadId;
      }
      
      // Generate focus areas
      const generatedFocusAreas = await this.generateFocusAreasFromUserData({
        ...userData,
        focus_area_thread_id: userData.focus_area_thread_id
      }, challengeHistory, progressData, { forceRefresh: options.forceRefresh });
      
      // Save the generated focus areas to the database
      await this.focusAreaRepository.save(userId, generatedFocusAreas);
      
      // Return focus areas based on requested format
      return options.nameOnly 
        ? generatedFocusAreas.map(area => area.name)
        : generatedFocusAreas;
    } catch (error) {
      this.logger.error('Error getting focus areas', { 
        error: error.message,
        userId
      });
      
      // Wrap in domain error if not already
      if (!(error instanceof FocusAreaError)) {
        throw new FocusAreaError(`Failed to get focus areas: ${error.message}`, 500);
      }
      
      throw error;
    }
  }

  /**
   * Regenerate focus areas for a user (delete existing ones and create new ones)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Newly generated focus areas
   */
  async regenerateFocusAreas(userId) {
    try {
      this.logger.info('Regenerating focus areas for user', { userId });
      
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
      
      this.logger.info('Successfully regenerated focus areas', {
        userId,
        count: generatedFocusAreas.length
      });
      
      return generatedFocusAreas;
    } catch (error) {
      this.logger.error('Error regenerating focus areas', { 
        error: error.message,
        userId
      });
      
      // Wrap in domain error if not already
      if (!(error instanceof FocusAreaError)) {
        throw new FocusAreaError(`Failed to regenerate focus areas: ${error.message}`, 500);
      }
      
      throw error;
    }
  }

  /**
   * Get focus areas for a user by email
   * @param {string} userEmail - User email
   * @param {Object} options - Options
   * @returns {Promise<Array>} List of personalized focus areas
   */
  async getFocusAreasForUser(userEmail, options = {}) {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(userEmail);
      if (!user) {
        throw new FocusAreaError(`User with email ${userEmail} not found`, 404);
      }
      
      // Get focus areas using the user's ID
      return this.getFocusAreas(user.id, { ...options, nameOnly: true });
    } catch (error) {
      this.logger.error('Error getting focus areas by email', { 
        error: error.message, 
        userEmail 
      });
      
      // Wrap in domain error if not already
      if (!(error instanceof FocusAreaError)) {
        throw new FocusAreaError(`Failed to get focus areas: ${error.message}`, 500);
      }
      
      throw error;
    }
  }

  /**
   * Set focus areas for a user
   * @param {string} email - User email
   * @param {Array} focusAreas - Focus areas to set
   * @returns {Promise<boolean>} Success status
   */
  async setFocusAreasForUser(email, focusAreas) {
    try {
      this.logger.info('Setting focus areas for user', { 
        email,
        count: focusAreas?.length
      });
      
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
      
      this.logger.info('Focus areas set successfully', { 
        email, 
        userId: user.id,
        count: focusAreas?.length
      });
      
      return true;
    } catch (error) {
      this.logger.error('Error setting focus areas for user', { 
        error: error.message, 
        email
      });
      
      // Wrap in domain error if not already
      if (!(error instanceof FocusAreaError)) {
        throw new FocusAreaError(`Failed to set focus areas: ${error.message}`, 500);
      }
      
      throw error;
    }
  }

  /**
   * Set a user's focus area
   * @param {string} email - User email
   * @param {string} focusArea - Focus area to set
   * @returns {Promise<Object>} Updated user object
   */
  async setUserFocusArea(email, focusArea) {
    try {
      this.logger.info('Setting focus area for user', { email, focusArea });
      
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
      
      this.logger.info('Focus area set successfully', { email, focusArea });
      
      return updatedUser;
    } catch (error) {
      this.logger.error('Error setting user focus area', { 
        error: error.message, 
        email,
        focusArea 
      });
      
      // Wrap in domain error if not already
      if (!(error instanceof FocusAreaError)) {
        throw new FocusAreaError(`Failed to set focus area: ${error.message}`, 500);
      }
      
      throw error;
    }
  }
}

module.exports = FocusAreaCoordinator; 