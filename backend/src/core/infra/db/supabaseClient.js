'use strict';

import { createClient } from '@supabase/supabase-js';
import { infraLogger } from "#app/core/infra/logging/domainLogger.js";
import { startupLogger } from "#app/core/infra/logging/StartupLogger.js";

/**
 * Create and configure a Supabase client
 * @param {Object} config - Configuration object containing Supabase settings
 * @returns {Object} Configured Supabase client
 */
function createSupabaseClient(config) {
  const logger = infraLogger.child({ component: 'supabase-client' });
  
  if (!config.supabase?.url) {
    const error = new Error('Supabase URL is required but not provided in configuration');
    logger.error('Failed to initialize Supabase client: Missing URL', { error: error.message });
    startupLogger.logComponentInitialization('db.supabase', 'error', {
      error: 'Missing Supabase URL in configuration'
    });
    throw error;
  }
  
  if (!config.supabase?.anonKey) {
    const error = new Error('Supabase anonymous key is required but not provided in configuration');
    logger.error('Failed to initialize Supabase client: Missing anonymous key', { error: error.message });
    startupLogger.logComponentInitialization('db.supabase', 'error', {
      error: 'Missing Supabase anonymous key in configuration'
    });
    throw error;
  }
  
  try {
    logger.info('Initializing Supabase client', { 
      url: config.supabase.url,
      hasAnonKey: !!config.supabase.anonKey,
      hasServiceRoleKey: !!config.supabase.serviceRoleKey
    });
    
    // Create the Supabase client
    const supabase = createClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        global: {
          headers: {
            'x-application-name': 'ai-fight-club-api'
          }
        }
      }
    );
    
    // Test the connection
    testSupabaseConnection(supabase, logger)
      .then(result => {
        if (result.success) {
          logger.info('Supabase connection test successful', { 
            version: result.version,
            timestamp: result.timestamp
          });
          startupLogger.logComponentInitialization('db.supabase', 'success', {
            url: config.supabase.url,
            version: result.version
          });
        } else {
          logger.warn('Supabase connection test failed', { error: result.error });
          startupLogger.logComponentInitialization('db.supabase', 'warning', {
            url: config.supabase.url,
            error: result.error
          });
        }
      })
      .catch(error => {
        logger.error('Error testing Supabase connection', { 
          error: error.message,
          stack: error.stack
        });
        startupLogger.logComponentInitialization('db.supabase', 'error', {
          url: config.supabase.url,
          error: error.message
        });
      });
    
    // Check RLS policies if service role key is available
    if (config.supabase.serviceRoleKey) {
      const adminClient = createClient(
        config.supabase.url,
        config.supabase.serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      
      checkRLSPolicies(adminClient, logger)
        .then(result => {
          if (result.success) {
            logger.info('RLS policies check successful', { 
              tables: result.tables.length,
              policiesCount: result.policiesCount
            });
            startupLogger.logComponentInitialization('db.supabase.rls', 'success', {
              tables: result.tables.length,
              policiesCount: result.policiesCount
            });
          } else {
            logger.warn('RLS policies check failed or found issues', { 
              error: result.error,
              tablesWithoutRLS: result.tablesWithoutRLS
            });
            startupLogger.logComponentInitialization('db.supabase.rls', 'warning', {
              error: result.error,
              tablesWithoutRLS: JSON.stringify(result.tablesWithoutRLS)
            });
          }
        })
        .catch(error => {
          logger.error('Error checking RLS policies', { 
            error: error.message,
            stack: error.stack
          });
          startupLogger.logComponentInitialization('db.supabase.rls', 'error', {
            error: error.message
          });
        });
    } else {
      logger.warn('Service role key not provided, skipping RLS policies check');
      startupLogger.logComponentInitialization('db.supabase.rls', 'warning', {
        message: 'Service role key not provided, skipping RLS policies check'
      });
    }
    
    return supabase;
  } catch (error) {
    logger.error('Failed to initialize Supabase client', { 
      error: error.message,
      stack: error.stack
    });
    startupLogger.logComponentInitialization('db.supabase', 'error', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Test the Supabase connection
 * @param {Object} supabase - Supabase client
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Test result
 */
async function testSupabaseConnection(supabase, logger) {
  try {
    // Simple query to test connection
    const { data, error } = await supabase
      .from('_test_connection')
      .select('version, timestamp')
      .limit(1)
      .maybeSingle();
    
    if (error) {
      // If the test table doesn't exist, try a system health check
      if (error.code === '42P01') { // undefined_table
        const { data: healthData, error: healthError } = await supabase.rpc('get_system_health');
        
        if (healthError) {
          return {
            success: false,
            error: `Connection test failed: ${healthError.message}`
          };
        }
        
        return {
          success: true,
          version: healthData?.version || 'unknown',
          timestamp: healthData?.timestamp || new Date().toISOString()
        };
      }
      
      return {
        success: false,
        error: `Connection test failed: ${error.message}`
      };
    }
    
    return {
      success: true,
      version: data?.version || 'unknown',
      timestamp: data?.timestamp || new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error testing Supabase connection', { 
      error: error.message,
      stack: error.stack
    });
    
    return {
      success: false,
      error: `Connection test failed with exception: ${error.message}`
    };
  }
}

/**
 * Check RLS policies on Supabase tables
 * @param {Object} adminClient - Supabase admin client with service role
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Check result
 */
async function checkRLSPolicies(adminClient, logger) {
  try {
    // Get list of tables
    const { data: tables, error: tablesError } = await adminClient
      .from('pg_tables')
      .select('schemaname, tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      return {
        success: false,
        error: `Failed to get tables: ${tablesError.message}`
      };
    }
    
    // Get RLS status for each table
    const tablesWithoutRLS = [];
    let policiesCount = 0;
    
    for (const table of tables) {
      const { data: rlsData, error: rlsError } = await adminClient
        .rpc('check_table_rls', { table_name: table.tablename });
      
      if (rlsError) {
        logger.warn(`Failed to check RLS for table ${table.tablename}`, { 
          error: rlsError.message
        });
        continue;
      }
      
      if (!rlsData.rls_enabled) {
        tablesWithoutRLS.push(table.tablename);
      }
      
      // Get policies for this table
      const { data: policies, error: policiesError } = await adminClient
        .from('pg_policies')
        .select('policyname')
        .eq('tablename', table.tablename)
        .eq('schemaname', 'public');
      
      if (!policiesError && policies) {
        policiesCount += policies.length;
      }
    }
    
    return {
      success: tablesWithoutRLS.length === 0,
      tables,
      tablesWithoutRLS,
      policiesCount
    };
  } catch (error) {
    logger.error('Error checking RLS policies', { 
      error: error.message,
      stack: error.stack
    });
    
    return {
      success: false,
      error: `RLS check failed with exception: ${error.message}`,
      tablesWithoutRLS: []
    };
  }
}

// Export both the original function name and the name expected by infrastructure.js
export { createSupabaseClient, createSupabaseClient as initializeSupabaseClient };
