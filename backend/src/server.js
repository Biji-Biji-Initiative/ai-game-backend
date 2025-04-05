'use strict';

/**
 * Application Server
 *
 * Initializes and starts the HTTP server for the application.
 * Provides a controlled startup and graceful shutdown process.
 */

import { createServer as createHttpServer } from 'http';
import { createServer as createNetServer } from 'net';
import app from "#app/app.js";
import { logger } from "#app/core/infra/logging/logger.js";
import config from "#app/config/config.js";
import { 
  setupShutdownHandlers,
  registerShutdownHandler,
  createDatabaseShutdownHandler,
  createEventBusShutdownHandler
} from "#app/core/infra/process/gracefulShutdown.js";

/**
 * Find an available port
 * @param {number} startPort - The starting port to check
 * @param {number} maxAttempts - Maximum number of attempts
 * @returns {Promise<number>} Available port
 */
async function findAvailablePort(startPort, maxAttempts = 10) {
  const isPortAvailable = (port) => {
    return new Promise((resolve) => {
      const server = createNetServer();
      
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          logger.error(`Error checking port ${port}:`, { error: err });
          resolve(false);
        }
      });
      
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      
      server.listen(port);
    });
  };
  
  let port = startPort;
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    logger.info(`Checking availability of port ${port} (attempt ${attempt + 1}/${maxAttempts})...`);
    
    if (await isPortAvailable(port)) {
      logger.info(`Port ${port} is available`);
      return port;
    }
    
    port++;
    attempt++;
    logger.info(`Port ${port - 1} is in use, trying port ${port}...`);
  }
  
  throw new Error(`Failed to find available port after ${maxAttempts} attempts`);
}

/**
 * Start the server on the specified port
 * @param {number} port - The port to start the server on
 * @param {Object} options - Server options
 * @returns {Promise<http.Server>} The created server instance
 */
export async function startServer(port, options = {}) {
  const appContainer = options.container || null;
  const shutdownDelay = options.shutdownDelay || 2000;
  
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
  
  logger.info(`Starting server with port ${PORT}`);
  
  // Dynamic port allocation for cluster mode
  if (process.env.PORT_BASE && process.env.INSTANCE_ID) {
    PORT = parseInt(process.env.PORT_BASE) + parseInt(process.env.INSTANCE_ID);
    logger.info(`Running in cluster mode, using port ${PORT} for instance ${process.env.INSTANCE_ID}`);
  }
  
  try {
    // Security check for production environments
    if (process.env.NODE_ENV === 'production' && 
        (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS === '*')) {
      logger.error('SECURITY RISK: ALLOWED_ORIGINS not properly configured for production');
      logger.error('Set ALLOWED_ORIGINS to a comma-separated list of allowed domains');
      throw new Error('ALLOWED_ORIGINS must be explicitly set in production');
    }
    
    // Find an available port
    PORT = await findAvailablePort(PORT);
    logger.info(`Selected port ${PORT} for server startup`);
    
    // Create HTTP server
    const server = createHttpServer(app);
    
    // Setup graceful shutdown handlers
    setupShutdownHandlers(server, {
      timeout: 30000, // 30 seconds total shutdown timeout
      exitProcess: true
    });
    
    // Register resource shutdown handlers if available in the container
    if (appContainer) {
      // Get DB client from container if available
      try {
        const db = appContainer.has('db') ? appContainer.get('db') : null;
        if (db) {
          registerShutdownHandler('database', createDatabaseShutdownHandler(db), { priority: 10 });
        }
        
        // Get event bus from container if available
        const eventBus = appContainer.has('eventBus') ? appContainer.get('eventBus') : null;
        if (eventBus) {
          registerShutdownHandler('eventBus', createEventBusShutdownHandler(eventBus), { priority: 8 });
        }
        
        // Register cache service shutdown if available
        const cacheService = appContainer.has('cacheService') ? appContainer.get('cacheService') : null;
        if (cacheService && typeof cacheService.close === 'function') {
          registerShutdownHandler('cacheService', async () => {
            logger.info('Closing cache service...');
            await cacheService.close();
            logger.info('Cache service closed successfully');
          }, { priority: 5 });
        }
      } catch (error) {
        logger.warn('Error registering shutdown handlers from container:', { error: error.message });
      }
    }
    
    // Register additional cleanup handlers
    registerShutdownHandler('finalCleanup', async () => {
      logger.info('Performing final cleanup...');
      // Allow time for any remaining logs to be flushed
      await new Promise(resolve => setTimeout(resolve, shutdownDelay));
      logger.info('Final cleanup complete');
    }, { priority: -10, timeout: 3000 });
    
    // Start listening
    return new Promise((resolve, reject) => {
      server.once('error', (error) => {
        logger.error(`Server failed to start: ${error.message}`, { error });
        reject(error);
      });
      
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
        
        // Handle "max connections" warning
        server.maxConnections = 10000;
        server.on('connection', (socket) => {
          socket.setKeepAlive(true);
          socket.setTimeout(120000); // 2 minutes timeout
        });
        
        resolve(server);
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    throw error;
  }
}

// Default export for ES modules
export default { startServer };
