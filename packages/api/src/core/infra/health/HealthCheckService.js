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
        this.logger.debug('Starting health check');

        // Get environment information
        const environment = process.env.NODE_ENV || 'development';
        const isProduction = environment === 'production';

        try {
            // Check database health
            let dbHealth = false;
            let dbError = null;

            try {
                dbHealth = await this.runDatabaseHealthCheck();
                this.logger.debug('Database health:', { health: dbHealth });
            } catch (error) {
                dbError = error.message;
                this.logger.error('Database health check failed:', { error });
            }

            // Check OpenAI API health
            let openAiHealth = false;
            let openAiError = null;

            try {
                openAiHealth = await this.checkOpenAIStatus(this.openAIClient);
                this.logger.debug('OpenAI API health:', { health: openAiHealth });
            } catch (error) {
                openAiError = error.message;
                this.logger.error('OpenAI API health check failed:', { error });
            }

            // Determine overall health based on critical dependencies
            const isHealthy = dbHealth && openAiHealth;

            // System metrics - more detailed in production
            let systemMetrics = {
                environment
            };

            if (isProduction) {
                // Include more detailed metrics in production
                const memoryUsage = process.memoryUsage();
                systemMetrics = {
                    ...systemMetrics,
                    memory: {
                        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
                        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
                        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
                        external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
                    },
                    process: {
                        pid: process.pid,
                        uptime: Math.floor(process.uptime()) + 's',
                        version: process.version,
                    },
                    os: {
                        platform: process.platform,
                        hostname: require('os').hostname(),
                        cpus: require('os').cpus().length,
                        loadavg: require('os').loadavg(),
                        totalmem: Math.round(require('os').totalmem() / 1024 / 1024 / 1024) + 'GB',
                        freemem: Math.round(require('os').freemem() / 1024 / 1024 / 1024) + 'GB',
                    }
                };
            }

            // Build health report
            const report = {
                status: isHealthy ? 'healthy' : 'unhealthy',
                timestamp: new Date().toISOString(),
                system: systemMetrics,
                services: {
                    api: {
                        status: 'running',
                        version: process.env.npm_package_version || 'unknown'
                    },
                    auth: {
                        status: 'running'
                    },
                    database: {
                        status: dbHealth ? 'connected' : 'disconnected',
                        error: dbError
                    },
                    openai: {
                        status: openAiHealth ? 'connected' : 'disconnected',
                        error: openAiError
                    }
                }
            };

            // Add detailed diagnostics for non-production environments
            if (!isProduction) {
                report.diagnostics = {
                    debug: true,
                    time: Date.now(),
                    env: process.env.NODE_ENV
                };
            }

            this.logger.debug('Health check complete', {
                healthy: isHealthy,
                dbHealth,
                openAiHealth
            });

            return report;
        } catch (error) {
            this.logger.error('Health check failed:', { error });
            throw error;
        }
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
