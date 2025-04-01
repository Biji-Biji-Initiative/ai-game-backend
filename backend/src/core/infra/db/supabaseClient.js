/**
 * Supabase Client for Database Access
 *
 * Infrastructure service for database operations using Supabase.
 * Moved from utilities to follow Domain-Driven Design principles.
 */
import { createClient } from '@supabase/supabase-js';
import { logger } from "#app/core/infra/logging/logger.js";

/**
 * Initialize Supabase client with proper error handling
 */
let supabaseClient = null;

try {
  const supabaseUrl = process.env.SUPABASE_URL;
  let supabaseKey;
  
  if (process.env.NODE_ENV === 'production') {
    // In production, require the service role key for server operations
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in production');
    }
    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    logger.info('Using SUPABASE_SERVICE_ROLE_KEY in production environment');
  } else {
    // In development/testing, use anon key or regular key
    supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
    logger.info(`Using ${process.env.SUPABASE_KEY ? 'SUPABASE_KEY' : 'SUPABASE_ANON_KEY'} in development environment`);
  }
  
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }
  
  if (!supabaseKey) {
    throw new Error('No Supabase key available. Set SUPABASE_KEY/SUPABASE_ANON_KEY for development or SUPABASE_SERVICE_ROLE_KEY for production');
  }
  
  // Create the Supabase client
  supabaseClient = createClient(supabaseUrl, supabaseKey, {
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
    environment: process.env.NODE_ENV
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
          eq: () => ({
            data: null, 
            error: null,
            single: () => Promise.resolve({ data: { 
              id: 'mock-id',
              email: 'mock@example.com',
              full_name: 'Mock User',
              professional_title: 'Software Engineer',
              location: 'Mock City',
              country: 'Mockland',
              focus_area: 'Testing',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, error: null })
          }),
          single: () => Promise.resolve({ data: { 
            id: 'mock-id',
            email: 'mock@example.com',
            full_name: 'Mock User',
            professional_title: 'Software Engineer',
            location: 'Mock City',
            country: 'Mockland',
            focus_area: 'Testing',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, error: null }),
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

export { supabaseClient };
export default supabaseClient;