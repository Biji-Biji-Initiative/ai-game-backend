import { z } from 'zod';
'use strict';

/**
 * Controller for badge-related endpoints
 * Handles HTTP requests for badge operations
 */
class BadgeController {
  /**
   * Create a new BadgeController
   * @param {Object} config - Configuration for the controller
   * @param {Object} config.badgeService - Service for badge operations
   * @param {Object} config.logger - Logger instance
   */
  constructor(config) {
    this.badgeService = config.badgeService;
    this.logger = config.logger || console;
  }

  /**
   * Get all available badges
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async getAllBadges(req, res) {
    try {
      const result = await this.badgeService.getAllBadges({
        includeSecret: req.query.includeSecret === 'true',
        category: req.query.category,
        tier: req.query.tier
      });
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error getting all badges', {
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get a user's badge collection
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async getBadgeCollection(req, res) {
    try {
      const result = await this.badgeService.getBadgeCollection(req.user.id);
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error getting badge collection', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Check for newly unlocked badges
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async checkBadges(req, res) {
    try {
      const result = await this.badgeService.checkBadges({
        userId: req.user.id,
        eventType: req.body.eventType,
        eventData: req.body.eventData || {}
      });
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error checking badges', {
        userId: req.user?.id,
        eventType: req.body?.eventType,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Update badge progress
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async updateBadgeProgress(req, res) {
    try {
      const result = await this.badgeService.updateBadgeProgress({
        userId: req.user.id,
        badgeId: req.params.badgeId,
        progress: req.body.progress,
        eventContext: req.body.eventContext
      });
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error updating badge progress', {
        userId: req.user?.id,
        badgeId: req.params.badgeId,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get badge recommendations for a user
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async getBadgeRecommendations(req, res) {
    try {
      const result = await this.badgeService.getBadgeRecommendations(req.user.id);
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error getting badge recommendations', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Register routes for badge endpoints
   * @param {Object} router - Express router
   * @param {Object} auth - Authentication middleware
   */
  registerRoutes(router, auth) {
    router.get('/badges', this.getAllBadges.bind(this));
    router.get('/badges/collection', auth, this.getBadgeCollection.bind(this));
    router.post('/badges/check', auth, this.checkBadges.bind(this));
    router.put('/badges/:badgeId/progress', auth, this.updateBadgeProgress.bind(this));
    router.get('/badges/recommendations', auth, this.getBadgeRecommendations.bind(this));
  }
}

export default BadgeController;
