/**
 * Supabase Client for database access
 * 
 * @module supabaseClient
 * @requires @supabase/supabase-js
 * @requires dotenv
 * @requires logger
 */

const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../logger');

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client
let supabaseClient;

// Check that we have the necessary environment variables
if (!SUPABASE_URL || !SUPABASE_KEY) {
  const error = new Error('Supabase credentials not found in environment variables');
  logger.error('Failed to initialize Supabase client', { error: error.message });
  throw error;
}

try {
  // Create the Supabase client with the provided credentials
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });
  
  logger.info('Supabase client initialized successfully');
} catch (error) {
  logger.error('Failed to initialize Supabase client', { error: error.message });
  throw error;
}

module.exports = {
  supabaseClient
}; 