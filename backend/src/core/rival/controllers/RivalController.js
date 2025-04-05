import { z } from 'zod';
'use strict';

/**
 * Controller for rival-related endpoints
 * Handles HTTP requests for rival operations
 */
class RivalController {
  /**
   * Create a new RivalController
   * @param {Object} config - Configuration for the controller
   * @param {Object} config.rivalService - Service for rival operations
   * @param {Object} config.logger - Logger instance
   */
  constructor(config) {
    this.rivalService = config.rivalService;
    this.logger = config.logger || console;
  }

  /**
   * Generate a new rival based on user traits
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async generateRival(req, res) {
    try {
      const result = await this.rivalService.generateRival({
        userId: req.user.id,
        userTraits: req.body.userTraits,
        userAttitudes: req.body.userAttitudes,
        focusArea: req.body.focusArea,
        difficultyLevel: req.body.difficultyLevel
      });
      
      res.status(201).json(result);
    } catch (error) {
      this.logger.error('Error generating rival', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get a rival by ID
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async getRivalById(req, res) {
    try {
      const result = await this.rivalService.getRivalById(req.params.rivalId);
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error getting rival by ID', {
        rivalId: req.params.rivalId,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get rivals for a user
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async getRivalsForUser(req, res) {
    try {
      const result = await this.rivalService.getRivalsForUser(req.user.id);
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error getting rivals for user', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Update rival performance for a round
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async updateRivalPerformance(req, res) {
    try {
      const result = await this.rivalService.updateRivalPerformance({
        rivalId: req.params.rivalId,
        roundKey: req.body.roundKey,
        score: req.body.score,
        userScore: req.body.userScore
      });
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error updating rival performance', {
        rivalId: req.params.rivalId,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Compare user with rival
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async compareWithRival(req, res) {
    try {
      const result = await this.rivalService.compareWithRival({
        rivalId: req.params.rivalId,
        userId: req.user.id,
        includeDetails: req.query.includeDetails !== 'false'
      });
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error comparing with rival', {
        rivalId: req.params.rivalId,
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Register routes for rival endpoints
   * @param {Object} router - Express router
   * @param {Object} auth - Authentication middleware
   */
  registerRoutes(router, auth) {
    router.post('/rivals', auth, this.generateRival.bind(this));
    router.get('/rivals/:rivalId', auth, this.getRivalById.bind(this));
    router.get('/rivals', auth, this.getRivalsForUser.bind(this));
    router.put('/rivals/:rivalId/performance', auth, this.updateRivalPerformance.bind(this));
    router.get('/rivals/:rivalId/compare', auth, this.compareWithRival.bind(this));
  }
}

export default RivalController;
