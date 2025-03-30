'use strict';

/**
 * Application Server
 *
 * Initializes and starts the HTTP server for the application.
 * Provides a controlled startup and graceful shutdown process.
 */

import { createServer } from 'http';
import app from "@/app.js";
import { logger } from "./core/infra/logging/logger.js";
import { initializeSupabase } from "./core/infra/db/databaseConnection.js";
import config from "./config/config.js";

// Import health check scheduler
import healthCheckScheduler from './core/infra/monitoring/healthCheckScheduler.js';
import { monitorOpenAIHealth } from './core/infra/monitoring/openaiMonitor.js';
import { sentryConfig } from './config/monitoring.js';

/**
 * Register service health checks
 * @param {Object} container - Dependency injection container
 */
function registerHealthChecks(container) {
  try {
    // Register OpenAI health check
    const openAIClient = container.get('openAIClient');
    if (openAIClient) {
      healthCheckScheduler.registerHealthCheck(
        'openai',
        async () => monitorOpenAIHealth(openAIClient),
        { category: 'external-api', isCritical: true }
      );
    }
    
    // Register database health check
    const dbService = container.get('databaseService');
    if (dbService && typeof dbService.checkHealth === 'function') {
      healthCheckScheduler.registerHealthCheck(
        'database',
        async () => dbService.checkHealth(),
        { category: 'database', isCritical: true }
      );
    }
    
    // Register Redis health check if available
    try {
      const cacheService = container.get('cacheService');
      if (cacheService && typeof cacheService.checkHealth === 'function') {
        healthCheckScheduler.registerHealthCheck(
          'cache',
          async () => cacheService.checkHealth(),
          { category: 'cache', isCritical: false }
        );
      }
    } catch (error) {
      logger.debug('Redis cache service not available for health checks');
    }
    
    // Start health checks with configuration from monitoring config
    healthCheckScheduler.startHealthChecks(sentryConfig.healthChecks);
    logger.info('Health checks registered and started');
  } catch (error) {
    logger.error('Failed to register health checks', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Start the server on the specified port
 * @param {number} port - The port to start the server on
 * @returns {Promise<http.Server>} The created server instance
 */
export async function startServer(port) {
  // Use provided port, fallback to environment variable, then config, then default
  // For production, standardize on 9000
  const PORT = port || (process.env.NODE_ENV === 'production' ? 9000 : (process.env.PORT || config.server.port || 3000));
  
  try {
    // Initialize database connection
    await initializeSupabase();
    
    // Create HTTP server
    const server = createServer(app);
    
    // Register health checks
    import('./config/container.js').then(({ container }) => {
      registerHealthChecks(container);
    }).catch(error => {
      logger.error('Failed to load container for health checks', {
        error: error.message
      });
    });
    
    // Start listening on the port
    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API Documentation: http://localhost:${PORT}${process.env.API_DOCS_PATH || '/api-docs'}`);
      logger.info(`API Tester UI: http://localhost:${PORT}${process.env.API_TESTER_PATH || '/tester'}`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error(`Server error: ${error.message}`, { error });
      }
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));
    
    return server;
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Gracefully shut down the server
 * @param {http.Server} server - The server to shut down
 */
export function gracefulShutdown(server) {
  logger.info('Shutting down server gracefully...');
  
  server.close(() => {
    logger.info('Server shut down successfully');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds if the server doesn't close gracefully
  setTimeout(() => {
    logger.error('Server did not shut down gracefully, forcing exit');
    process.exit(1);
  }, 10000);
}

// Export for CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { startServer, gracefulShutdown };
}

// Default export for ES modules
export default { startServer, gracefulShutdown };
