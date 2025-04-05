/**
 * Test Configuration Module
 * 
 * This module provides access to test configuration settings and environment variables.
 * It's designed to avoid circular dependencies in the test setup process.
 */

'use strict';

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Cache for configuration values to avoid redundant parsing
let configCache = null;

/**
 * Initialize and load test environment variables
 * @returns {Object} Environment variables
 */
function initTestConfig() {
  if (configCache) {
    return configCache;
  }

  // Determine environment file path
  const rootDir = process.cwd();
  const testEnvFile = process.env.NODE_ENV === 'ci' 
    ? '.env.ci' 
    : '.env.test';
  
  const envPath = path.resolve(rootDir, testEnvFile);
  
  // Check if file exists
  if (!fs.existsSync(envPath)) {
    console.warn(`Warning: Environment file '${testEnvFile}' not found at ${envPath}`);
    return process.env;
  }
  
  // Load environment variables from file
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error(`Error loading environment from ${envPath}:`, result.error);
    throw result.error;
  }
  
  console.log(`Loaded test environment from ${testEnvFile}`);
  
  // Cache the environment
  configCache = { ...process.env };
  
  return configCache;
}

/**
 * Get test configuration
 * @returns {Object} Test configuration object
 */
export function getTestConfig() {
  const env = initTestConfig();
  
  return {
    // API and endpoint settings
    api: {
      baseUrl: env.API_BASE_URL || 'http://localhost:3081',
      timeout: parseInt(env.API_TIMEOUT || '5000', 10),
    },
    
    // Supabase configuration
    supabase: {
      url: env.SUPABASE_URL,
      anonKey: env.SUPABASE_ANON_KEY,
      serviceKey: env.SUPABASE_SERVICE_KEY,
    },
    
    // Test user data
    testUser: {
      email: env.TEST_USER_EMAIL || 'test@example.com',
      password: env.TEST_USER_PASSWORD || 'StrongP@ssw0rd',
      userId: env.TEST_USER_ID,
    },
    
    // External API keys
    openai: {
      apiKey: env.OPENAI_API_KEY,
      organization: env.OPENAI_ORGANIZATION,
    },
    
    // Test settings
    testing: {
      runSlowTests: env.RUN_SLOW_TESTS === 'true',
      skipDataCleanup: env.SKIP_DATA_CLEANUP === 'true',
      logLevel: env.TEST_LOG_LEVEL || 'error',
    },
    
    // Raw environment access
    env: env,
  };
}

/**
 * Check if all required variables are present
 * @param {string[]} requiredVars - List of required variable names
 * @returns {boolean} True if all required variables are present
 */
export function hasRequiredVars(requiredVars) {
  if (!Array.isArray(requiredVars) || requiredVars.length === 0) {
    return true;
  }
  
  const config = getTestConfig();
  
  for (const varName of requiredVars) {
    // Handle nested paths like "supabase.url"
    if (varName.includes('.')) {
      const parts = varName.split('.');
      let current = config;
      
      for (const part of parts) {
        if (current === undefined || current === null) {
          return false;
        }
        current = current[part];
      }
      
      if (current === undefined || current === null || current === '') {
        return false;
      }
    } 
    // Direct environment variable access
    else if (config.env[varName] === undefined || config.env[varName] === null || config.env[varName] === '') {
      return false;
    }
  }
  
  return true;
}

/**
 * Get a specific configuration value
 * @param {string} path - Dot-notation path to the configuration value
 * @param {any} defaultValue - Default value if not found
 * Get a required environment variable or throw an error
 * @param {string} varName - Environment variable name
 * @param {string} defaultValue - Optional default value
 * @returns {string} Environment variable value
 * @throws {Error} If the variable is not set and no default is provided
 */
export function getRequiredVar(varName, defaultValue) {
  const value = process.env[varName];
  
  if (value === undefined || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Required environment variable ${varName} is not set`);
  }
  
  return value;
}

export default {
  getTestConfig,
  hasRequiredVars,
  getRequiredVar
}; 