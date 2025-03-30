import { supabaseClient } from "../../infra/db/supabaseClient.js";
import { logger } from "../../infra/logging/logger.js";
'use strict';
/**
 * Initialize Supabase connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function initializeSupabase() {
  try {
    logger.info('Initializing Supabase connection...');
    // Perform a simple query to test the connection
    const {
      data: _data,
      error
    } = await supabaseClient.from('users').select('count', {
      count: 'exact'
    }) // Changed to use count for consistency with previous implementation
    .limit(1);
    if (error) {
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }
    logger.info('Supabase connection initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Supabase connection', {
      error: error.message
    });
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
    const {
      error
    } = await supabaseClient.from('users').select('id').limit(1);
    if (error) {
      throw new Error(`Failed to connect to database: ${error.message}`);
    }
    logger.info('Database connection is healthy');
    return true;
  } catch (error) {
    logger.error('Database connection check failed', {
      error: error.message
    });
    return false;
  }
}
/**
 * Run a health check on the database connection
 * @returns {Promise<Object>} Health check results with status, message, and response time
 */
async function runDatabaseHealthCheck() {
  try {
    // Start timing
    const startTime = Date.now();
    // Perform a quick query to check connection
    const {
      data,
      error
    } = await supabaseClient.from('system_status').select('last_updated').limit(1);
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
    logger.error('Database health check failed', {
      error: error.message
    });
    return {
      status: 'error',
      message: `Failed to perform database health check: ${error.message}`,
      error: error.message
    };
  }
}
export { initializeSupabase };
export { checkConnection };
export { runDatabaseHealthCheck };
export { supabaseClient };
export default {
  initializeSupabase,
  checkConnection,
  runDatabaseHealthCheck,
  supabaseClient
};