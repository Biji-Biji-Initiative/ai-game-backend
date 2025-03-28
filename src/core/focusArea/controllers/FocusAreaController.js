/**
 * Focus Area Controller
 * 
 * Handles HTTP requests related to focus areas.
 * Located within the focusArea domain following our DDD architecture.
 */
const { logger } = require('../../../core/infra/logging/logger');
const container = require('../../../config/container');
const { 
  FocusAreaError, 
  FocusAreaNotFoundError,
  FocusAreaGenerationError
} = require('../errors/focusAreaErrors');

// Create focused domain-specific logger
const focusAreaLogger = logger.child({ service: 'FocusAreaController' });

class FocusAreaController {
  constructor() {
    this.focusAreaCoordinator = container.get('focusAreaCoordinator');
  }

  /**
   * Get all available focus areas
   */
  async getAllFocusAreas(req, res, next) {
    try {
      const focusAreas = await this.focusAreaCoordinator.getAllFocusAreas();
      
      return res.status(200).json({
        status: 'success',
        results: focusAreas.length,
        data: {
          focusAreas
        }
      });
    } catch (error) {
      focusAreaLogger.error('Error getting all focus areas', { error: error.message });
      
      // Pass through domain errors or wrap generic errors
      if (error instanceof FocusAreaError) {
        return next(error);
      }
      
      return next(new FocusAreaError(`Failed to get focus areas: ${error.message}`));
    }
  }

  /**
   * Get focus areas for a user
   */
  async getFocusAreasForUser(req, res, next) {
    try {
      const { email } = req.params;
      // Email validation is handled by middleware
      
      const focusAreas = await this.focusAreaCoordinator.getFocusAreasForUser(email);
      
      return res.status(200).json({
        status: 'success',
        results: focusAreas.length,
        data: {
          focusAreas
        }
      });
    } catch (error) {
      focusAreaLogger.error('Error getting focus areas for user', { 
        error: error.message,
        email: req.params.email
      });
      
      if (error instanceof FocusAreaNotFoundError) {
        return next(error);
      } else if (error instanceof FocusAreaError) {
        return next(error);
      }
      
      return next(new FocusAreaError(`Failed to get focus areas: ${error.message}`));
    }
  }

  /**
   * Set focus areas for a user
   */
  async setFocusAreasForUser(req, res, next) {
    try {
      const { email } = req.params;
      const { focusAreas } = req.body;
      
      // Email and focusAreas validation handled by middleware
      
      await this.focusAreaCoordinator.setFocusAreasForUser(email, focusAreas);
      
      return res.status(200).json({
        status: 'success',
        message: 'Focus areas updated successfully'
      });
    } catch (error) {
      focusAreaLogger.error('Error setting focus areas for user', { 
        error: error.message,
        email: req.params.email
      });
      
      if (error instanceof FocusAreaNotFoundError) {
        return next(error);
      } else if (error instanceof FocusAreaError) {
        return next(error);
      }
      
      return next(new FocusAreaError(`Failed to set focus areas: ${error.message}`));
    }
  }

  /**
   * Get recommended focus areas for a user
   */
  async getRecommendedFocusAreas(req, res, next) {
    try {
      const { email } = req.params;
      const { limit } = req.query;
      
      // Email and limit validation handled by middleware
      const limitValue = limit ? parseInt(limit) : 3;
      
      const recommendations = await this.focusAreaCoordinator.getRecommendedFocusAreas(
        email,
        limitValue
      );
      
      return res.status(200).json({
        status: 'success',
        results: recommendations.length,
        data: {
          recommendations
        }
      });
    } catch (error) {
      focusAreaLogger.error('Error getting recommended focus areas', { 
        error: error.message,
        email: req.params.email
      });
      
      if (error instanceof FocusAreaNotFoundError) {
        return next(error);
      } else if (error instanceof FocusAreaError) {
        return next(error);
      }
      
      return next(new FocusAreaError(`Failed to get recommended focus areas: ${error.message}`));
    }
  }

  /**
   * Generate a new focus area (admin only)
   */
  async generateFocusArea(req, res, next) {
    try {
      const { name, description, category, difficulty } = req.body;
      
      // Input validation handled by middleware
      
      const focusArea = await this.focusAreaCoordinator.generateFocusArea({
        name,
        description,
        category: category || 'general',
        difficulty: difficulty || 'intermediate'
      });
      
      return res.status(201).json({
        status: 'success',
        data: {
          focusArea
        }
      });
    } catch (error) {
      focusAreaLogger.error('Error generating focus area', { 
        error: error.message,
        name: req.body.name
      });
      
      if (error instanceof FocusAreaGenerationError) {
        return next(error);
      } else if (error instanceof FocusAreaError) {
        return next(error);
      }
      
      return next(new FocusAreaGenerationError(`Failed to generate focus area: ${error.message}`));
    }
  }
}

module.exports = FocusAreaController; 