/**
 * Supabase Client Factory - provides configurable access to Supabase
 * Supports both real connections and mock implementations
 */
import { createClient } from "@supabase/supabase-js";
import { createMockSupabaseClient, resetMockDatabase } from "./mockSupabase.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

// Default configuration
const DEFAULT_CONFIG = {
  // Use mock by default in test environments, real in others
  useMock: process.env.NODE_ENV === 'test',
  // Only log actions in verbose mode
  verbose: process.env.VERBOSE_TESTING === 'true',
  // Real Supabase credentials
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  // Use service key if available
  useServiceKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
};

/**
 * Creates a Supabase client based on configuration
 * @param {Object} options - Configuration options
 * @param {boolean} options.useMock - Whether to use the mock client (default: based on NODE_ENV)
 * @param {boolean} options.resetMockDb - Whether to reset the mock DB before returning client
 * @param {string} options.supabaseUrl - URL for real Supabase connection
 * @param {string} options.supabaseKey - API key for real Supabase connection
 * @param {boolean} options.useServiceKey - Whether to prefer service key over anon key
 * @param {boolean} options.verbose - Whether to log verbose information
 * @returns {Object} Supabase client (real or mock)
 */
export function getSupabaseClient(options = {}) {
  // Merge options with defaults
  const config = { ...DEFAULT_CONFIG, ...options };
  
  // Determine which key to use based on configuration
  if (config.useServiceKey) {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      config.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (config.verbose) {
        console.log('Using Supabase service role key for elevated permissions');
      }
    } else if (process.env.SUPABASE_SERVICE_KEY) {
      config.supabaseKey = process.env.SUPABASE_SERVICE_KEY;
      if (config.verbose) {
        console.log('Using Supabase service key for elevated permissions');
      }
    } else if (process.env.SUPABASE_ANON_KEY) {
      config.supabaseKey = process.env.SUPABASE_ANON_KEY;
      if (config.verbose) {
        console.log('Using Supabase anon key (limited permissions) - service key not found');
      }
    }
  } else if (process.env.SUPABASE_ANON_KEY) {
    config.supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (config.verbose) {
      console.log('Using Supabase anon key (limited permissions)');
    }
  }
  
  // Use mock client if configured or if real credentials are missing
  const shouldUseMock = 
    config.useMock || 
    !config.supabaseUrl || 
    !config.supabaseKey;
  
  if (shouldUseMock) {
    if (config.verbose) {
      console.log('Using mock Supabase client');
    }
    
    const mockClient = createMockSupabaseClient();
    
    // Reset mock DB if requested
    if (config.resetMockDb) {
      resetMockDatabase();
      if (config.verbose) {
        console.log('Mock database reset');
      }
    }
    
    return mockClient;
  } else {
    if (config.verbose) {
      console.log(`Connecting to real Supabase at: ${config.supabaseUrl}`);
    }
    
    // Create and return a real Supabase client
    return createClient(config.supabaseUrl, config.supabaseKey);
  }
}

/**
 * Environment-aware function to determine if tests should use real Supabase
 * @returns {boolean} Whether tests should use real Supabase
 */
export function shouldUseRealSupabase() {
  // Use env var to explicitly enable/disable real Supabase
  if (process.env.USE_REAL_SUPABASE === 'true') {
    return true;
  }
  
  if (process.env.USE_REAL_SUPABASE === 'false') {
    return false;
  }
  
  // Check if credentials exist
  const hasCredentials = !!(process.env.SUPABASE_URL && 
    (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
  
  // Default behavior: use real if credentials exist and not in CI environment
  return hasCredentials && !process.env.CI;
}

/**
 * Check if service key is available for elevated permissions
 * @returns {boolean} Whether a service key is available
 */
export function hasServiceKey() {
  return !!(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Creates a test-appropriate Supabase client
 * Uses real client for integration tests if configured/possible
 * Falls back to mock client for unit tests or when integration not possible
 * @param {Object} options - Additional options to pass to client factory
 * @returns {Object} Appropriate Supabase client
 */
export function getTestSupabaseClient(options = {}) {
  return getSupabaseClient({
    useMock: !shouldUseRealSupabase(),
    useServiceKey: true, // Always try to use service key for tests if available
    resetMockDb: true,
    verbose: true,
    ...options
  });
} 