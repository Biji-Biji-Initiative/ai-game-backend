/**
 * Connection Utilities
 * Provides functions for initializing and verifying database connections
 */

const chalk = require('chalk');
const supabase = require('../../utils/supabaseClient');
const { logger } = require('../../core/infra/logging/logger');

/**
 * Initialize all connections and services at startup
 * This ensures we connect to databases before any user interaction
 * @returns {Promise<boolean>} True if all connections are successful
 */
async function initializeConnections() {
  logger.info('Initializing connections at startup');
  
  try {
    // Verify Supabase connection
    const connected = await supabase.verifyConnection();
    
    if (!connected) {
      logger.error('Failed to connect to Supabase at startup');
      logger.error(chalk.red('Failed to connect to Supabase. Please check your configuration and try again.'));
      return false;
    }
    
    logger.info('All connections initialized successfully');
    return true;
  } catch (error) {
    logger.error('Error initializing connections at startup', { 
      error: error.message, 
      stack: error.stack 
    });
    logger.error(chalk.red(`Error initializing connections: ${error.message}`));
    return false;
  }
}

module.exports = {
  initializeConnections
};
