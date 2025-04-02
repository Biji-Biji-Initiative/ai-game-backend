'use strict';

/**
 * Health Check Controller
 * Provides health check endpoints to verify system status
 */
import { infraLogger as logger } from "#app/core/infra/logging/domainLogger.js";

class HealthCheckController {
    /**
     * Create a new HealthCheckController
     * @param {Object} healthCheckService - Service to check the health of various system components
     */
    constructor(healthCheckService) {
        this.healthCheckService = healthCheckService;
        this.logger = logger.child({ context: 'HealthCheckController' });
        this.logger.info('HealthCheckController initialized');
    }

    /**
     * Checks the health of the system
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async checkHealth(req, res, next) {
        this.logger.info('Checking system health');
        try {
            // Get health status from service
            const healthStatus = await this.healthCheckService.checkHealth();
            
            // Determine HTTP status code based on health
            const httpStatus = healthStatus.status === 'healthy' ? 200 : 503;
            
            // Send response
            res.status(httpStatus).json({
                status: httpStatus === 200 ? 'success' : 'error',
                message: `Server is ${healthStatus.status}`,
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                dependencies: healthStatus.dependencies
            });
        } catch (error) {
            this.logger.error('Error during health check:', error);
            next(error);
        }
    }
}

export default HealthCheckController; 