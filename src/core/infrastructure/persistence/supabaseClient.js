/**
 * Supabase Client for Database Access
 * 
 * Infrastructure service for database operations using Supabase.
 * Moved from utilities to follow Domain-Driven Design principles.
 */

const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../logging/logger');

/**
 * Creates and configures a Supabase client
 * @param {Object} options - Configuration options
 * @returns {Object} Configured Supabase client
 */
function createSupabaseClient(options = {}) {
  // Get Supabase credentials from environment variables or options
  const SUPABASE_URL = options.url || process.env.SUPABASE_URL;
  const SUPABASE_KEY = options.useServiceRole 
    ? (options.key || process.env.SUPABASE_SERVICE_ROLE_KEY)
    : (options.key || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY);

  // Log the environment variables for debugging (redact actual keys for security)
  console.log('Supabase configuration:', {
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_KEY: SUPABASE_KEY ? `${SUPABASE_KEY.substring(0, 10)}...` : 'none',
    useServiceRole: options.useServiceRole || false,
    envVariables: {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'missing',
      SUPABASE_KEY: process.env.SUPABASE_KEY ? 'set' : 'missing',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'set' : 'missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing'
    }
  });

  // Check that we have the necessary credentials
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    // In development or test mode, return a mock client instead of failing
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      logger.warn('Supabase credentials not found, using mock client (development/test mode)');
      return createMockSupabaseClient();
    }
    
    logger.error('Supabase credentials not found in environment variables', { 
      namespace: 'app'
    });
    throw new Error('Supabase credentials not found in environment variables');
  }

  try {
    // Create the Supabase client with the provided credentials
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
      ...options.clientOptions
    });
    
    logger.info('Supabase client initialized successfully', { 
      isServiceRole: options.useServiceRole 
    });
    return supabaseClient;
  } catch (error) {
    logger.error('Failed to initialize Supabase client', { error: error.message });
    throw error;
  }
}

// Create default client with anonymous key
const supabaseClient = createSupabaseClient();

// Create admin client with service role key
const supabaseAdmin = createSupabaseClient({ useServiceRole: true });

// Add this function to create a mock client
function createMockSupabaseClient() {
  // Create a simple mock client that won't fail tests
  return {
    auth: {
      signUp: () => Promise.resolve({ data: { user: { id: 'mock-user-id' } }, error: null }),
      signIn: () => Promise.resolve({ data: { user: { id: 'mock-user-id' } }, error: null }),
      signOut: () => Promise.resolve({ error: null })
    },
    from: (table) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { id: 'mock-data-id' }, error: null }),
          maybeSingle: () => Promise.resolve({ data: { id: 'mock-data-id' }, error: null }),
          order: () => ({
            limit: () => Promise.resolve({ data: [{ id: 'mock-data-id' }], error: null }),
          }),
          limit: () => Promise.resolve({ data: [{ id: 'mock-data-id' }], error: null }),
          execute: () => Promise.resolve({ data: [{ id: 'mock-data-id' }], error: null }),
        }),
        execute: () => Promise.resolve({ data: [{ id: 'mock-data-id' }], error: null }),
        order: () => ({
          limit: () => Promise.resolve({ data: [{ id: 'mock-data-id' }], error: null }),
        }),
        limit: () => Promise.resolve({ data: [{ id: 'mock-data-id' }], error: null }),
      }),
      insert: () => Promise.resolve({ data: { id: 'mock-data-id' }, error: null }),
      update: () => ({
        eq: () => Promise.resolve({ data: { id: 'mock-data-id' }, error: null }),
        match: () => Promise.resolve({ data: { id: 'mock-data-id' }, error: null }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: { id: 'mock-data-id' }, error: null }),
        match: () => Promise.resolve({ data: { id: 'mock-data-id' }, error: null }),
      }),
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: { path: 'mock-path' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'mock-url' } }),
      }),
    },
  };
}

module.exports = {
  supabaseClient,
  supabaseAdmin,
  createSupabaseClient
}; 