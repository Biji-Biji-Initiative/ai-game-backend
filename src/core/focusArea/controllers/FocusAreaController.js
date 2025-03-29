'use strict';

/**
 * Focus Area Controller
 * 
 * Handles HTTP requests related to focus areas.
 * Located within the focusArea domain following our DDD architecture.
 */
const { logger } = require('../../core/infra/logging/logger');
// Remove container import as we'll use dependency injection
const { 
  FocusAreaError, 
  FocusAreaNotFoundError,
  FocusAreaGenerationError,
  FocusAreaValidationError
} = require('../errors/focusAreaErrors');
const {
  withControllerErrorHandling
} = require('../../core/infra/errors/errorStandardization');

// Create focused domain-specific logger
const focusAreaLogger = logger.child({ service: 'FocusAreaController' });

/**
 *
 */
class FocusAreaController {
  /**
   * Create a new FocusAreaController
   * @param {Object} dependencies - Dependencies for the controller
   * @param {Object} dependencies.focusAreaCoordinator - Focus area coordinator service
   * @param {Object} [dependencies.logger] - Logger instance
   */
  constructor({ focusAreaCoordinator, logger }) {
    // Check required dependencies
    if (!focusAreaCoordinator) {
      throw new Error('focusAreaCoordinator is required for FocusAreaController');
    }
    
    this.focusAreaCoordinator = focusAreaCoordinator;
    this.logger = logger || focusAreaLogger;
    
    // Define error mappings for controller methods
    this.errorMappings = [
      { errorClass: FocusAreaNotFoundError, statusCode: 404 },
      { errorClass: FocusAreaValidationError, statusCode: 400 },
      { errorClass: FocusAreaGenerationError, statusCode: 500 },
      { errorClass: FocusAreaError, statusCode: 400 }
    ];
    
    // Apply standardized error handling to methods
    this.getAllFocusAreas = withControllerErrorHandling(this.getAllFocusAreas.bind(this), {
      methodName: 'getAllFocusAreas',
      domainName: 'focusArea',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    this.getFocusAreasForUser = withControllerErrorHandling(this.getFocusAreasForUser.bind(this), {
      methodName: 'getFocusAreasForUser',
      domainName: 'focusArea',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    this.setFocusAreasForUser = withControllerErrorHandling(this.setFocusAreasForUser.bind(this), {
      methodName: 'setFocusAreasForUser',
      domainName: 'focusArea',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    this.getRecommendedFocusAreas = withControllerErrorHandling(this.getRecommendedFocusAreas.bind(this), {
      methodName: 'getRecommendedFocusAreas',
      domainName: 'focusArea',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    this.generateFocusArea = withControllerErrorHandling(this.generateFocusArea.bind(this), {
      methodName: 'generateFocusArea',
      domainName: 'focusArea',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
  }

  /**
   * Get all available focus areas
   */
  /**
   * Method getAllFocusAreas
   */
  async getAllFocusAreas(req, res, _next) {
    const focusAreas = await this.focusAreaCoordinator.getAllFocusAreas();
    
    return res.status(200).json({
      status: 'success',
      results: focusAreas.length,
      data: {
        focusAreas
      }
    });
  }

  /**
   * Get focus areas for a user
   */
  /**
   * Method getFocusAreasForUser
   */
  async getFocusAreasForUser(req, res, _next) {
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
  }

  /**
   * Set focus areas for a user
   */
  /**
   * Method setFocusAreasForUser
   */
  async setFocusAreasForUser(req, res, _next) {
    const { email } = req.params;
    const { focusAreas } = req.body;
    
    // Email and focusAreas validation handled by middleware
    
    await this.focusAreaCoordinator.setFocusAreasForUser(email, focusAreas);
    
    return res.status(200).json({
      status: 'success',
      message: 'Focus areas updated successfully'
    });
  }

  /**
   * Get recommended focus areas for a user
   */
  /**
   * Method getRecommendedFocusAreas
   */
  async getRecommendedFocusAreas(req, res, _next) {
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
  }

  /**
   * Generate a new focus area (admin only)
   */
  /**
   * Method generateFocusArea
   */
  async generateFocusArea(req, res, _next) {
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
  }
}

module.exports = FocusAreaController; 