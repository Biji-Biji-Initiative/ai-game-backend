'use strict';

/**
 * Health Check Controller - Infrastructure Layer
 *
 * Handles HTTP requests for system health checks
 */

/**
 * Health Check Controller Class
 */
class HealthCheckController {
  /**
   * Create a new HealthCheckController
   * @param {Object} dependencies - Required dependencies
   * @param {Object} dependencies.healthCheckService - Health check service instance
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor({ healthCheckService, logger }) {
    // Validate required dependencies
    if (!healthCheckService) {
      throw new Error('Health check service is required');
    }
    
    this.healthCheckService = healthCheckService;
    this.logger = logger;
    
    // Bind methods to preserve 'this' context
    this.checkHealth = this.checkHealth.bind(this);
  }

  /**
   * Handle a health check request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   * @returns {Promise<void>}
   */
  async checkHealth(req, res, _next) {
    try {
      this.logger.debug('Health check endpoint called');
      
      // Get health report from service
      const healthReport = await this.healthCheckService.checkHealth();
      
      // Determine HTTP status code
      const httpStatus = this.healthCheckService.getHttpStatus(healthReport);
      
      // Send response
      res.status(httpStatus).json(healthReport);
    } catch (error) {
      this.logger.error('Error in health check endpoint', { error: error.message });
      
      // Return a fallback error response
      res.status(500).json({
        status: 'error',
        message: 'Failed to perform health check',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = HealthCheckController; 