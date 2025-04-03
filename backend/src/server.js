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
import config from "#app/config/config.js";

/**
 * Start the server on the specified port
 * @param {number} port - The port to start the server on
 * @returns {Promise<http.Server>} The created server instance
 */
export async function startServer(port) {
  // Parse command line arguments for port override
  const args = process.argv.slice(2);
  let portArg = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--port=')) {
      portArg = parseInt(args[i].split('=')[1], 10);
      break;
    }
  }

  // Port priority: 1) Function argument, 2) Command line arg, 3) ENV var, 4) Config, 5) Default
  let PORT = port || portArg || parseInt(process.env.PORT) || config.server.port || 3081;
  
  logger.info(`Selected port ${PORT} for server startup`);
  
  // Dynamic port allocation for cluster mode
  if (process.env.PORT_BASE && process.env.INSTANCE_ID) {
    PORT = parseInt(process.env.PORT_BASE) + parseInt(process.env.INSTANCE_ID);
    logger.info(`Running in cluster mode, using port ${PORT} for instance ${process.env.INSTANCE_ID}`);
  }
  
  try {
    // // Initialize database connection (REMOVED - Handled by DI container setup)
    // await initializeSupabase(); 
    
    // Security check for production environments
    if (process.env.NODE_ENV === 'production' && 
        (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS === '*')) {
      logger.error('SECURITY RISK: ALLOWED_ORIGINS not properly configured for production');
      logger.error('Set ALLOWED_ORIGINS to a comma-separated list of allowed domains');
      throw new Error('ALLOWED_ORIGINS must be explicitly set in production');
    }
    
    // Create HTTP server
    const server = createServer(app);
    
    // Start listening on the port with error handling that tries alternative ports
    const startListening = (currentPort, retryCount = 0) => {
      return new Promise((resolve, reject) => {
        const onError = (error) => {
          if (error.code === 'EADDRINUSE') {
            logger.error(`Port ${currentPort} is already in use`);
            
            if (retryCount < 3) {
              // Try next port
              const nextPort = currentPort + 1;
              logger.info(`Attempting to use alternative port: ${nextPort}`);
              resolve(startListening(nextPort, retryCount + 1));
            } else {
              reject(new Error(`Failed to find available port after ${retryCount} attempts`));
            }
          } else {
            logger.error(`Server error: ${error.message}`, { error });
            reject(error);
          }
        };

        server.once('error', onError);
        
        server.listen(currentPort, () => {
          server.removeListener('error', onError);
          
          logger.info(`Server is running on port ${currentPort}`);
          logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
          logger.info(`API Documentation: http://localhost:${currentPort}${process.env.API_DOCS_PATH || '/api-docs'}`);
          logger.info(`API Tester UI: http://localhost:${currentPort}${process.env.API_TESTER_PATH || '/tester'}`);
          
          // Send ready signal to PM2 if we're being managed by PM2
          if (typeof process.send === 'function') {
            logger.info('Sending ready signal to PM2');
            process.send('ready');
          }
          
          resolve(server);
        });
      });
    };
    
    // Start the server with automatic port retry
    const serverInstance = await startListening(PORT);
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(serverInstance));
    process.on('SIGINT', () => gracefulShutdown(serverInstance));
    
    return serverInstance;
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
