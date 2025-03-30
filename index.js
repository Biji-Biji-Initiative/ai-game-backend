/**
 * AI Fight Club API Server Entry Point
 */
import 'dotenv/config';
import { startServer } from './src/server.js';
import config from './src/config/config.js';
import { logger } from './src/core/infra/logging/logger.js';
import container from './src/config/container/index.js';
import { checkConnection } from './src/core/infra/db/databaseConnection.js';

// Define port from configuration
const PORT = process.env.NODE_ENV === 'production' ? 9000 : config.server.port;

// Initialize and start the server
startServer(PORT)
  .then(server => {
    // Log server information
    logger.info(`AI Fight Club API server running on port ${PORT} in ${config.server.environment} mode`);
    
    // Check Supabase connection
    return checkConnection()
      .then(() => {
        logger.info('Supabase connection established successfully');
        
        // Initialize challenge configuration
        const challengeConfigInitializer = container.get('challengeConfigInitializer');
        const shouldSeed = config.server.environment === 'development';
        return challengeConfigInitializer.initialize(shouldSeed);
      });
  })
  .then(repos => {
    if (repos) {
      logger.info('Challenge configuration initialized successfully', {
        challengeTypes: repos.challengeTypeRepository ? repos.challengeTypeRepository.findAll().then(types => types.length) : 0,
        formatTypes: repos.formatTypeRepository ? repos.formatTypeRepository.findAll().then(types => types.length) : 0,
        focusAreas: repos.focusAreaRepository ? repos.focusAreaRepository.findAll().then(areas => areas.length) : 0,
        difficultyLevels: repos.difficultyLevelRepository ? repos.difficultyLevelRepository.findAll().then(levels => levels.length) : 0
      });
    }
  })
  .catch(error => {
    logger.error('Failed to start server or initialize services', { 
      error: error.message, 
      stack: error.stack 
    });
  });

/**
 * Handle graceful shutdown
 */
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  process.exit(0);
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
