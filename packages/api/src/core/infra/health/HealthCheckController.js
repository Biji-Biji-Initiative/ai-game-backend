'use strict';
/**
 * Health Check Controller - Infrastructure Layer
 *
 * Handles HTTP requests for system health checks
 */
"../../../infra/errors/errorStandardization.js125;

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
        
        // Apply standardized error handling
        this.checkHealth = withControllerErrorHandling(
            this.checkHealth.bind(this),
            {
                methodName: 'checkHealth',
                domainName: 'health',
                logger: this.logger
            }
        );
    }
    
    /**
     * Handle a health check request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     * @returns {Promise<void>}
     */
    async checkHealth(req, res, _next) {
        this.logger.debug('Health check endpoint called');
        
        // Get health report from service
        const healthReport = await this.healthCheckService.checkHealth();
        
        // Determine HTTP status code
        const httpStatus = this.healthCheckService.getHttpStatus(healthReport);
        
        // Send response
        res.status(httpStatus).json(healthReport);
    }
}

export default HealthCheckController;
"