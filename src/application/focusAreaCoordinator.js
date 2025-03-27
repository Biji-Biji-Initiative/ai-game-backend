/**
 * Focus Area Coordinator
 * 
 * Application-level coordinator that orchestrates domain services for focus areas
 * This coordinator follows DDD principles by delegating business logic to domain services
 * and coordinating across multiple domains.
 * 
 * @module focusAreaCoordinator
 * @requires focusAreaGenerationService
 * @requires focusAreaThreadService
 * @requires logger
 */

const { logger } = require('../core/infra/logging/logger');
const { container } = require('../config/container');

// Core domain services
const focusAreaGenerationService = require('../core/focusArea/services/focusAreaGenerationService');
const focusAreaThreadService = require('../core/focusArea/services/focusAreaThreadService');

// No longer getting repositories at module load time
// This fixes the circular dependency issue

/**
 * Generate personalized focus areas based on user data
 * This is a coordinator method that orchestrates the core domain services
 * 
 * @param {Object} userData - User profile and preferences
 * @param {Array} challengeHistory - User's challenge history
 * @param {Object} progressData - User's skill progression data
 * @param {Object} options - Additional options
 * @param {boolean} options.forceRefresh - Force refresh even if cached
 * @returns {Promise<Array>} List of personalized focus areas
 */
const generateFocusAreasFromUserData = async (userData, challengeHistory = [], progressData = {}, options = {}) => {
  // Get userRepository at runtime instead of module load time
  const userRepository = container.get('userRepository');
  
  try {
    // Extract key data points from user profile
    const { 
      focus_area_thread_id: threadId = null,
      id: userId = ''
    } = userData;
    
    // Validate thread ID
    if (!threadId) {
      const error = new Error('No thread ID available for focus area generation');
      error.code = 'MISSING_THREAD_ID';
      error.context = { userId };
      logger.error('Missing thread ID for focus area generation', { userId });
      throw error;
    }
    
    logger.info('Initiating focus area generation process', { 
      userId,
      threadId,
      forceRefresh: !!options.forceRefresh
    });
    
    // Get previous response ID for conversation continuity
    const previousResponseId = await focusAreaThreadService.getLastResponseId(threadId);
    
    // Use core service to generate focus areas
    const focusAreas = await focusAreaGenerationService.generateFocusAreas(
      userData, 
      challengeHistory,
      progressData,
      {
        threadId,
        previousResponseId,
        temperature: 0.9,
        forceRefresh: options.forceRefresh
      }
    );
    
    // Update thread with the latest response
    if (focusAreas.length > 0 && focusAreas[0].metadata?.responseId) {
      await focusAreaThreadService.updateWithResponseId(threadId, focusAreas[0].metadata.responseId);
    }
    
    logger.info('Successfully generated focus areas using core service', {
      count: focusAreas.length,
      userId
    });
    
    // Return focus area names for backward compatibility
    return focusAreas.map(area => area.name);
  } catch (error) {
    // Add context to errors from other parts of the function
    if (!error.context) {
      error.context = { userId: userData.id };
    }
    if (!error.code) {
      error.code = 'FOCUS_AREA_GENERATION_ERROR';
    }
    
    logger.error('Error generating focus areas from user data', { 
      error: error.message,
      code: error.code,
      context: error.context
    });
    
    // Always propagate the error - never use fallbacks
    throw error;
  }
};

/**
 * Create a thread for focus area generation
 * @param {string} userId - User ID
 * @returns {Promise<string>} Thread ID for focus area generation
 */
const createFocusAreaThread = async (userId) => {
  // Get userRepository at runtime
  const userRepository = container.get('userRepository');
  
  try {
    logger.info('Creating new thread for focus area generation', { userId });
    
    // Use core service to create thread
    const threadId = await focusAreaThreadService.createThread(userId);
    
    try {
      // Try to update user record with the new thread ID
      // This might fail for test users that don't exist in the database
      await userRepository.updateById(userId, { focus_area_thread_id: threadId });
    } catch (updateError) {
      // Log the error but continue, since we already have the thread ID
      logger.warn('Could not update user record with thread ID - this is expected for test users', { 
        userId, 
        threadId,
        error: updateError.message
      });
    }
    
    logger.info('Successfully created focus area thread', { userId, threadId });
    return threadId;
  } catch (error) {
    // Enhance error with additional context if not already present
    if (!error.context) {
      error.context = { userId };
    }
    if (!error.code) {
      error.code = 'FOCUS_AREA_THREAD_ERROR';
    }
    
    logger.error('Error creating focus area thread', { 
      error: error.message,
      code: error.code,
      context: error.context
    });
    
    throw error;
  }
};

/**
 * Get focus areas for a user
 * @param {string} userId - User ID
 * @param {Object} options - Options
 * @param {boolean} options.forceRefresh - Force refresh from API even if cached
 * @returns {Promise<Array>} List of personalized focus areas
 */
const getFocusAreas = async (userId, options = {}) => {
  // Get repositories at runtime
  const userRepository = container.get('userRepository');
  const challengeRepository = container.get('challengeRepository');
  const progressRepository = container.get('progressRepository');
  const focusAreaRepository = container.get('focusAreaRepository');
  
  try {
    // First check if the user has existing focus areas in the database
    let existingFocusAreas;
    try {
      existingFocusAreas = await focusAreaRepository.findByUserId(userId);
    } catch (error) {
      logger.warn('Error fetching existing focus areas, continuing with generation', {
        userId,
        error: error.message
      });
      existingFocusAreas = [];
    }
    
    // If focus areas exist and not forcing refresh, return them
    if (existingFocusAreas && existingFocusAreas.length > 0 && !options.forceRefresh) {
      logger.info('Found existing focus areas for user', {
        userId,
        count: existingFocusAreas.length
      });
      
      return existingFocusAreas.map(area => area.name);
    }
    
    // No focus areas found or forcing refresh, generate new ones
    // Get user data - for test users, this might not be in the database
    let userData;
    try {
      userData = await userRepository.findById(userId);
    } catch (error) {
      logger.warn('Error fetching user data, using minimal data for test user', {
        userId,
        error: error.message
      });
    }
    
    // If user not found in DB, create minimal user object for test users
    if (!userData) {
      userData = {
        id: userId,
        personality_traits: {},
        ai_attitudes: {},
        focus_area_thread_id: null
      };
    }
    
    // Get challenge history - might be empty for test users
    let challengeHistory = [];
    try {
      challengeHistory = await challengeRepository.findByUserId(userId);
    } catch (error) {
      logger.warn('Error fetching challenge history, using empty array', {
        userId,
        error: error.message
      });
    }
    
    // Get user progress data - might be empty for test users
    let progressData = {};
    try {
      progressData = await progressRepository.findByUserId(userId);
    } catch (error) {
      logger.warn('Error fetching user progress, using empty object', {
        userId,
        error: error.message
      });
    }
    
    // Check if user has a thread ID for focus area generation
    if (!userData.focus_area_thread_id) {
      // Create a new thread for the user
      const threadId = await createFocusAreaThread(userId);
      userData.focus_area_thread_id = threadId;
    }
    
    // Generate focus areas with the forceRefresh option if specified
    const generatedFocusAreas = await generateFocusAreasFromUserData({
      ...userData,
      focus_area_thread_id: userData.focus_area_thread_id
    }, challengeHistory, progressData, { forceRefresh: options.forceRefresh });
    
    // Try to save the generated focus areas to the database
    try {
      logger.debug('Saving focus areas to database', {
        userId, 
        count: generatedFocusAreas.length
      });
      
      const saved = await focusAreaRepository.save(userId, generatedFocusAreas);
      logger.info('Focus areas saved successfully', {
        userId,
        count: saved.length
      });
    } catch (error) {
      logger.warn('Could not save focus areas to database - expected for test users', {
        userId,
        error: error.message
      });
    }
    
    return generatedFocusAreas;
  } catch (error) {
    // Enhance error with additional context if not already present
    if (!error.context) {
      error.context = { userId };
    }
    if (!error.code) {
      error.code = 'FOCUS_AREA_ERROR';
    }
    
    logger.error('Error getting focus areas', { 
      error: error.message,
      code: error.code,
      context: error.context
    });
    
    throw error;
  }
};

/**
 * Regenerate focus areas for a user (delete existing ones and create new ones)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Newly generated focus areas
 */
const regenerateFocusAreas = async (userId) => {
  // Get repositories at runtime
  const userRepository = container.get('userRepository');
  const challengeRepository = container.get('challengeRepository');
  const progressRepository = container.get('progressRepository');
  const focusAreaRepository = container.get('focusAreaRepository');
  
  try {
    logger.info('Regenerating focus areas for user', { userId });
    
    // Clear cache for this user
    focusAreaGenerationService.clearCache(userId);
    
    // Get user data
    const userData = await userRepository.findById(userId);
    if (!userData) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      error.context = { userId };
      throw error;
    }
    
    // Get challenge history
    const challengeHistory = await challengeRepository.findByUserId(userId);
    
    // Get user progress data
    const progressData = await progressRepository.findByUserId(userId);
    
    // Delete existing focus areas
    await focusAreaRepository.deleteAllForUser(userId);
    
    // Check if user has a thread ID for focus area generation
    if (!userData.focus_area_thread_id) {
      // Create a new thread for the user
      const threadId = await createFocusAreaThread(userId);
      userData.focus_area_thread_id = threadId;
    }
    
    // Generate new focus areas with force refresh
    const generatedFocusAreas = await generateFocusAreasFromUserData(
      userData, 
      challengeHistory, 
      progressData, 
      { forceRefresh: true }
    );
    
    // Save the generated focus areas to the database
    await focusAreaRepository.save(userId, generatedFocusAreas);
    
    logger.info('Successfully regenerated focus areas', {
      userId,
      count: generatedFocusAreas.length
    });
    
    return generatedFocusAreas;
  } catch (error) {
    // Enhance error with additional context if not already present
    if (!error.context) {
      error.context = { userId };
    }
    if (!error.code) {
      error.code = 'FOCUS_AREA_REGENERATION_ERROR';
    }
    
    logger.error('Error regenerating focus areas', { 
      error: error.message,
      code: error.code,
      context: error.context
    });
    
    throw error;
  }
};

/**
 * Get focus areas for a user by email (legacy support)
 * @param {string} userEmail - User email
 * @param {Object} options - Options
 * @returns {Promise<Array>} List of personalized focus areas
 */
const getFocusAreasForUser = async (userEmail, options = {}) => {
  // Get userRepository at runtime
  const userRepository = container.get('userRepository');
  
  try {
    // Find user by email
    const user = await userRepository.findByEmail(userEmail);
    if (!user) {
      const error = new Error(`User not found: ${userEmail}`);
      error.code = 'USER_NOT_FOUND';
      error.context = { userEmail };
      throw error;
    }
    
    // Get focus areas using the user's ID
    return getFocusAreas(user.id, options);
  } catch (error) {
    logger.error('Error getting focus areas by email', { 
      error: error.message, 
      userEmail 
    });
    throw error;
  }
};

module.exports = {
  generateFocusAreasFromUserData,
  createFocusAreaThread,
  getFocusAreas,
  regenerateFocusAreas,
  getFocusAreasForUser
}; 