/**
 * User Controller
 * 
 * Handles HTTP requests related to user operations.
 * Located within the user domain following our DDD architecture.
 */
const container = require('../../../config/container');
const { userLogger } = require('../../infrastructure/logging/domainLogger');
const { 
  UserNotFoundError, 
  UserUpdateError, 
  UserValidationError,
  FocusAreaError
} = require('../errors/UserErrors');

class UserController {
  constructor() {
    this.userRepository = container.get('userRepository');
    this.userService = container.get('userService');
    this.focusAreaCoordinator = container.get('focusAreaCoordinator');
    this.logger = userLogger.child('controller');
  }

  /**
   * Create a new user (testing purposes only)
   */
  async createUser(req, res, next) {
    try {
      const { email, password, fullName } = req.body;
      
      if (!email) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is required'
        });
      }
      
      this.logger.debug('Creating test user', { email });
      
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(email);
      
      if (existingUser) {
        this.logger.info('User already exists, returning existing user', { email });
        return res.status(200).json({
          status: 'success',
          data: {
            user: existingUser
          },
          message: 'User already exists'
        });
      }
      
      // Create a new test user
      const userData = {
        email,
        fullName: fullName || 'Test User',
        // In a real app, we'd hash the password
        password: password || 'password123'
      };
      
      const newUser = await this.userRepository.createUser(userData);
      
      this.logger.info('Created new test user', { email });
      
      return res.status(201).json({
        status: 'success',
        data: {
          user: newUser
        },
        message: 'User created successfully'
      });
    } catch (error) {
      this.logger.error('Error creating test user', { 
        error: error.message,
        email: req.body?.email,
        stack: error.stack
      });
      
      next(new UserUpdateError(`Failed to create test user: ${error.message}`));
    }
  }

  /**
   * Get a user by email (testing purposes only)
   */
  async getUserByEmail(req, res, next) {
    try {
      const { email } = req.params;
      
      if (!email) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is required'
        });
      }
      
      this.logger.debug('Getting user by email', { email });
      
      const user = await this.userRepository.findByEmail(email);
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: `User with email ${email} not found`
        });
      }
      
      return res.status(200).json({
        status: 'success',
        data: {
          user
        },
        message: 'User retrieved successfully'
      });
    } catch (error) {
      this.logger.error('Error getting user by email', { 
        error: error.message,
        email: req.params.email,
        stack: error.stack
      });
      
      next(new UserUpdateError(`Failed to get user by email: ${error.message}`));
    }
  }

  /**
   * Get the currently authenticated user
   */
  async getCurrentUser(req, res, next) {
    try {
      const { email } = req.user;
      
      this.logger.debug('Getting current user profile', { email });
      
      const user = await this.userRepository.findByEmail(email);
      
      if (!user) {
        throw new UserNotFoundError(email);
      }
      
      return res.success({ user }, 'User profile retrieved successfully');
    } catch (error) {
      this.logger.error('Error getting current user', { 
        error: error.message,
        email: req.user?.email,
        stack: error.stack
      });
      
      if (error instanceof UserNotFoundError) {
        return next(error);
      }
      
      next(new UserUpdateError(`Failed to get user profile: ${error.message}`));
    }
  }

  /**
   * Update the currently authenticated user
   */
  async updateCurrentUser(req, res, next) {
    try {
      const { email } = req.user;
      const updateData = req.body;
      
      this.logger.debug('Updating user profile', { email });
      
      // Delegate to the UserService for update logic
      const updatedUser = await this.userService.updateUser(email, updateData);
      
      this.logger.info('User profile updated', { email });
      
      return res.success({ user: updatedUser }, 'User profile updated successfully');
    } catch (error) {
      this.logger.error('Error updating current user', { 
        error: error.message, 
        email: req.user?.email,
        stack: error.stack
      });
      
      if (error instanceof UserNotFoundError) {
        return next(error);
      } else if (error instanceof UserValidationError) {
        return next(error);
      }
      
      next(new UserUpdateError(`Failed to update user profile: ${error.message}`));
    }
  }

  /**
   * Set the focus area for the current user
   */
  async setFocusArea(req, res, next) {
    try {
      const { email } = req.user;
      const { focusArea } = req.body;
      
      this.logger.debug('Setting user focus area', { email, focusArea });
      
      // Use the focusAreaCoordinator to handle the update
      // This ensures proper state management and domain event publishing
      const updatedUser = await this.focusAreaCoordinator.setUserFocusArea(email, focusArea);
      
      this.logger.info('User focus area updated', { email, focusArea });
      
      return res.success({ user: updatedUser }, 'Focus area updated successfully');
    } catch (error) {
      this.logger.error('Error setting focus area', { 
        error: error.message,
        email: req.user?.email,
        focusArea: req.body?.focusArea,
        stack: error.stack
      });
      
      if (error instanceof UserNotFoundError) {
        return next(error);
      } else if (error instanceof FocusAreaError) {
        return next(error);
      } else if (error instanceof UserValidationError) {
        return next(error);
      }
      
      next(new UserUpdateError(`Failed to update focus area: ${error.message}`));
    }
  }

  /**
   * Get a user by ID (admin only)
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      
      this.logger.debug('Getting user by ID', { userId: id });
      
      const user = await this.userRepository.findById(id);
      
      if (!user) {
        throw new UserNotFoundError(id);
      }
      
      return res.success({ user }, 'User retrieved successfully');
    } catch (error) {
      this.logger.error('Error getting user by ID', { 
        error: error.message,
        userId: req.params.id,
        stack: error.stack
      });
      
      if (error instanceof UserNotFoundError) {
        return next(error);
      }
      
      next(new UserUpdateError(`Failed to get user: ${error.message}`));
    }
  }

  /**
   * List all users (admin only)
   */
  async listUsers(req, res, next) {
    try {
      this.logger.debug('Listing all users');
      
      const users = await this.userRepository.findAll();
      
      this.logger.info(`Retrieved ${users.length} users`);
      
      return res.success({ users }, `Retrieved ${users.length} users successfully`);
    } catch (error) {
      this.logger.error('Error listing users', { 
        error: error.message,
        stack: error.stack
      });
      
      next(new UserUpdateError(`Failed to list users: ${error.message}`));
    }
  }
}

module.exports = UserController; 