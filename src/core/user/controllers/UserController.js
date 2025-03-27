/**
 * User Controller
 * 
 * Handles HTTP requests related to user operations.
 * Located within the user domain following our DDD architecture.
 */
const { logger } = require('../../../core/infra/logging/logger');
const AppError = require('../../../core/infra/errors/AppError');
const container = require('../../../config/container');

class UserController {
  constructor() {
    this.userRepository = container.get('userRepository');
    this.focusAreaCoordinator = container.get('focusAreaCoordinator');
  }

  /**
   * Get the currently authenticated user
   */
  async getCurrentUser(req, res, next) {
    try {
      const { email } = req.user;
      
      const user = await this.userRepository.findByEmail(email);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      res.status(200).json({
        status: 'success',
        data: {
          user
        }
      });
    } catch (error) {
      logger.error('Error getting current user', { error: error.message });
      next(error);
    }
  }

  /**
   * Update the currently authenticated user
   */
  async updateCurrentUser(req, res, next) {
    try {
      const { email } = req.user;
      const updateData = req.body;
      
      // Remove any sensitive fields that shouldn't be directly updated
      delete updateData.email;
      delete updateData.role;
      delete updateData.isAdmin;
      
      const updatedUser = await this.userRepository.update(email, updateData);
      
      if (!updatedUser) {
        throw new AppError('User not found', 404);
      }
      
      res.status(200).json({
        status: 'success',
        data: {
          user: updatedUser
        }
      });
    } catch (error) {
      logger.error('Error updating current user', { error: error.message });
      next(error);
    }
  }

  /**
   * Set the focus area for the current user
   */
  async setFocusArea(req, res, next) {
    try {
      const { email } = req.user;
      const { focusArea } = req.body;
      
      if (!focusArea) {
        throw new AppError('Focus area is required', 400);
      }
      
      // Get user
      const user = await this.userRepository.findByEmail(email);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      // Update focus area through coordinator
      await this.focusAreaCoordinator.setUserFocusArea(email, focusArea);
      
      // Get updated user
      const updatedUser = await this.userRepository.findByEmail(email);
      
      res.status(200).json({
        status: 'success',
        data: {
          user: updatedUser
        }
      });
    } catch (error) {
      logger.error('Error setting focus area', { error: error.message });
      next(error);
    }
  }

  /**
   * Get a user by ID (admin only)
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      
      const user = await this.userRepository.findById(id);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      res.status(200).json({
        status: 'success',
        data: {
          user
        }
      });
    } catch (error) {
      logger.error('Error getting user by ID', { error: error.message });
      next(error);
    }
  }

  /**
   * List all users (admin only)
   */
  async listUsers(req, res, next) {
    try {
      const users = await this.userRepository.findAll();
      
      res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
          users
        }
      });
    } catch (error) {
      logger.error('Error listing users', { error: error.message });
      next(error);
    }
  }
}

module.exports = UserController; 