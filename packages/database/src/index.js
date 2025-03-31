/**
 * Database Package
 *
 * This package provides database functionality for the application.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('ERROR: SUPABASE_URL environment variable is required');
}

if (!supabaseKey) {
  console.error('ERROR: SUPABASE_KEY/SUPABASE_ANON_KEY environment variable is required');
}

// Create and export the Supabase client
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    })
  : null;

/**
 * Initialize the database connection
 * @returns {Promise<boolean>} True if connection successful
 */
export async function initializeDatabase() {
  if (!supabase) {
    return false;
  }

  try {
    console.log('Initializing database connection...');

    // Perform a simple query to test the connection
    const { error } = await supabase.from('users').select('id').limit(1);

    if (error) {
      throw new Error(`Failed to connect to database: ${error.message}`);
    }

    console.log('Database connection initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database connection', error.message);
    return false;
  }
}

/**
 * Check if the database is healthy
 * @returns {Promise<Object>} Health check result
 */
export async function checkDatabaseHealth() {
  if (!supabase) {
    return { status: 'error', message: 'Database client not initialized' };
  }

  try {
    const startTime = Date.now();
    const { error } = await supabase.from('users').select('id').limit(1);
    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: 'error',
        message: `Database connection error: ${error.message}`,
        responseTime
      };
    }

    return {
      status: 'healthy',
      message: 'Database connection is healthy',
      responseTime
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Failed to check database health: ${error.message}`
    };
  }
}

// Default export for compatibility
export default {
  supabase,
  initializeDatabase,
  checkDatabaseHealth
};
