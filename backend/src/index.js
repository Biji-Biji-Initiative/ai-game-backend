/**
 * Application Entry Point
 * 
 * This is the main entry point for the application following clean architecture principles.
 * It properly loads the environment configuration and initializes all components.
 */

// Import environment configuration - this should be the first import
import config from "#app/config/env.js";
import { logger } from "#app/core/infra/logging/logger.js";
import { startServer } from "#app/server.js";

// Log application startup with configuration details
logger.info(`Starting server in ${config.NODE_ENV} environment`);
logger.info(`Server will listen on port ${config.PORT}`);
logger.info(`API tester UI will be available at ${config.BASE_URL}${config.API_TESTER_PATH}`);
logger.info(`API Documentation will be available at ${config.BASE_URL}${config.API_DOCS_PATH}`);

// Validate and log critical environment configurations
logger.info('Environment configuration loaded:', {
  NODE_ENV: config.NODE_ENV,
  SUPABASE_URL: config.SUPABASE_URL ? 'set' : 'missing',
  SUPABASE_KEY: config.SUPABASE_KEY ? 'set' : 'missing',
  OPENAI_API_KEY: config.OPENAI_API_KEY ? 'set' : 'missing'
});

// Start the server with proper error handling
try {
  const server = await startServer(config.PORT);
  logger.info(`Server started successfully on port ${config.PORT}`);
  
  // Signal to PM2 that the app is ready (if running under PM2)
  if (process.send) {
    process.send('ready');
    logger.info('Sent ready signal to PM2');
  }
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
} catch (error) {
  logger.error('Failed to start server:', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
} 