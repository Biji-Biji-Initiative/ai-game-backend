/**
 * Test Environment Setup Helper
 * 
 * Centralizes environment configuration for tests and provides validation
 * to ensure all required variables are present before tests run.
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

/**
 *
 */
class TestEnvironment {
  /**
   *
   */
  constructor() {
    this.requiredVars = {
      // Supabase Configuration
      SUPABASE_URL: 'Supabase project URL',
      SUPABASE_KEY: 'Supabase anon key',
      SUPABASE_SERVICE_ROLE_KEY: 'Supabase service role key'
    };
    
    // Move API_URL and TEST_USER items to optional for more flexible testing
    this.optionalVars = {
      // API Configuration
      API_URL: 'http://localhost:3000/api',
      
      // Test User Configuration
      TEST_USER_PASSWORD: 'Test1234!',
      TEST_USER_ROLE: 'user',
      
      // Other optional vars
      OPENAI_API_KEY: 'sk-placeholder-openai-api-key',
      TEST_API_URL: 'http://localhost:3000/api',
      SUPABASE_ANON_KEY: '',
      SUPABASE_JWT_SECRET: 'your_test_jwt_secret',
      TEST_LOG_LEVEL: 'error',
      TEST_TIMEOUT: '15000',
      NODE_ENV: 'test'
    };
  }

  /**
   * Loads variables from test.env file
   */
  loadTestEnv() {
    // First try to load from .env.test in root dir
    const rootEnvPath = path.join(__dirname, '..', '..', '.env.test');
    
    if (fs.existsSync(rootEnvPath)) {
      console.log('Loading environment from .env.test file');
      dotenv.config({ path: rootEnvPath });
      return;
    }
    
    // Fall back to test.env in config dir
    const testEnvPath = path.join(__dirname, '..', 'config', 'test.env');
    
    if (!fs.existsSync(testEnvPath)) {
      throw new Error(
        'test.env file not found at ' + testEnvPath + '\n' +
        'Please create it from test.env.example'
      );
    }
    
    // Load test environment variables
    console.log('Loading environment from test.env file');
    dotenv.config({ path: testEnvPath });
  }

  /**
   * Validates environment variables and sets defaults for optional ones
   * @throws {Error} If any required variables are missing
   */
  validateEnv() {
    const missing = [];
    
    // Override with any existing environment variables
    Object.keys(process.env).forEach(key => {
      if (Object.keys(this.requiredVars).includes(key) || Object.keys(this.optionalVars).includes(key)) {
        process.env[key] = process.env[key];
      }
    });
    
    // Check required variables
    Object.entries(this.requiredVars).forEach(([key, description]) => {
      if (!process.env[key]) {
        missing.push(`${key} - ${description}`);
      }
    });
    
    // Set defaults for optional variables
    Object.entries(this.optionalVars).forEach(([key, defaultValue]) => {
      if (!process.env[key]) {
        process.env[key] = defaultValue;
      }
    });
    
    if (missing.length > 0) {
      const errorMessage = `Missing required environment variables:\n${missing.join('\n')}`;
      throw new Error(errorMessage);
    }
  }

  /**
   * Initialize test environment
   */
  init() {
    // Force test environment
    process.env.NODE_ENV = 'test';
    
    // Load and validate environment
    this.loadTestEnv();
    this.validateEnv();
    
    // Set common test configurations
    if (!process.env.TEST_TIMEOUT) {
      process.env.TEST_TIMEOUT = '15000';
    }
    
    // Return environment for use in tests
    return {
      API_URL: process.env.API_URL,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_KEY: process.env.SUPABASE_KEY,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD,
      TEST_USER_ROLE: process.env.TEST_USER_ROLE,
      TEST_TIMEOUT: parseInt(process.env.TEST_TIMEOUT, 10)
    };
  }
}

// Create and export singleton instance
const testEnv = new TestEnvironment();

module.exports = testEnv; 