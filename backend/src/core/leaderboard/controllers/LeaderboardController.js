import { z } from 'zod';
'use strict';

/**
 * Controller for leaderboard-related endpoints
 * Handles HTTP requests for leaderboard operations
 */
class LeaderboardController {
  /**
   * Create a new LeaderboardController
   * @param {Object} config - Configuration for the controller
   * @param {Object} config.leaderboardService - Service for leaderboard operations
   * @param {Object} config.logger - Logger instance
   */
  constructor(config) {
    this.leaderboardService = config.leaderboardService;
    this.logger = config.logger || console;
  }

  /**
   * Get leaderboard data with filtering
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async getLeaderboard(req, res) {
    try {
      const result = await this.leaderboardService.getLeaderboard({
        type: req.query.type,
        timeframe: req.query.timeframe,
        focusArea: req.query.focusArea,
        challengeId: req.query.challengeId,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined
      });
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error getting leaderboard', {
        type: req.query.type,
        timeframe: req.query.timeframe,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Submit a score to a leaderboard
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async submitLeaderboardScore(req, res) {
    try {
      const result = await this.leaderboardService.submitLeaderboardScore({
        userId: req.user.id,
        username: req.body.username || req.user.username,
        score: req.body.score,
        challengeId: req.body.challengeId,
        focusArea: req.body.focusArea,
        metadata: req.body.metadata
      });
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error submitting leaderboard score', {
        userId: req.user?.id,
        score: req.body?.score,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get a user's position on a leaderboard
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async getUserLeaderboardPosition(req, res) {
    try {
      const result = await this.leaderboardService.getUserLeaderboardPosition({
        userId: req.user.id,
        type: req.query.type,
        timeframe: req.query.timeframe,
        challengeId: req.query.challengeId,
        focusArea: req.query.focusArea,
        includeNeighbors: req.query.includeNeighbors !== 'false',
        neighborCount: req.query.neighborCount ? parseInt(req.query.neighborCount, 10) : undefined
      });
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error getting user leaderboard position', {
        userId: req.user?.id,
        type: req.query.type,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get leaderboard insights for a user
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async getLeaderboardInsights(req, res) {
    try {
      const result = await this.leaderboardService.getLeaderboardInsights(
        req.user.id,
        req.query.type || 'global'
      );
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error getting leaderboard insights', {
        userId: req.user?.id,
        type: req.query.type,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Compare user performance with average and top performers
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async comparePerformance(req, res) {
    try {
      const result = await this.leaderboardService.comparePerformance(
        req.user.id,
        req.query.challengeId
      );
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error comparing performance', {
        userId: req.user?.id,
        challengeId: req.query.challengeId,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Register routes for leaderboard endpoints
   * @param {Object} router - Express router
   * @param {Object} auth - Authentication middleware
   */
  registerRoutes(router, auth) {
    router.get('/leaderboards', this.getLeaderboard.bind(this));
    router.post('/leaderboards/scores', auth, this.submitLeaderboardScore.bind(this));
    router.get('/leaderboards/position', auth, this.getUserLeaderboardPosition.bind(this));
    router.get('/leaderboards/insights', auth, this.getLeaderboardInsights.bind(this));
    router.get('/leaderboards/compare', auth, this.comparePerformance.bind(this));
  }
}

export default LeaderboardController;
