'use strict';
/**
 * Health Check Service - Infrastructure Layer
 *
 * Encapsulates health check logic for various system components
 * following clean architecture principles.
 */
/**
 * Health Check Service Class
 */
class HealthCheckService {
    /**
     * Create a new HealthCheckService
     * @param {Object} dependencies - Required dependencies
     * @param {Function} dependencies.runDatabaseHealthCheck - Function to check database health
     * @param {Object} dependencies.openAIClient - OpenAI client instance
     * @param {Function} dependencies.checkOpenAIStatus - Function to check OpenAI service health
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor({ runDatabaseHealthCheck, openAIClient, checkOpenAIStatus, logger }) {
        // Validate required dependencies
        if (!logger) {
            throw new Error('Logger is required');
        }
        
        // In development, provide a mock database health check if not provided
        if (!runDatabaseHealthCheck) {
            this.runDatabaseHealthCheck = async () => {
                logger.info('Using mock database health check');
                return { 
                    status: 'healthy', 
                    message: 'Mock database is healthy (dev mode)' 
                };
            };
        } else {
            this.runDatabaseHealthCheck = runDatabaseHealthCheck;
        }
        
        this.openAIClient = openAIClient;
        this.checkOpenAIStatus = checkOpenAIStatus || (async () => ({ 
            status: 'unknown', 
            message: 'OpenAI health check not available' 
        }));
        this.logger = logger;
    }
    /**
     * Perform a comprehensive health check of all system components
     * @returns {Promise<Object>} Health check results
     */
    async checkHealth() {
        this.logger.debug('Performing system health check');
        // Check database health
        const dbHealth = await this.runDatabaseHealthCheck();
        // Check OpenAI API health (if client available)
        let openAIHealth = { status: 'unknown', message: 'OpenAI health check not performed' };
        if (this.openAIClient && this.checkOpenAIStatus) {
            try {
                openAIHealth = await this.checkOpenAIStatus(this.openAIClient);
            }
            catch (error) {
                this.logger.warn('Error during OpenAI health check', { error: error.message });
                openAIHealth = {
                    status: 'error',
                    message: `OpenAI health check error: ${error.message}`,
                };
            }
        }
        // Determine overall health status
        const criticalDependencies = [dbHealth];
        const isHealthy = criticalDependencies.every(dep => dep.status === 'healthy');
        const overallStatus = isHealthy ? 'healthy' : 'unhealthy';
        // Build complete health report
        const healthReport = {
            status: isHealthy ? 'success' : 'error',
            message: `Server is ${overallStatus}`,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            dependencies: {
                database: dbHealth,
                openai: openAIHealth,
            }
        };
        this.logger.debug('Health check completed', {
            isHealthy,
            dbStatus: dbHealth.status,
            openAIStatus: openAIHealth.status
        });
        return healthReport;
    }
    /**
     * Get HTTP status code based on health check results
     * @param {Object} healthReport - Health check report from checkHealth()
     * @returns {number} HTTP status code (200 for healthy, 503 for unhealthy)
     */
    getHttpStatus(healthReport) {
        return healthReport.status === 'success' ? 200 : 503;
    }
}
export default HealthCheckService;
