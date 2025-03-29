'use strict';

/**
 * User Controller (Refactored with Standardized Error Handling)
 * 
 * Handles HTTP requests related to user operations.
 * Located within the user domain following our DDD architecture.
 */
// Remove the container import as we'll inject dependencies
// Import userLogger only for fallback
const { userLogger } = require('../../core/infra/logging/domainLogger');
const { 
  UserNotFoundError, 
  UserUpdateError, 
  UserValidationError,
  FocusAreaError,
  UserError
} = require('../errors/UserErrors');
const {
  withControllerErrorHandling
} = require('../../core/infra/errors/errorStandardization');
const { UserDTOMapper } = require('../dtos/UserDTO');

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
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor({ userService, userRepository, focusAreaCoordinator, logger }) {
    // Check required dependencies
    if (!userService) {
      throw new Error('userService is required for UserController');
    }
    
    this.userService = userService;
    this.userRepository = userRepository; // Optional, prefer using userService
    this.focusAreaCoordinator = focusAreaCoordinator;
    this.logger = logger || userLogger.child('controller');
    
    // Define error mappings for controller methods
    this.errorMappings = [
      { errorClass: UserNotFoundError, statusCode: 404 },
      { errorClass: UserValidationError, statusCode: 400 },
      { errorClass: UserUpdateError, statusCode: 500 },
      { errorClass: FocusAreaError, statusCode: 400 },
      { errorClass: UserError, statusCode: 500 }
    ];
    
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
    
    // Apply to other methods as needed...
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
    
    this.logger.debug('Creating test user', { email: params.email });
    
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(params.email);
    
    if (existingUser) {
      this.logger.info('User already exists, returning existing user', { email: params.email });
      
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
      fullName: params.firstName && params.lastName ? 
        `${params.firstName} ${params.lastName}` : 
        'Test User',
      // In a real app, we'd hash the password
      password: req.body.password || 'password123'
    };
    
    const newUser = await this.userRepository.createUser(userData);
    
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(newUser);
    
    this.logger.info('Created new test user', { email: params.email });
    
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
    const { email } = req.params;
    
    if (!email) {
      throw new UserValidationError('Email is required');
    }
    
    this.logger.debug('Getting user by email', { email });
    
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
    const { email } = req.user;
    
    this.logger.debug('Getting current user profile', { email });
    
    const user = await this.userRepository.findByEmail(email);
    
    if (!user) {
      throw new UserNotFoundError(email);
    }
    
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(user);
    
    return res.success({ user: userDto }, 'User profile retrieved successfully');
  }

  /**
   * Update the currently authenticated user
   */
  async updateCurrentUser(req, res, _next) {
    const { email } = req.user;
    
    // Convert request to domain parameters
    const updateData = UserDTOMapper.fromRequest(req.body);
    
    this.logger.debug('Updating user profile', { email });
    
    // Delegate to the UserService for update logic
    const updatedUser = await this.userService.updateUser(email, updateData);
    
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(updatedUser);
    
    this.logger.info('User profile updated', { email });
    
    return res.success({ user: userDto }, 'User profile updated successfully');
  }

  /**
   * Set the focus area for the current user
   */
  async setFocusArea(req, res, _next) {
    const { email } = req.user;
    const { focusArea } = req.body;
    
    if (!focusArea) {
      throw new UserValidationError('Focus area is required');
    }
    
    this.logger.debug('Setting user focus area', { email, focusArea });
    
    // Use the focusAreaCoordinator to handle the update
    // This ensures proper state management and domain event publishing
    const updatedUser = await this.focusAreaCoordinator.setUserFocusArea(email, focusArea);
    
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(updatedUser);
    
    this.logger.info('User focus area updated', { email, focusArea });
    
    return res.success({ user: userDto }, 'Focus area updated successfully');
  }

  /**
   * Get a user by ID (admin only)
   */
  async getUserById(req, res, _next) {
    const { id } = req.params;
    
    this.logger.debug('Getting user by ID', { userId: id });
    
    const user = await this.userRepository.findById(id, true);
    
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(user);
    
    return res.success({ user: userDto }, 'User retrieved successfully');
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
    
    return res.success({ users: userDtos }, `Retrieved ${users.length} users successfully`);
  }
}

module.exports = UserController; 