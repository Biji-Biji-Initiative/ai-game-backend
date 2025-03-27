/**
 * Supabase Client Utility
 * Provides a singleton instance of the Supabase client for database operations
 */
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config();

// Import logger after environment variables are loaded
const { logger } = require('../logger');

// Get Supabase credentials directly from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  logger.error('Missing required Supabase environment variables');
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be defined in your .env file');
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Track connection verification status
let connectionVerified = false;

// Log configuration for debugging
logger.info(`Supabase client initialized with URL: ${SUPABASE_URL}`);
logger.info(`Supabase key configured (first 10 chars): ${SUPABASE_ANON_KEY.substring(0, 10)}...`);

/**
 * Verify connection to Supabase
 * This is exported so it can be called explicitly when needed
 * @returns {Promise<boolean>} - True if connection is successful
 */
const verifyConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count');
    if (error) throw error;
    
    logger.info('Successfully connected to Supabase');
    connectionVerified = true;
    return true;
  } catch (error) {
    logger.error(`Failed to connect to Supabase: ${error.message}`, { 
      error: error.message, 
      stack: error.stack 
    });
    connectionVerified = false;
    return false;
  }
};

/**
 * Check if connection has been verified
 * @returns {boolean} - True if connection has been verified
 */
const isConnectionVerified = () => {
  return connectionVerified;
};

// Export the Supabase client and verification functions
module.exports = supabase;
