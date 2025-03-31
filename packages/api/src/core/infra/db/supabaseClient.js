/**
 * Supabase Client for Database Access
 *
 * Infrastructure service for database operations using Supabase.
 * Moved from utilities to follow Domain-Driven Design principles.
 *
 * Includes query performance monitoring to detect and log potential N+1 query issues.
 */
import { createClient } from '@supabase/supabase-js';
import { logger } from "@/infra/logging/logger.js";
import { getMonitor } from './QueryPerformanceMonitor.js';

/**
 * Initialize Supabase client with proper error handling
 */
let supabaseClient = null;
let queryMonitor = null;

try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.NODE_ENV === 'production'
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!supabaseKey) {
    throw new Error('SUPABASE_KEY/SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY in production) environment variable is required');
  }

  // Initialize query monitoring
  queryMonitor = getMonitor({
    collectionPeriod: 120000, // 2 minutes
    slowQueryThreshold: 300,  // 300ms
    logger: logger.child({ component: 'query-monitor' })
  });

  // Create the Supabase client
  const originalClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  // Wrap the client with monitoring
  supabaseClient = createMonitoredClient(originalClient);

  // Try to make a simple query to verify the connection
  (async () => {
    try {
      const { error } = await supabaseClient.from('users').select('count');

      if (error) {
        logger.error('Supabase client initialization error:', {
          error: error.message,
          code: error.code,
          hint: error.hint || 'Check your Supabase credentials and connection'
        });
      } else {
        logger.info('Supabase client initialized successfully');
      }
    } catch (error) {
      logger.error('Error testing Supabase connection:', {
        error: error.message,
        stack: error.stack
      });
    }
  })();

  // Log successful initialization
  logger.info('Supabase client configured', {
    supabaseUrl,
    environment: process.env.NODE_ENV,
    queryMonitoringEnabled: Boolean(queryMonitor)
  });
} catch (error) {
  // Log the error and create a mock client for development
  logger.error('Failed to initialize Supabase client', {
    error: error.message,
    stack: error.stack
  });

  // In development, provide a mock client to prevent crashes
  if (process.env.NODE_ENV !== 'production') {
    logger.warn('Creating mock Supabase client for development');

    supabaseClient = {
      auth: {
        signInWithPassword: () => Promise.resolve({ data: { user: { id: 'mock-id' }, session: { access_token: 'mock-token' } }, error: null }),
        signUp: () => Promise.resolve({ data: { user: { id: 'mock-id' }, session: { access_token: 'mock-token' } }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        getUser: () => Promise.resolve({ data: { user: { id: 'mock-id', email: 'mock@example.com' } }, error: null })
      },
      from: (table) => ({
        select: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
          then: (callback) => Promise.resolve({ data: [], error: null }).then(callback)
        }),
        insert: () => Promise.resolve({ data: { id: 'mock-id' }, error: null }),
        update: () => Promise.resolve({ data: { id: 'mock-id' }, error: null }),
        delete: () => Promise.resolve({ data: {}, error: null })
      })
    };
  } else {
    // In production, re-throw the error
    throw new Error(`Critical error: Unable to initialize Supabase client: ${error.message}`);
  }
}

/**
 * Create a Supabase client with query monitoring
 *
 * Wraps the original client to track query performance metrics
 *
 * @param {Object} client - Original Supabase client
 * @returns {Object} - Monitored client
 */
function createMonitoredClient(client) {
  if (!queryMonitor || process.env.DISABLE_QUERY_MONITORING === 'true') {
    return client;
  }

  // Create a wrapper for the client
  const monitoredClient = {
    ...client,

    // Wrap the 'from' method
    from: (table) => {
      const queryBuilder = client.from(table);
      let operation = 'select';  // default operation
      let callerInfo = {};

      try {
        // Try to get caller information for better tracking
        const stack = new Error().stack;
        const stackLines = stack.split('\n');
        if (stackLines.length > 2) {
          const callerLine = stackLines[3]; // Skip this function and from() call
          const match = callerLine.match(/at\s+([^\s]+)\s+\(([^:]+):(\d+):(\d+)\)/);
          if (match) {
            callerInfo = {
              method: match[1],
              file: match[2],
              line: match[3]
            };
          }
        }
      } catch (e) {
        // Ignore errors in stack tracing
      }

      // Helper to set the current operation
      const setOperation = (op) => {
        operation = op;
        return queryBuilder[op];
      };

      // Function to track query execution
      const trackQueryExecution = async (query, method) => {
        const startTime = performance.now();
        try {
          const result = await query;
          const duration = performance.now() - startTime;

          // Track the query if it took more than 5ms (avoid tracking trivial queries)
          if (duration > 5) {
            queryMonitor.trackQuery({
              query: `${operation} from ${table}${method ? ` [${method}]` : ''}`,
              operation,
              repository: callerInfo.file || 'unknown',
              method: callerInfo.method || 'unknown',
              duration,
              params: { table }
            });
          }

          return result;
        } catch (error) {
          const duration = performance.now() - startTime;
          // Track failed queries as well
          queryMonitor.trackQuery({
            query: `${operation} from ${table}${method ? ` [${method}]` : ''} (ERROR)`,
            operation,
            repository: callerInfo.file || 'unknown',
            method: callerInfo.method || 'unknown',
            duration,
            params: { table, error: error.message }
          });
          throw error;
        }
      };

      // Create a proxy to wrap all query methods
      return new Proxy(queryBuilder, {
        get: (target, prop) => {
          // Short-circuit for properties that aren't functions
          if (typeof target[prop] !== 'function') {
            return target[prop];
          }

          // Handle operation methods that start a query
          if (['select', 'insert', 'update', 'delete', 'upsert'].includes(prop)) {
            operation = prop;
            return (...args) => {
              const result = target[prop](...args);
              return new Proxy(result, {
                get: (innerTarget, innerProp) => {
                  if (typeof innerTarget[innerProp] !== 'function') {
                    return innerTarget[innerProp];
                  }

                  // These methods execute the query
                  if (['then', 'catch', 'finally'].includes(innerProp)) {
                    // For promise methods, we need to execute the query first and then chain
                    return async (...innerArgs) => {
                      const query = innerTarget[innerProp].bind(innerTarget);
                      return trackQueryExecution(
                        new Promise((resolve, reject) => {
                          query(...innerArgs).then(resolve).catch(reject);
                        }),
                        innerProp
                      );
                    };
                  }

                  return (...innerArgs) => {
                    const result = innerTarget[innerProp](...innerArgs);
                    if (innerProp === 'execute' || innerProp === 'single' || innerProp === 'maybeSingle') {
                      return trackQueryExecution(result, innerProp);
                    }
                    return result;
                  };
                }
              });
            };
          }

          // Pass through other methods
          return target[prop];
        }
      });
    }
  };

  // Don't wrap the auth object to avoid complications
  monitoredClient.auth = client.auth;

  return monitoredClient;
}

export { supabaseClient, queryMonitor };
export default supabaseClient;
