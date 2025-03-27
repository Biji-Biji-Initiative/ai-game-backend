/**
 * Database Connection Utilities - Infrastructure Layer
 * 
 * Handles database connection initialization and testing
 * following Domain-Driven Design principles.
 */

const { supabaseClient } = require('./supabaseClient');
const { logger } = require('../logging/logger');

/**
 * Initialize Supabase connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function initializeSupabase() {
  try {
    logger.info('Initializing Supabase connection...');
    
    // Perform a simple query to test the connection
    const { data, error } = await supabaseClient
      .from('users')
      .select('id')
      .limit(1);
      
    if (error) {
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }
    
    logger.info('Supabase connection initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Supabase connection', { error: error.message });
    return false;
  }
}

/**
 * Check the database connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function checkConnection() {
  try {
    logger.info('Checking database connection...');
    
    // Perform a simple query to test the connection
    const { error } = await supabaseClient
      .from('users')
      .select('id')
      .limit(1);
      
    if (error) {
      throw new Error(`Failed to connect to database: ${error.message}`);
    }
    
    logger.info('Database connection is healthy');
    return true;
  } catch (error) {
    logger.error('Database connection check failed', { error: error.message });
    return false;
  }
}

module.exports = {
  initializeSupabase,
  checkConnection
}; 