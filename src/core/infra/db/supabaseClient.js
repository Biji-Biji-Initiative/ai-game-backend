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
  const SUPABASE_KEY = options.key || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

  // Check that we have the necessary credentials
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    const error = new Error('Supabase credentials not found in environment variables');
    logger.error('Failed to initialize Supabase client', { error: error.message });
    throw error;
  }

  try {
    // Create the Supabase client with the provided credentials
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
      ...options.clientOptions
    });
    
    logger.info('Supabase client initialized successfully');
    return supabaseClient;
  } catch (error) {
    logger.error('Failed to initialize Supabase client', { error: error.message });
    throw error;
  }
}

// Create default client
const supabaseClient = createSupabaseClient();

module.exports = {
  supabaseClient,
  createSupabaseClient
}; 