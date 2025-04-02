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
     * @param {Function} [dependencies.runDatabaseHealthCheck] - Function to check database health
     * @param {Object} dependencies.openAIClient - OpenAI client instance
     * @param {Function} [dependencies.checkOpenAIStatus] - Optional: Specific function to check status
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(dependencies) { // Accept dependencies object directly
        const { runDatabaseHealthCheck, openAIClient, checkOpenAIStatus, logger } = dependencies || {};

        if (!logger) {
            // Cannot log if logger is missing, throw immediately
            throw new Error('Logger is required for HealthCheckService constructor');
        }
        this.logger = logger;
        
        // Log received dependencies
        this.logger.debug('[HealthCheckService Constructor] Received dependencies:', {
             hasLogger: !!dependencies?.logger,
             hasDbCheckFn: typeof dependencies?.runDatabaseHealthCheck === 'function',
             hasAiClient: !!dependencies?.openAIClient,
             hasAiCheckFn: typeof dependencies?.checkOpenAIStatus === 'function'
        });
        
        this.logger.info('HealthCheckService initializing...');

        // Create fallback implementation if needed
        if (typeof runDatabaseHealthCheck !== 'function') {
            this.logger.warn('No runDatabaseHealthCheck function provided, using fallback implementation');
            this.runDatabaseHealthCheck = async () => {
                this.logger.debug('Using fallback database health check');
                try {
                    // Simple diagnostic check that always returns an object with the correct shape
                    return {
                        status: 'unknown',
                        message: 'Database health check function not available',
                        responseTime: 0
                    };
                } catch (error) {
                    return {
                        status: 'error',
                        message: `Fallback database check error: ${error.message}`,
                        responseTime: 0
                    };
                }
            };
        } else {
            this.runDatabaseHealthCheck = runDatabaseHealthCheck;
        }
        
        this.openAIClient = openAIClient; // Can be null/undefined if not provided/registered
        this.externalCheckOpenAIStatus = typeof checkOpenAIStatus === 'function' ? checkOpenAIStatus : null; 
        
        this.logger.info('HealthCheckService initialized successfully', { 
             hasOpenAIClient: !!this.openAIClient, 
             hasExternalChecker: !!this.externalCheckOpenAIStatus,
             usingFallbackDbCheck: typeof runDatabaseHealthCheck !== 'function'
        });
    }
    /**
     * Perform a comprehensive health check of all system components
     * @returns {Promise<Object>} Health check results
     */
    async checkHealth() {
        this.logger.debug('Performing system health check');
        
        // Check database health
        const dbHealth = await this.runDatabaseHealthCheck();
        
        // Check OpenAI API health
        let openAIHealth = { status: 'unknown', message: 'OpenAI check not configured or client unavailable' };
        if (this.openAIClient) {
            try {
                // Prefer the client's own health check method if it exists
                if (typeof this.openAIClient.checkHealth === 'function') {
                    this.logger.debug('Using openAIClient.checkHealth method');
                    openAIHealth = await this.openAIClient.checkHealth();
                }
                // Otherwise, use the externally provided check function if available
                else if (this.externalCheckOpenAIStatus) {
                    this.logger.debug('Using external checkOpenAIStatus function');
                    openAIHealth = await this.externalCheckOpenAIStatus(this.openAIClient);
                } else {
                    this.logger.warn('OpenAI client available, but no checkHealth method or external checker function provided.');
                    openAIHealth.message = 'OpenAI health check method not found';
                }
                this.logger.debug('OpenAI health check completed', { result: openAIHealth });
            } catch (error) {
                this.logger.warn('Error during OpenAI health check', { 
                    error: error.message,
                    stack: error.stack 
                });
                openAIHealth = {
                    status: 'error',
                    message: `OpenAI health check failed: ${error.message}`,
                };
            }
        } else {
            this.logger.warn('OpenAI health check skipped: No openAIClient provided to HealthCheckService');
        }

        // Determine overall health status
        const criticalDependencies = [dbHealth]; // Define which dependencies are critical
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
