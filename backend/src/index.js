/**
 * Application Entry Point
 * 
 * This is the main entry point for the application following clean architecture principles.
 * It properly loads the environment configuration and initializes all components.
 */

import 'dotenv/config';

// === Global Error Handlers (Add these FIRST) ===
process.on('unhandledRejection', (reason, promise) => {
  console.error('>>> UNHANDLED REJECTION <<<');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  // Optionally log to file logger as well
  // logger?.crit('Unhandled Rejection', { reason, promise }); 
  process.exit(1); // Exit on unhandled rejection
});

process.on('uncaughtException', (error) => {
  console.error('>>> UNCAUGHT EXCEPTION <<<');
  console.error(error);
  // Optionally log to file logger as well
  // logger?.crit('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1); // Exit on uncaught exception
});
// =============================================

'use strict';

import app from './app.js';
import { startServer } from './server.js';
import { logger } from './core/infra/logging/logger.js';
import { fileURLToPath } from 'url'; // Import necessary function

// For Vercel, we export the Express app directly
export default app;

// Helper function to normalize paths for comparison
const isMainModule = (metaUrl, argv1) => {
  try {
    const currentFilePath = fileURLToPath(metaUrl);
    // process.argv[1] should already be a standard path
    return currentFilePath === argv1;
  } catch (e) {
    // Fallback on error, log the issue
    logger.error('[INDEX_JS] Error comparing module paths:', { error: e?.message || e });
    return false; 
  }
};

// This will run when the file is executed directly (not when imported)
const runningAsMain = isMainModule(import.meta.url, process.argv[1]);

if (runningAsMain) {
  // Parse command line arguments for port override
  const args = process.argv.slice(2);
  let portArg = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--port=')) {
      portArg = parseInt(args[i].split('=')[1], 10);
      break;
    }
  }
  
  // Use either command line port or .env port
  const PORT = portArg || parseInt(process.env.PORT) || 3081;
  
  logger.info(`Starting server with port ${PORT}`);
  
  // Use the startServer function instead of app.listen
  startServer(PORT).catch(err => {
    logger.error(`Failed to start server: ${err.message}`, { error: err });
    process.exit(1);
  });
} 
// else: If not main module, just export app (for Vercel, testing, etc.) 