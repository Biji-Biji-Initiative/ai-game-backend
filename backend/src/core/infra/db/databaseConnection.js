'use strict';

import { supabaseClient } from "#app/core/infra/db/supabaseClient.js";
import { logger } from "#app/core/infra/logging/logger.js";

console.log('[databaseConnection.js] Module evaluation START'); // Log start

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
    logger.debug('Running database health check...');
    const startTime = Date.now();
    
    // Perform a lightweight query on a guaranteed table (e.g., auth.users if using Supabase Auth)
    // Or simply check function execution like rpc('get_status') if you have one.
    // Using 'users' table count as a reliable check:
    const {
      count,
      error
    } = await supabaseClient
        .from('users') // Assuming 'users' table exists (common in Supabase setups)
        .select('*' , { count: 'exact', head: true }); // head: true makes it faster
        
    const responseTime = Date.now() - startTime;

    if (error) {
      logger.warn('Database health check query failed', { error: error.message });
      return {
        status: 'error',
        message: `Database connection error: ${error.message}`,
        responseTime: responseTime
      };
    }
    
    // If count is returned (even if 0), the connection and table access are working.
    logger.debug('Database health check successful', { responseTime, userCount: count });
    return {
      status: 'healthy',
      message: 'Database connection is healthy',
      responseTime: responseTime,
      // Optionally add more details like user count if relevant
      // details: { userTableAccessible: true, approxUserCount: count }
    };

  } catch (error) {
    logger.error('Database health check failed unexpectedly', { 
      error: error.message,
      stack: error.stack
    });
    return {
      status: 'error',
      message: `Failed to perform database health check: ${error.message}`,
      error: error.message,
      responseTime: Date.now() - (startTime || Date.now()) // Ensure responseTime exists
    };
  }
}

console.log('[databaseConnection.js] runDatabaseHealthCheck function defined:', typeof runDatabaseHealthCheck); // Log definition

export { initializeSupabase };
export { checkConnection };
export { runDatabaseHealthCheck };
export { supabaseClient };

console.log('[databaseConnection.js] Exports defined'); // Log exports

export default {
  initializeSupabase,
  checkConnection,
  runDatabaseHealthCheck,
  supabaseClient
};

console.log('[databaseConnection.js] Module evaluation END'); // Log end