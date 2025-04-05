import { z } from 'zod';
'use strict';

/**
 * Controller for network-related endpoints
 * Handles HTTP requests for neural network operations
 */
class NetworkController {
  /**
   * Create a new NetworkController
   * @param {Object} config - Configuration for the controller
   * @param {Object} config.networkService - Service for network operations
   * @param {Object} config.logger - Logger instance
   */
  constructor(config) {
    this.networkService = config.networkService;
    this.logger = config.logger || console;
  }

  /**
   * Get a user's neural network
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async getUserNetwork(req, res) {
    try {
      const result = await this.networkService.getUserNetwork(req.user.id);
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error getting user network', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Update network progress based on challenge results
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async updateNetworkProgress(req, res) {
    try {
      const result = await this.networkService.updateNetworkProgress({
        userId: req.user.id,
        challengeResults: req.body.challengeResults
      });
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error updating network progress', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get network statistics
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async getNetworkStats(req, res) {
    try {
      const result = await this.networkService.getNetworkStats({
        userId: req.user.id,
        includeHistory: req.query.includeHistory === 'true',
        timeframe: req.query.timeframe
      });
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error getting network stats', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get network progress history
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async getNetworkProgress(req, res) {
    try {
      const result = await this.networkService.getNetworkProgress({
        userId: req.user.id,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined
      });
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error getting network progress', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get network insights
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async getNetworkInsights(req, res) {
    try {
      const result = await this.networkService.getNetworkInsights(req.user.id);
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error getting network insights', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get growth recommendations
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async getGrowthRecommendations(req, res) {
    try {
      const result = await this.networkService.getGrowthRecommendations(req.user.id);
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error getting growth recommendations', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Compare networks between user and rival
   * @param {Object} req - HTTP request
   * @param {Object} res - HTTP response
   * @returns {Promise<void>}
   */
  async compareNetworks(req, res) {
    try {
      const result = await this.networkService.compareNetworks(
        req.user.id,
        req.params.rivalId
      );
      
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error comparing networks', {
        userId: req.user?.id,
        rivalId: req.params.rivalId,
        error: error.message
      });
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Register routes for network endpoints
   * @param {Object} router - Express router
   * @param {Object} auth - Authentication middleware
   */
  registerRoutes(router, auth) {
    router.get('/networks/user', auth, this.getUserNetwork.bind(this));
    router.post('/networks/progress', auth, this.updateNetworkProgress.bind(this));
    router.get('/networks/stats', auth, this.getNetworkStats.bind(this));
    router.get('/networks/progress', auth, this.getNetworkProgress.bind(this));
    router.get('/networks/insights', auth, this.getNetworkInsights.bind(this));
    router.get('/networks/growth', auth, this.getGrowthRecommendations.bind(this));
    router.get('/networks/compare/:rivalId', auth, this.compareNetworks.bind(this));
  }
}

export default NetworkController;
