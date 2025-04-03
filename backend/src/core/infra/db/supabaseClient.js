/**
 * Supabase Client for Database Access
 *
 * Infrastructure service for database operations using Supabase.
 * Moved from utilities to follow Domain-Driven Design principles.
 */
import { createClient } from '@supabase/supabase-js';
import { logger } from "#app/core/infra/logging/logger.js";

let supabaseClient = null;

/**
 * Initializes and returns the Supabase client singleton.
 * Ensures initialization happens only once and after config is ready.
 * @param {object} config - Application configuration containing SUPABASE_URL and keys.
 * @param {object} [initLogger=logger] - Logger instance to use for initialization.
 * @returns {import('@supabase/supabase-js').SupabaseClient} The initialized Supabase client.
 */
function initializeSupabaseClient(config, initLogger = logger) {
  if (supabaseClient) {
    return supabaseClient;
  }

  initLogger.info('Attempting to initialize Supabase client...');

  try {
    const supabaseUrl = config?.supabase?.url || process.env.SUPABASE_URL;
    let supabaseKey;

    // Always prefer service role for backend server operations to bypass RLS
    supabaseKey = config?.supabase?.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Fall back to anon key only if service role is unavailable
    if (!supabaseKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY (or config.supabase.serviceRoleKey) is required in production');
      } else {
        supabaseKey = config?.supabase?.anonKey || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
        initLogger.warn('Using anon/dev key for Supabase. Some operations may fail due to RLS policies.');
      }
    } else {
      initLogger.info('Using service role key for Supabase (bypasses RLS).');
    }

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL (or config.supabase.url) environment variable is required');
    }

    // Create the Supabase client
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true, // Recommended for server-side usage
      },
      // Optional: Configure realtime if needed
      // realtime: {
      //   params: {
      //     eventsPerSecond: 10,
      //   },
      // },
    });

    initLogger.info('Supabase client configured. Performing connection test...', {
      supabaseUrl: supabaseUrl.split('.').slice(0, 2).join('.') + '...', // Avoid logging full URL
      environment: process.env.NODE_ENV
    });

    // Test connection asynchronously (don't block initialization)
    (async () => {
      try {
        // A simple query to check connectivity and permissions
        const { error } = await supabaseClient.from('users').select('id', { count: 'exact', head: true }).limit(1);
        if (error) {
          initLogger.error('Supabase connection test failed post-initialization', {
            error: error.message,
            code: error.code,
            hint: error.hint || 'Check credentials, network access, and RLS policies.'
          });
        } else {
          initLogger.info('Supabase connection test successful.');
        }
      } catch (testError) {
        initLogger.error('Error during async Supabase connection test', {
          error: testError.message,
          stack: testError.stack
        });
      }
    })();

  } catch (error) {
    initLogger.error('CRITICAL: Failed to initialize Supabase client', {
      error: error.message,
      stack: error.stack
    });

    // In development/test, create a mock client to allow startup
    if (process.env.NODE_ENV !== 'production') {
      initLogger.warn('Creating mock Supabase client for development/testing.');
      supabaseClient = createMockSupabaseClient(initLogger);
    } else {
      // In production, failure to connect is critical
      throw new Error(`Production environment: Supabase client initialization failed: ${error.message}`);
    }
  }

  return supabaseClient;
}

/**
 * Creates a mock Supabase client for development/testing.
 * @param {object} mockLogger - Logger instance.
 * @returns {object} A mock Supabase client.
 */
function createMockSupabaseClient(mockLogger) {
  mockLogger.warn('Using MOCK Supabase client. No real database operations will occur.');
  const mockUserData = { 
    id: 'mock-user-id', 
    email: 'mock@example.com',
    full_name: 'Mock User', 
    // Add other fields as needed by your app
  };
  return {
    auth: {
      signInWithPassword: async () => ({ data: { user: mockUserData, session: { access_token: 'mock-token' } }, error: null }),
      signUp: async () => ({ data: { user: mockUserData, session: { access_token: 'mock-token' } }, error: null }),
      signOut: async () => ({ error: null }),
      getUser: async () => ({ data: { user: mockUserData }, error: null })
    },
    from: (table) => ({
      select: () => ({
        eq: () => ({ 
          single: async () => ({ data: table === 'users' ? mockUserData : {}, error: null })
        }),
        single: async () => ({ data: table === 'users' ? mockUserData : {}, error: null }),
        // Add other query methods if needed by tests
        then: (callback) => Promise.resolve({ data: [], error: null }).then(callback)
      }),
      insert: async (data) => ({ data: [{ ...data, id: `mock-${table}-id` }], error: null }),
      update: async () => ({ data: [{ id: `mock-${table}-id` }], error: null }),
      delete: async () => ({ data: {}, error: null })
    }),
    // Add other Supabase methods if used (e.g., rpc, storage)
  };
}

// Export the initializer function, not the client directly
export { initializeSupabaseClient };

// Default export can be the function too, or removed if only named export is preferred.
export default initializeSupabaseClient;