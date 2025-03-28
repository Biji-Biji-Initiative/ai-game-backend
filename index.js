/**
 * AI Fight Club API Server Entry Point
 */
require('dotenv').config();
const app = require('./src/app');
const config = require('./src/config/config');
const { logger } = require('./src/core/infra/logging/logger');
const container = require('./src/config/container');

// Define port from configuration
const PORT = config.server.port;

// Initialize Supabase connection
const { checkConnection } = require('./src/core/infra/db/databaseConnection');

// Start the server and initialize services
const server = app.listen(PORT, async () => {
  try {
    logger.info(`AI Fight Club API server running on port ${PORT} in ${config.server.environment} mode`);
    
    // Check Supabase connection
    await checkConnection();
    logger.info('Supabase connection established successfully');
    
    // Initialize challenge configuration
    const challengeConfigInitializer = container.get('challengeConfigInitializer');
    const shouldSeed = config.server.environment === 'development';
    const repos = await challengeConfigInitializer.initialize(shouldSeed);
    logger.info('Challenge configuration initialized successfully', {
      challengeTypes: await repos.challengeTypeRepository.findAll().then(types => types.length),
      formatTypes: await repos.formatTypeRepository.findAll().then(types => types.length),
      focusAreas: await repos.focusAreaRepository.findAll().then(areas => areas.length),
      difficultyLevels: await repos.difficultyLevelRepository.findAll().then(levels => levels.length)
    });
  } catch (error) {
    logger.error('Failed to initialize services', { error: error.message });
  }
});

/**
 * Handle graceful shutdown
 */
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('Server closed. Process terminating...');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forcefully shutting down after timeout!');
    process.exit(1);
  }, 10000);
};

// Signal handlers for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.message, { name: err.name, stack: err.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.message, { name: err.name, stack: err.stack });
  process.exit(1);
});
