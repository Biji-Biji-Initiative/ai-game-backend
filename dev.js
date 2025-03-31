/**
 * Development Server Runner
 * 
 * This script ensures environment variables are properly loaded from .env
 * before starting the application server.
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

// Verify environment variables are loaded
console.log('Environment variables loaded:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'set' : 'not set');
console.log('- SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'set' : 'not set');
console.log('- PORT:', process.env.PORT || 'not set (will use default)');

// Set NODE_ENV to development if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
  console.log('Setting NODE_ENV to development');
}

// Import and start the server
import { startServer } from './src/server.js';

// Start the server on the specified port from .env or default to 3000
const port = process.env.PORT || 3000;
console.log(`Starting server on port ${port}...`);

// Start the server (without using top-level await)
startServer(port)
  .then(server => {
    console.log(`Server started successfully on port ${port}`);
  })
  .catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Gracefully shutting down...');
  process.exit(0);
}); 