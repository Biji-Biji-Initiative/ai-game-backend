'use strict';

import { userLogger } from "#app/core/infra/logging/domainLogger.js";
import { UserNotFoundError, UserUpdateError, UserValidationError, FocusAreaError, UserError } from "#app/core/user/errors/UserErrors.js";
import { withControllerErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import { UserDTOMapper } from "#app/core/user/dtos/UserDTO.js";
/**
 * User Controller (Refactored with Standardized Error Handling)
 *
 * Handles HTTP requests related to user operations.
 * Located within the user domain following our DDD architecture.
 */
// Remove the container import as we'll inject dependencies
// Import userLogger only for fallback
/**
 *
 */
class UserController {
  /**
   * Create a new UserController
   * @param {Object} dependencies - Dependencies for the controller
   * @param {Object} dependencies.userService - User service
   * @param {Object} dependencies.userRepository - User repository (optional, prefer userService)
   * @param {Object} dependencies.focusAreaCoordinator - Focus area coordinator
   * @param {Object} dependencies.userPreferencesManager - User preferences manager
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor({
    userService,
    userRepository,
    focusAreaCoordinator,
    userPreferencesManager,
    logger
  }) {
    // Check required dependencies
    if (!userService) {
      throw new Error('userService is required for UserController');
    }
    this.userService = userService;
    this.userRepository = userRepository; // Optional, prefer using userService
    this.focusAreaCoordinator = focusAreaCoordinator;
    this.userPreferencesManager = userPreferencesManager;
    this.logger = logger || userLogger.child('controller');
    // Define error mappings for controller methods
    this.errorMappings = [{
      errorClass: UserNotFoundError,
      statusCode: 404
    }, {
      errorClass: UserValidationError,
      statusCode: 400
    }, {
      errorClass: UserUpdateError,
      statusCode: 500
    }, {
      errorClass: FocusAreaError,
      statusCode: 400
    }, {
      errorClass: UserError,
      statusCode: 500
    }];
    // Apply standardized error handling to methods
    this.createUser = withControllerErrorHandling(this.createUser.bind(this), {
      methodName: 'createUser',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    this.getUserByEmail = withControllerErrorHandling(this.getUserByEmail.bind(this), {
      methodName: 'getUserByEmail',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    this.getCurrentUser = withControllerErrorHandling(this.getCurrentUser.bind(this), {
      methodName: 'getCurrentUser',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    this.updateCurrentUser = withControllerErrorHandling(this.updateCurrentUser.bind(this), {
      methodName: 'updateCurrentUser',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    this.setFocusArea = withControllerErrorHandling(this.setFocusArea.bind(this), {
      methodName: 'setFocusArea',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    // Apply error handling wrapper to getUserProfile method
    this.getUserProfile = withControllerErrorHandling(this.getUserProfile.bind(this), {
      methodName: 'getUserProfile',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });

    // Apply error handling to new preference methods
    this.getUserPreferences = withControllerErrorHandling(this.getUserPreferences.bind(this), {
      methodName: 'getUserPreferences',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    this.getUserPreferencesByCategory = withControllerErrorHandling(this.getUserPreferencesByCategory.bind(this), {
      methodName: 'getUserPreferencesByCategory',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    this.updateUserPreferences = withControllerErrorHandling(this.updateUserPreferences.bind(this), {
      methodName: 'updateUserPreferences',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    this.updateUserPreferencesByCategory = withControllerErrorHandling(this.updateUserPreferencesByCategory.bind(this), {
      methodName: 'updateUserPreferencesByCategory',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    this.updateSinglePreference = withControllerErrorHandling(this.updateSinglePreference.bind(this), {
      methodName: 'updateSinglePreference',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    this.resetPreference = withControllerErrorHandling(this.resetPreference.bind(this), {
      methodName: 'resetPreference',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
  }
  /**
   * Create a new user (testing purposes only)
   */
  async createUser(req, res, _next) {
    // Convert request to domain parameters
    const params = UserDTOMapper.fromRequest(req.body);
    if (!params.email) {
      throw new UserValidationError('Email is required');
    }
    this.logger.debug('Creating test user', {
      email: params.email
    });
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(params.email);
    if (existingUser) {
      this.logger.info('User already exists, returning existing user', {
        email: params.email
      });
      // Convert domain entity to DTO
      const userDto = UserDTOMapper.toDTO(existingUser);
      return res.status(200).json({
        status: 'success',
        data: {
          user: userDto
        },
        message: 'User already exists'
      });
    }
    // Create a new test user
    const userData = {
      email: params.email,
      fullName: params.firstName && params.lastName ? `${params.firstName} ${params.lastName}` : 'Test User',
      // In a real app, we'd hash the password
      password: req.body.password || 'password123'
    };
    const newUser = await this.userRepository.createUser(userData);
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(newUser);
    this.logger.info('Created new test user', {
      email: params.email
    });
    return res.status(201).json({
      status: 'success',
      data: {
        user: userDto
      },
      message: 'User created successfully'
    });
  }
  /**
   * Get a user by email (testing purposes only)
   */
  async getUserByEmail(req, res, _next) {
    const {
      email
    } = req.params;
    if (!email) {
      throw new UserValidationError('Email is required');
    }
    this.logger.debug('Getting user by email', {
      email
    });
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UserNotFoundError(email);
    }
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(user);
    return res.status(200).json({
      status: 'success',
      data: {
        user: userDto
      },
      message: 'User retrieved successfully'
    });
  }
  /**
   * Get the currently authenticated user
   */
  async getCurrentUser(req, res, _next) {
    const {
      email
    } = req.user;
    this.logger.debug('Getting current user profile', {
      email
    });
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UserNotFoundError(email);
    }
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(user);
    return res.success({
      user: userDto
    }, 'User profile retrieved successfully');
  }
  /**
   * Update the currently authenticated user
   */
  async updateCurrentUser(req, res, _next) {
    const {
      email
    } = req.user;
    // Convert request to domain parameters
    const updateData = UserDTOMapper.fromRequest(req.body);
    this.logger.debug('Updating user profile', {
      email
    });
    // Delegate to the UserService for update logic
    const updatedUser = await this.userService.updateUser(email, updateData);
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(updatedUser);
    this.logger.info('User profile updated', {
      email
    });
    return res.success({
      user: userDto
    }, 'User profile updated successfully');
  }
  /**
   * Set the focus area for the current user
   */
  async setFocusArea(req, res, _next) {
    const {
      email
    } = req.user;
    const {
      focusArea
    } = req.body;
    if (!focusArea) {
      throw new UserValidationError('Focus area is required');
    }
    this.logger.debug('Setting user focus area', {
      email,
      focusArea
    });
    // Use the focusAreaCoordinator to handle the update
    // This ensures proper state management and domain event publishing
    const updatedUser = await this.focusAreaCoordinator.setUserFocusArea(email, focusArea);
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(updatedUser);
    this.logger.info('User focus area updated', {
      email,
      focusArea
    });
    return res.success({
      user: userDto
    }, 'Focus area updated successfully');
  }
  /**
   * Get a user by ID (admin only)
   */
  async getUserById(req, res, _next) {
    const {
      id
    } = req.params;
    this.logger.debug('Getting user by ID', {
      userId: id
    });
    const user = await this.userRepository.findById(id, true);
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(user);
    return res.success({
      user: userDto
    }, 'User retrieved successfully');
  }
  /**
   * List all users (admin only)
   */
  async listUsers(req, res, _next) {
    this.logger.debug('Listing all users');
    const users = await this.userRepository.findAll();
    // Convert domain entities to DTOs
    const userDtos = UserDTOMapper.toDTOCollection(users);
    this.logger.info(`Retrieved ${users.length} users`);
    return res.success({
      users: userDtos
    }, `Retrieved ${users.length} users successfully`);
  }

  /**
   * Get all preferences for the current user
   */
  async getUserPreferences(req, res, _next) {
    const { id } = req.user;
    
    this.logger.debug('Getting user preferences', { userId: id });
    const preferences = await this.userPreferencesManager.getUserPreferences(id);
    
    return res.success({
      preferences
    }, 'User preferences retrieved successfully');
  }

  /**
   * Get preferences for a specific category for the current user
   */
  async getUserPreferencesByCategory(req, res, _next) {
    const { id } = req.user;
    const { category } = req.params;
    
    this.logger.debug('Getting user preferences by category', { userId: id, category });
    const preferences = await this.userPreferencesManager.getUserPreferencesByCategory(id, category);
    
    return res.success({
      [category]: preferences
    }, `${category} preferences retrieved successfully`);
  }

  /**
   * Update all preferences for the current user
   */
  async updateUserPreferences(req, res, _next) {
    const { id } = req.user;
    const { preferences } = req.body;
    
    this.logger.debug('Updating user preferences', { userId: id });
    const updatedPreferences = await this.userPreferencesManager.updateUserPreferences(id, preferences);
    
    return res.success({
      preferences: updatedPreferences
    }, 'User preferences updated successfully');
  }

  /**
   * Update preferences for a specific category for the current user
   */
  async updateUserPreferencesByCategory(req, res, _next) {
    const { id } = req.user;
    const { category } = req.params;
    const categoryPreferences = req.body;
    
    this.logger.debug('Updating user preferences by category', { userId: id, category });
    const updatedPreferences = await this.userPreferencesManager.updateUserPreferencesByCategory(
      id, category, categoryPreferences
    );
    
    return res.success({
      [category]: updatedPreferences
    }, `${category} preferences updated successfully`);
  }

  /**
   * Update a single preference for the current user
   */
  async updateSinglePreference(req, res, _next) {
    const { id } = req.user;
    const { key } = req.params;
    const { value } = req.body;
    
    this.logger.debug('Updating single user preference', { userId: id, key });
    const updatedPreferences = await this.userPreferencesManager.setUserPreference(id, key, value);
    
    return res.success({
      preferences: updatedPreferences
    }, `Preference ${key} updated successfully`);
  }

  /**
   * Reset a preference to its default value for the current user
   */
  async resetPreference(req, res, _next) {
    const { id } = req.user;
    const { key } = req.params;
    
    this.logger.debug('Resetting user preference', { userId: id, key });
    const updatedPreferences = await this.userPreferencesManager.resetUserPreference(id, key);
    
    return res.success({
      preferences: updatedPreferences
    }, `Preference ${key} reset to default successfully`);
  }

  /**
   * Get the current user's profile
   * This method retrieves detailed profile information for the currently authenticated user
   */
  async getUserProfile(req, res, _next) {
    const { email, id } = req.user;
    
    this.logger.debug('Getting user profile data', { userId: id, email });
    
    // Get the user from the repository
    const user = await this.userRepository.findByEmail(email);
    
    if (!user) {
      throw new UserNotFoundError(email);
    }
    
    // Create a profile object with all the necessary information
    const profileData = {
      id: user.id,
      email: user.email,
      name: user.fullName || user.displayName,
      displayName: user.displayName,
      skillLevel: user.skillLevel || 'intermediate',
      profession: user.profession || user.title,
      focusAreas: user.focusAreas || [],
      learningGoals: user.learningGoals || [],
      preferredLearningStyle: user.preferredLearningStyle,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    this.logger.info('User profile retrieved successfully', { userId: id });
    
    // Return the profile data
    return res.success({
      profile: profileData
    }, 'User profile retrieved successfully');
  }

  /**
   * Update a user by ID (admin only)
   */
  async updateUser(req, res, _next) {
    const { id } = req.params;
    const updateData = UserDTOMapper.fromRequest(req.body);
    
    this.logger.debug('Updating user by ID', { userId: id });
    
    // Check if user exists first
    const user = await this.userRepository.findById(id, true);
    
    if (!user) {
      throw new UserNotFoundError(id);
    }
    
    // Delegate to the UserService for update logic
    const updatedUser = await this.userService.updateUser(user.email, updateData);
    
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(updatedUser);
    
    this.logger.info('User updated by ID', { userId: id });
    
    return res.success({
      user: userDto
    }, 'User updated successfully');
  }

  /**
   * Delete a user by ID (admin only)
   */
  async deleteUser(req, res, _next) {
    const { id } = req.params;
    
    this.logger.debug('Deleting user by ID', { userId: id });
    
    // Check if user exists first
    const user = await this.userRepository.findById(id, true);
    
    if (!user) {
      throw new UserNotFoundError(id);
    }
    
    // Delete the user
    await this.userRepository.delete(id);
    
    this.logger.info('User deleted', { userId: id });
    
    return res.success({
      deleted: true,
      userId: id
    }, 'User deleted successfully');
  }

  /**
   * Update user profile - Placeholder
   */
  async updateUserProfile(req, res, next) {
    this.logger.info('[UserController] updateUserProfile called (Placeholder)');
    // TODO: Implement profile update logic using userService
    // const userId = req.user.id; 
    // const profileData = req.body;
    try {
      // const updatedUser = await this.userService.updateProfile(userId, profileData);
      res.status(501).json({ message: 'updateUserProfile not implemented', userId: req.user?.id });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List users (Admin) - Placeholder
   */
  async listUsers(req, res, next) {
    this.logger.info('[UserController] listUsers called (Placeholder)');
    // TODO: Implement user listing logic using userService (with pagination?)
    try {
      // const users = await this.userService.listAllUsers(req.query); 
      res.status(501).json({ message: 'listUsers not implemented' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID (Admin) - Placeholder
   */
  async getUserById(req, res, next) {
    this.logger.info('[UserController] getUserById called (Placeholder)', { requestedUserId: req.params.userId });
    // TODO: Implement logic using userService
    // const userIdToFetch = req.params.userId;
    try {
      // const user = await this.userService.findById(userIdToFetch);
      // if (!user) return res.status(404).json({ message: 'User not found'});
      res.status(501).json({ message: 'getUserById not implemented', userId: req.params.userId });
    } catch (error) {
      next(error);
    }
  }
}
export default UserController;