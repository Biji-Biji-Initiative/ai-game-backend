import { createClient } from '@supabase/supabase-js';
'use strict';

/**
 * Supabase client factory for creating and configuring Supabase clients
 * Provides a consistent way to create Supabase clients across the application
 */
class SupabaseClientFactory {
  /**
   * Create a new Supabase client
   * @param {Object} config - Configuration for the client
   * @param {string} config.supabaseUrl - Supabase URL
   * @param {string} config.supabaseKey - Supabase API key
   * @param {Object} [config.options] - Additional options for the client
   * @returns {Object} Supabase client
   */
  static createClient(config) {
    const { supabaseUrl, supabaseKey, options = {} } = config;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and API key are required');
    }
    
    // Default options
    const defaultOptions = {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      },
      global: {
        headers: {
          'x-application-name': 'cognitive-game-backend'
        }
      }
    };
    
    // Merge default options with provided options
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      auth: {
        ...defaultOptions.auth,
        ...(options.auth || {})
      },
      global: {
        ...defaultOptions.global,
        ...(options.global || {}),
        headers: {
          ...defaultOptions.global.headers,
          ...(options.global?.headers || {})
        }
      }
    };
    
    return createClient(supabaseUrl, supabaseKey, mergedOptions);
  }
  
  /**
   * Create a Supabase client from environment variables
   * @param {Object} [options] - Additional options for the client
   * @returns {Object} Supabase client
   */
  static createFromEnvironment(options = {}) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY environment variables are required');
    }
    
    return this.createClient({
      supabaseUrl,
      supabaseKey,
      options
    });
  }
  
  /**
   * Create a Supabase client for service role operations
   * @param {Object} [options] - Additional options for the client
   * @returns {Object} Supabase client with service role permissions
   */
  static createServiceClient(options = {}) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
    }
    
    return this.createClient({
      supabaseUrl,
      supabaseKey: serviceRoleKey,
      options: {
        ...options,
        auth: {
          ...(options.auth || {}),
          persistSession: false
        }
      }
    });
  }
}

export default SupabaseClientFactory;
