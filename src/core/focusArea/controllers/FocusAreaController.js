/**
 * Focus Area Controller
 * 
 * Handles HTTP requests related to focus areas.
 * Located within the focusArea domain following our DDD architecture.
 */
const { logger } = require('../../../core/infra/logging/logger');
const AppError = require('../../../core/infra/errors/AppError');
const container = require('../../../config/container');

class FocusAreaController {
  constructor() {
    this.focusAreaCoordinator = container.get('focusAreaCoordinator');
    this.userRepository = container.get('userRepository');
  }

  /**
   * Get all available focus areas
   */
  async getAllFocusAreas(req, res, next) {
    try {
      const focusAreas = await this.focusAreaCoordinator.getAllFocusAreas();
      
      res.status(200).json({
        status: 'success',
        results: focusAreas.length,
        data: {
          focusAreas
        }
      });
    } catch (error) {
      logger.error('Error getting all focus areas', { error: error.message });
      next(error);
    }
  }

  /**
   * Get focus areas for a user
   */
  async getFocusAreasForUser(req, res, next) {
    try {
      const { email } = req.params;
      
      if (!email) {
        throw new AppError('User email is required', 400);
      }
      
      // Check if user exists
      const user = await this.userRepository.findByEmail(email);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      const focusAreas = await this.focusAreaCoordinator.getFocusAreasForUser(email);
      
      res.status(200).json({
        status: 'success',
        results: focusAreas.length,
        data: {
          focusAreas
        }
      });
    } catch (error) {
      logger.error('Error getting focus areas for user', { error: error.message });
      next(error);
    }
  }

  /**
   * Set focus areas for a user
   */
  async setFocusAreasForUser(req, res, next) {
    try {
      const { email } = req.params;
      const { focusAreas } = req.body;
      
      if (!email) {
        throw new AppError('User email is required', 400);
      }
      
      if (!focusAreas || !Array.isArray(focusAreas)) {
        throw new AppError('Focus areas must be provided as an array', 400);
      }
      
      // Check if user exists
      const user = await this.userRepository.findByEmail(email);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      await this.focusAreaCoordinator.setFocusAreasForUser(email, focusAreas);
      
      // Get updated user
      const updatedUser = await this.userRepository.findByEmail(email);
      
      res.status(200).json({
        status: 'success',
        data: {
          user: updatedUser
        }
      });
    } catch (error) {
      logger.error('Error setting focus areas for user', { error: error.message });
      next(error);
    }
  }

  /**
   * Get recommended focus areas for a user
   */
  async getRecommendedFocusAreas(req, res, next) {
    try {
      const { email } = req.params;
      const { limit } = req.query;
      
      if (!email) {
        throw new AppError('User email is required', 400);
      }
      
      // Check if user exists
      const user = await this.userRepository.findByEmail(email);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      const recommendations = await this.focusAreaCoordinator.getRecommendedFocusAreas(
        email,
        limit ? parseInt(limit) : 3
      );
      
      res.status(200).json({
        status: 'success',
        results: recommendations.length,
        data: {
          recommendations
        }
      });
    } catch (error) {
      logger.error('Error getting recommended focus areas', { error: error.message });
      next(error);
    }
  }

  /**
   * Generate a new focus area (admin only)
   */
  async generateFocusArea(req, res, next) {
    try {
      const { name, description, category, difficulty } = req.body;
      
      if (!name) {
        throw new AppError('Focus area name is required', 400);
      }
      
      if (!description) {
        throw new AppError('Focus area description is required', 400);
      }
      
      const focusArea = await this.focusAreaCoordinator.generateFocusArea({
        name,
        description,
        category: category || 'general',
        difficulty: difficulty || 'intermediate'
      });
      
      res.status(201).json({
        status: 'success',
        data: {
          focusArea
        }
      });
    } catch (error) {
      logger.error('Error generating focus area', { error: error.message });
      next(error);
    }
  }
}

module.exports = FocusAreaController; 