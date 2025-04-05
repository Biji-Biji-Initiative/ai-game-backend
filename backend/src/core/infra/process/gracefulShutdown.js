/**
 * Graceful Shutdown Utilities
 * 
 * This module provides utilities for managing graceful shutdown of the application,
 * including handling for databases, event buses, and other resources.
 */

'use strict';

import { logger } from "#app/core/infra/logging/logger.js";

/**
 * Registered shutdown handlers
 * @type {Array<{name: string, handler: Function, options: Object}>}
 */
const shutdownHandlers = [];

/**
 * Global shutdown options
 * @type {Object}
 */
let globalShutdownOptions = {
  timeout: 30000, // 30 seconds total shutdown timeout
  exitProcess: true,
  exitCode: 0
};

/**
 * Register a shutdown handler
 * @param {string} name - Handler name for identification
 * @param {Function} handler - Async function that handles cleanup
 * @param {Object} options - Handler options
 * @param {number} [options.priority=0] - Priority (higher runs first)
 * @param {number} [options.timeout=5000] - Individual handler timeout
 * @returns {Function} - Function to unregister the handler
 */
export function registerShutdownHandler(name, handler, options = {}) {
  const handlerOptions = {
    priority: options.priority || 0,
    timeout: options.timeout || 5000
  };
  
  const handlerEntry = {
    name,
    handler,
    options: handlerOptions
  };
  
  shutdownHandlers.push(handlerEntry);
  
  logger.debug(`Registered shutdown handler: ${name} (priority: ${handlerOptions.priority})`);
  
  // Return function to unregister
  return () => {
    const index = shutdownHandlers.findIndex(h => h === handlerEntry);
    if (index !== -1) {
      shutdownHandlers.splice(index, 1);
      logger.debug(`Unregistered shutdown handler: ${name}`);
    }
  };
}

/**
 * Run all registered shutdown handlers
 * @param {Object} options - Shutdown options
 * @returns {Promise<void>}
 */
async function runShutdownHandlers(options = {}) {
  if (shutdownHandlers.length === 0) {
    logger.info('No shutdown handlers registered');
    return;
  }

  // Sort handlers by priority (highest first)
  const handlers = [...shutdownHandlers].sort((a, b) => b.options.priority - a.options.priority);
  
  logger.info(`Running ${handlers.length} shutdown handlers...`);
  
  for (const { name, handler, options: handlerOptions } of handlers) {
    try {
      logger.info(`Running shutdown handler: ${name}`);
      
      // Create a promise with timeout
      const result = await Promise.race([
        handler(),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Shutdown handler '${name}' timed out after ${handlerOptions.timeout}ms`));
          }, handlerOptions.timeout);
        })
      ]);
      
      logger.info(`Shutdown handler completed: ${name}`);
    } catch (error) {
      logger.error(`Error in shutdown handler '${name}':`, { error: error.message });
      
      // Set error exit code unless this is already an error shutdown
      if (options.exitCode === 0) {
        options.exitCode = 1;
      }
    }
  }
}

/**
 * Handle process termination signals
 * @param {http.Server} server - The HTTP server to close
 * @param {Object} options - Shutdown options
 * @returns {Function} Signal handler function
 */
function createShutdownHandler(server, options) {
  let isShuttingDown = false;
  
  return async (signal) => {
    // Prevent multiple shutdown attempts
    if (isShuttingDown) {
      logger.info('Shutdown already in progress, ignoring signal');
      return;
    }
    
    isShuttingDown = true;
    const shutdownOptions = { ...options };
    
    logger.info(`Received ${signal}, shutting down gracefully...`);
    
    // Setup a forced shutdown timeout
    const forceShutdownTimeout = setTimeout(() => {
      logger.error(`Graceful shutdown timed out after ${options.timeout}ms, forcing exit`);
      if (options.exitProcess) {
        process.exit(1);
      }
    }, options.timeout);
    
    try {
      // Run all registered handlers
      await runShutdownHandlers(shutdownOptions);
      
      // Close the HTTP server
      if (server) {
        logger.info('Closing HTTP server...');
        await new Promise((resolve) => {
          server.close((err) => {
            if (err) {
              logger.error('Error closing HTTP server:', { error: err.message });
              shutdownOptions.exitCode = 1;
            } else {
              logger.info('HTTP server closed successfully');
            }
            resolve();
          });
        });
      }
      
      logger.info('Graceful shutdown completed successfully');
    } catch (error) {
      logger.error('Error during graceful shutdown:', { error: error.message });
      shutdownOptions.exitCode = 1;
    } finally {
      clearTimeout(forceShutdownTimeout);
      
      // Exit the process if configured to do so
      if (shutdownOptions.exitProcess) {
        // Short delay to allow logs to flush
        setTimeout(() => {
          logger.info(`Exiting process with code ${shutdownOptions.exitCode}`);
          process.exit(shutdownOptions.exitCode);
        }, 500);
      }
    }
  };
}

/**
 * Setup shutdown handlers for the application
 * @param {http.Server} server - The HTTP server to close
 * @param {Object} options - Shutdown options
 */
export function setupShutdownHandlers(server, options = {}) {
  globalShutdownOptions = {
    ...globalShutdownOptions,
    ...options
  };
  
  const signalHandler = createShutdownHandler(server, globalShutdownOptions);
  
  // Handle termination signals
  process.on('SIGTERM', () => signalHandler('SIGTERM'));
  process.on('SIGINT', () => signalHandler('SIGINT'));
  
  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', { error: error.message, stack: error.stack });
    signalHandler('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection:', { 
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined
    });
    signalHandler('unhandledRejection');
  });
  
  logger.info('Shutdown handlers setup completed');
}

/**
 * Create a shutdown handler for database connections
 * @param {Object} db - Database client with close method
 * @returns {Function} Async shutdown handler
 */
export function createDatabaseShutdownHandler(db) {
  return async () => {
    if (!db) {
      logger.warn('No database client provided for shutdown');
      return;
    }
    
    logger.info('Closing database connection...');
    
    if (typeof db.end === 'function') {
      await db.end();
      logger.info('Database connection closed (end method)');
    } else if (typeof db.close === 'function') {
      await db.close();
      logger.info('Database connection closed (close method)');
    } else if (typeof db.disconnect === 'function') {
      await db.disconnect();
      logger.info('Database connection closed (disconnect method)');
    } else {
      logger.warn('Database client does not have a recognized close method');
    }
  };
}

/**
 * Create a shutdown handler for event buses
 * @param {Object} eventBus - Event bus with shutdown method
 * @returns {Function} Async shutdown handler
 */
export function createEventBusShutdownHandler(eventBus) {
  return async () => {
    if (!eventBus) {
      logger.warn('No event bus provided for shutdown');
      return;
    }
    
    logger.info('Shutting down event bus...');
    
    if (typeof eventBus.shutdown === 'function') {
      await eventBus.shutdown();
      logger.info('Event bus shut down (shutdown method)');
    } else if (typeof eventBus.close === 'function') {
      await eventBus.close();
      logger.info('Event bus shut down (close method)');
    } else if (typeof eventBus.stop === 'function') {
      await eventBus.stop();
      logger.info('Event bus shut down (stop method)');
    } else {
      logger.warn('Event bus does not have a recognized shutdown method');
    }
  };
}

// Export for CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    registerShutdownHandler,
    setupShutdownHandlers,
    createDatabaseShutdownHandler,
    createEventBusShutdownHandler
  };
}

export default {
  registerShutdownHandler,
  setupShutdownHandlers,
  createDatabaseShutdownHandler,
  createEventBusShutdownHandler
}; 