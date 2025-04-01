'use strict';

/**
 * Application Server
 *
 * Initializes and starts the HTTP server for the application.
 * Provides a controlled startup and graceful shutdown process.
 */

import { createServer } from 'http';
import app from "#app/app.js";
import { logger } from "#app/core/infra/logging/logger.js";
import { initializeSupabase } from "#app/core/infra/db/databaseConnection.js";
import config from "#app/config/config.js";

/**
 * Start the server on the specified port
 * @param {number} port - The port to start the server on
 * @returns {Promise<http.Server>} The created server instance
 */
export async function startServer(port) {
  // Use provided port, fallback to environment variable, then config, then default
  // For production, standardize on 9000
  let PORT = port || (process.env.NODE_ENV === 'production' ? 9000 : (process.env.PORT || config.server.port || 3000));
  
  // Dynamic port allocation for cluster mode
  if (process.env.PORT_BASE && process.env.INSTANCE_ID) {
    PORT = parseInt(process.env.PORT_BASE) + parseInt(process.env.INSTANCE_ID);
    logger.info(`Running in cluster mode, using port ${PORT} for instance ${process.env.INSTANCE_ID}`);
  }
  
  try {
    // Initialize database connection
    await initializeSupabase();
    
    // Security check for production environments
    if (process.env.NODE_ENV === 'production' && 
        (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS === '*')) {
      logger.error('SECURITY RISK: ALLOWED_ORIGINS not properly configured for production');
      logger.error('Set ALLOWED_ORIGINS to a comma-separated list of allowed domains');
      throw new Error('ALLOWED_ORIGINS must be explicitly set in production');
    }
    
    // Create HTTP server
    const server = createServer(app);
    
    // Start listening on the port
    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API Documentation: http://localhost:${PORT}${process.env.API_DOCS_PATH || '/api-docs'}`);
      logger.info(`API Tester UI: http://localhost:${PORT}${process.env.API_TESTER_PATH || '/tester'}`);
      
      // Send ready signal to PM2 if we're being managed by PM2
      if (typeof process.send === 'function') {
        logger.info('Sending ready signal to PM2');
        process.send('ready');
      }
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
