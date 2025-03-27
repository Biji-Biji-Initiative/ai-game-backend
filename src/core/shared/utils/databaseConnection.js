/**
 * Database Connection Utilities
 * Handles database connection and health checks
 */
const { logger } = require('../../../core/infra/logging/logger');
const { supabaseClient } = require('../../../core/infra/db/supabaseClient');

/**
 * Initialize Supabase connection and verify it's working
 * @returns {Promise<boolean>} True if successfully initialized
 */
const initializeSupabase = async () => {
  try {
    logger.info('Initializing Supabase connection...');
    
    // Perform a simple query to verify the connection
    const { data, error } = await supabaseClient
      .from('users')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    logger.info('Supabase connection established and verified');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Supabase connection', { error: error.message });
    return false;
  }
};

/**
 * Run a health check on the database connection
 * @returns {Promise<Object>} Health check results
 */
const runDatabaseHealthCheck = async () => {
  try {
    // Start timing
    const startTime = Date.now();
    
    // Perform a quick query to check connection
    const { data, error } = await supabaseClient
      .from('system_status')
      .select('last_updated')
      .limit(1);
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        status: 'error',
        message: `Database connection error: ${error.message}`,
        responseTime: responseTime
      };
    }
    
    return {
      status: 'healthy',
      message: 'Database connection is healthy',
      responseTime: responseTime,
      lastUpdated: data?.[0]?.last_updated || null
    };
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    
    return {
      status: 'error',
      message: `Failed to perform database health check: ${error.message}`,
      error: error.message
    };
  }
};

/**
 * Check database connection
 * Alias for backward compatibility
 */
const checkConnection = async () => {
  return initializeSupabase();
};

module.exports = {
  initializeSupabase,
  runDatabaseHealthCheck,
  checkConnection,
  supabaseClient
}; 