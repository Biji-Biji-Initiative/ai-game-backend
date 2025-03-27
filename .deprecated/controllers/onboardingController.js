/**
 * User Onboarding Controller
 * Handles user registration and profile creation
 * Refactored to follow Clean Architecture principles with Dependency Injection
 */

// Import container for dependency injection
const container = require('../config/container');

// Get services and utilities from container
const logger = container.get('logger');
const { AppError } = container.get('errorHandler');
const config = container.get('config');

// Get services and repositories from container
const userService = container.get('userService');
const userRepository = container.get('userRepository');

/**
 * Create a new user profile with personality traits and AI attitudes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const onboardUser = async (req, res, next) => {
  try {
    const { 
      email, 
      fullName, 
      professionalTitle,
      location,
      country,
      personalityTraits,
      aiAttitudes 
    } = req.body;

    try {
      // Use the unified service method to register and process the user
      const user = await userService.registerAndProcessUser({
        email,
        fullName,
        professionalTitle,
        location,
        country,
        personalityTraits,
        aiAttitudes
      });

      // Return the user profile
      res.status(201).json({
        status: 'success',
        data: {
          user
        }
      });
    } catch (serviceError) {
      // Convert service errors to AppError for consistent API responses
      if (serviceError.message.includes('already exists')) {
        throw new AppError(serviceError.message, 400, { errorCode: 'DUPLICATE_RESOURCE' });
      } else if (serviceError.message.includes('required')) {
        throw new AppError(serviceError.message, 400);
      } else {
        throw new AppError(`Failed to onboard user: ${serviceError.message}`, 500);
      }
    }
  } catch (error) {
    logger.error('Error onboarding user', { error: error.message });
    next(error);
  }
};

/**
 * Get user profile by email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getUserProfile = async (req, res, next) => {
  try {
    const { email } = req.params;

    try {
      // Use the unified service method to retrieve and validate the user profile
      const user = await userService.retrieveUserProfile(email);
      
      res.status(200).json({
        status: 'success',
        data: {
          user
        }
      });
    } catch (serviceError) {
      // Convert service errors to AppError for consistent API responses
      if (serviceError.message.includes('not found')) {
        throw new AppError(serviceError.message, 404, { errorCode: 'RESOURCE_NOT_FOUND' });
      } else {
        throw new AppError(`Failed to retrieve user profile: ${serviceError.message}`, 500);
      }
    }
  } catch (error) {
    logger.error('Error getting user profile', { error: error.message, email: req.params.email });
    next(error);
  }
};

/**
 * Update user focus area
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateFocusArea = async (req, res, next) => {
  try {
    const { email } = req.params;
    const { focusArea } = req.body;

    try {
      // Use the unified service method to update the user's focus area
      const user = await userService.updateUserFocusArea(email, focusArea);
      
      res.status(200).json({
        status: 'success',
        data: {
          user
        }
      });
    } catch (serviceError) {
      // Convert service errors to AppError for consistent API responses
      if (serviceError.message.includes('not found')) {
        throw new AppError(serviceError.message, 404, { errorCode: 'RESOURCE_NOT_FOUND' });
      } else if (serviceError.message.includes('required')) {
        throw new AppError(serviceError.message, 400);
      } else if (serviceError.message.includes('Invalid focus area')) {
        throw new AppError(serviceError.message, 400, { errorCode: 'INVALID_PARAMETER' });
      } else {
        throw new AppError(`Failed to update focus area: ${serviceError.message}`, 500);
      }
    }
  } catch (error) {
    logger.error('Error updating user focus area', { error: error.message, email: req.params.email });
    next(error);
  }
};

// Export an object to allow for easier testing with dependency injection
module.exports = {
  onboardUser,
  getUserProfile,
  updateFocusArea
};
