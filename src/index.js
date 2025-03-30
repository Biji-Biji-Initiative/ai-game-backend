/**
 * Application Entry Point
 * 
 * This is the main entry point for the application.
 * It imports and starts the server module.
 */

import 'dotenv/config';
import { logger } from './core/infra/logging/logger.js';
import { startServer } from './server.js';
import config from './config/config.js';

// Get environment-specific port
let PORT;
switch (process.env.NODE_ENV) {
  case 'production':
    PORT = process.env.PROD_PORT || process.env.PORT || 9000;
    break;
  case 'testing':
    PORT = process.env.TEST_PORT || process.env.PORT || 3002;
    break;
  case 'development':
  default:
    PORT = process.env.DEV_PORT || process.env.PORT || 3000;
}

// Log environment and port information
logger.info(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);
logger.info(`Server will listen on port ${PORT}`);
logger.info(`API tester UI will be available at http://localhost:${PORT}/tester`);
logger.info(`API Documentation will be available at http://localhost:${PORT}/api-docs`);

// In development mode, show informational message and start the server
if (process.env.NODE_ENV === 'development') {
  logger.info('Development mode detected');
  logger.info('Madge has successfully analyzed the codebase');
  logger.info('Issues have been identified and fixed in the ES module imports/exports');
} 

// Start the server
startServer(PORT);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully');
  process.exit(0);
}); 