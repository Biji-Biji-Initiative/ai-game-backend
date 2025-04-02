'use strict';

// This module provides utility functions for database interactions.
// It does NOT initialize or hold the client instance itself.
// The client is expected to be initialized and managed by the DI container.

import { logger } from "#app/core/infra/logging/logger.js";
// We don't import initializeSupabaseClient here anymore.

logger.debug('[databaseConnection.js] Module evaluation START');

/**
 * Check the database connection using a provided client instance.
 * @param {import('@supabase/supabase-js').SupabaseClient} client - The initialized Supabase client.
 * @returns {Promise<boolean>} True if connection successful
 */
async function checkConnection(client) {
  if (!client) {
    logger.error('checkConnection called without a valid Supabase client');
    return false;
  }
  try {
    logger.info('Checking database connection...');
    // Perform a simple query to test the connection
    const { error } = await client.from('users').select('id').limit(1);
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

/**
 * Run a health check on the database connection using a provided client instance.
 * @param {import('@supabase/supabase-js').SupabaseClient} client - The initialized Supabase client.
 * @returns {Promise<Object>} Health check results with status, message, and response time
 */
async function runDatabaseHealthCheck(client) {
  const startTime = Date.now();
  if (!client) {
    logger.error('runDatabaseHealthCheck called without a valid Supabase client');
    return {
        status: 'error',
        message: 'Supabase client not provided for health check',
        responseTime: Date.now() - startTime
    };
  }
  try {
    logger.debug('Running database health check...');
    
    const { count, error } = await client
        .from('users')
        .select('*' , { count: 'exact', head: true });
        
    const responseTime = Date.now() - startTime;

    if (error) {
      logger.warn('Database health check query failed', { error: error.message });
      return {
        status: 'error',
        message: `Database connection error: ${error.message}`,
        responseTime: responseTime
      };
    }
    
    logger.debug('Database health check successful', { responseTime, userCount: count });
    return {
      status: 'healthy',
      message: 'Database connection is healthy',
      responseTime: responseTime,
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
      responseTime: Date.now() - startTime
    };
  }
}

logger.debug('[databaseConnection.js] runDatabaseHealthCheck function defined');

// Export the utility functions
// We no longer export initializeSupabase from here
export { checkConnection };
export { runDatabaseHealthCheck };

logger.debug('[databaseConnection.js] Exports defined');

export default {
  checkConnection,
  runDatabaseHealthCheck,
};

logger.debug('[databaseConnection.js] Module evaluation END');