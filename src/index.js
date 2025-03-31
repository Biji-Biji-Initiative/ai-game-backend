/**
 * Application Entry Point
 * 
 * This is the main entry point for the application.
 * It imports and starts the server module.
 */

// Load environment variables first thing
import * as dotenv from 'dotenv';
dotenv.config();

import { logger } from "@/core/infra/logging/logger.js";
import { startServer } from "@/server.js";

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

// Check for relevant environment variables
logger.info('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'missing',
  SUPABASE_KEY: process.env.SUPABASE_KEY ? 'set' : 'missing',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'set' : 'missing'
});

// Start the server
const server = await startServer(PORT);

// Signal to PM2 that the app is ready (if running under PM2)
if (process.send) {
  process.send('ready');
  logger.info('Sent ready signal to PM2');
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully');
  process.exit(0);
}); 