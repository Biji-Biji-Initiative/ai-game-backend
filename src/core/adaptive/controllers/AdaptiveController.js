'use strict';

const { applyControllerErrorHandling } = require('../../../core/infra/errors/centralizedErrorUtils');
const { AdaptiveError, AdaptiveValidationError, AdaptiveNotFoundError } = require('../errors/adaptiveErrors');
const { AuthError } = require('../../auth/errors/AuthErrors');

// Define error mappings for controllers
const errorMappings = [
  { errorClass: AdaptiveNotFoundError, statusCode: 404 },
  { errorClass: AdaptiveValidationError, statusCode: 400 },
  { errorClass: AdaptiveError, statusCode: 500 },
  { errorClass: AuthError, statusCode: 401 }
];

/**
 * Adaptive Controller
 * 
 * Handles HTTP requests related to adaptive learning operations.
 */

/**
 *
 */
class AdaptiveController {
  /**
   * Create a new AdaptiveController
   * @param {Object} dependencies - Dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.adaptiveService - Adaptive service
   */
  /**
   * Method constructor
   */
  constructor(dependencies = {}) {
    const { logger, adaptiveService } = dependencies;
    
    this.logger = logger;
    this.adaptiveService = adaptiveService;
    
    // Apply standardized error handling to controller methods using centralized utilities
    this.getRecommendations = applyControllerErrorHandling(
      this, 'getRecommendations', 'adaptive', errorMappings
    );
    
    this.generateChallenge = applyControllerErrorHandling(
      this, 'generateChallenge', 'adaptive', errorMappings
    );
    
    this.adjustDifficulty = applyControllerErrorHandling(
      this, 'adjustDifficulty', 'adaptive', errorMappings
    );
    
    this.calculateDifficulty = applyControllerErrorHandling(
      this, 'calculateDifficulty', 'adaptive', errorMappings
    );
  }

  /**
   * Get personalized recommendations for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Response} Express response
   */
  async getRecommendations(req, res) {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      throw new AuthError('Unauthorized', 401);
    }

    // Get recommendations
    const recommendations = await this.adaptiveService.getLatestRecommendations(req.user.id);

    // Return recommendations
    return res.success({
      recommendedFocusAreas: recommendations.recommendedFocusAreas,
      recommendedChallengeTypes: recommendations.recommendedChallengeTypes,
      suggestedLearningResources: recommendations.suggestedLearningResources,
      strengths: recommendations.strengths,
      weaknesses: recommendations.weaknesses
    });
  }

  /**
   * Generate a dynamic challenge for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Response} Express response
   */
  async generateChallenge(req, res) {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      throw new AuthError('Unauthorized', 401);
    }

    const { focusArea } = req.query;

    // Generate challenge
    const challengeParams = await this.adaptiveService.generateDynamicChallenge(
      req.user.id,
      focusArea || null
    );

    // Return challenge parameters
    return res.success(challengeParams);
  }

  /**
   * Adjust difficulty based on user performance
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Response} Express response
   */
  async adjustDifficulty(req, res) {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      throw new AuthError('Unauthorized', 401);
    }

    const { challengeId, score } = req.body;
    
    // Basic validation
    if (!challengeId) {
      throw new AdaptiveValidationError('Challenge ID is required');
    }

    if (isNaN(score) || score < 0 || score > 100) {
      throw new AdaptiveValidationError('Score must be a number between 0 and 100');
    }

    // Adjust difficulty
    const difficulty = await this.adaptiveService.adjustDifficulty(
      req.user.id,
      challengeId,
      score
    );

    // Return adjusted difficulty
    return res.success({ difficulty: difficulty.toSettings() });
  }

  /**
   * Calculate optimal difficulty for a user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Response} Express response
   */
  async calculateDifficulty(req, res) {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      throw new AuthError('Unauthorized', 401);
    }

    const { challengeType } = req.query;

    // Calculate difficulty
    const difficulty = await this.adaptiveService.calculateOptimalDifficulty(
      req.user.id,
      challengeType || null
    );

    // Return difficulty settings
    return res.success({ difficulty: difficulty.toSettings() });
  }
}

module.exports = AdaptiveController; 