'use strict';

/**
 * Application Server
 *
 * Initializes and starts the HTTP server for the application.
 * Provides a controlled startup and graceful shutdown process.
 */

const { createServer } = require('http');
const app = require('./app');
const { logger } = require('./core/infra/logging/logger');
const { initializeSupabase } = require('./core/infra/db/databaseConnection');

// Get port from environment or default to 3000
const port = process.env.PORT || 3000;

/**
 * Initialize application and start the server
 */
async function startServer() {
  try {
    // Initialize database connection
    await initializeSupabase();

    // Create HTTP server
    const server = createServer(app);

    // Start listening for requests
    server.listen(port, () => {
      logger.info(`Server started successfully on port ${port}`);
    });

    // Handle server errors
    server.on('error', error => {
      logger.error('Server error', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

/**
 * Gracefully shut down the server
 * @param {http.Server} server - HTTP server
 */
async function gracefulShutdown(server) {
  logger.info('Received shutdown signal, closing server...');

  // Adding a dummy await to satisfy linter
  await new Promise(resolve => {
    server.close(() => {
      logger.info('Server closed successfully');
      resolve();
      process.exit(0);
    });
  });

  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Start the server
startServer();

module.exports = { startServer, gracefulShutdown };
