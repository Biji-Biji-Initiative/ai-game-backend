/**
 * Environment Configuration Manager
 * 
 * This module is responsible for loading and validating environment variables
 * following clean architecture principles. It loads from multiple sources
 * with a clear priority order and validates required variables.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Load environment variables from .env file
dotenv.config({ path: path.join(rootDir, '.env') });

// Define environment variables with validation and defaults
const envConfig = {
  // Server configuration
  NODE_ENV: {
    value: process.env.NODE_ENV || 'development',
    required: false,
    default: 'development',
    validate: (value) => ['development', 'production', 'test'].includes(value)
  },
  PORT: {
    value: process.env.PORT || 3000,
    required: false,
    default: 3000,
    validate: (value) => !isNaN(parseInt(value, 10))
  },
  BASE_URL: {
    value: process.env.BASE_URL || 'http://localhost:3000',
    required: false,
    default: 'http://localhost:3000'
  },
  
  // API configuration
  API_PREFIX: {
    value: process.env.API_PREFIX || '/api/v1',
    required: false,
    default: '/api/v1'
  },
  API_DOCS_PATH: {
    value: process.env.API_DOCS_PATH || '/api-docs',
    required: false,
    default: '/api-docs'
  },
  API_TESTER_PATH: {
    value: process.env.API_TESTER_PATH || '/tester',
    required: false,
    default: '/tester'
  },
  
  // Database configuration
  SUPABASE_URL: {
    value: process.env.SUPABASE_URL,
    required: true,
    validate: (value) => value && value.startsWith('https://')
  },
  SUPABASE_KEY: {
    value: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY,
    required: true,
    validate: (value) => value && value.length > 10
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    value: process.env.SUPABASE_SERVICE_ROLE_KEY,
    required: process.env.NODE_ENV === 'production',
    validate: (value) => value && value.length > 10
  },
  
  // OpenAI configuration
  OPENAI_API_KEY: {
    value: process.env.OPENAI_API_KEY,
    required: true,
    validate: (value) => value && value.startsWith('sk-')
  },
  OPENAI_DEFAULT_MODEL: {
    value: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o',
    required: false,
    default: 'gpt-4o'
  },
  
  // Logging configuration
  LOG_LEVEL: {
    value: process.env.LOG_LEVEL || 'info',
    required: false,
    default: 'info',
    validate: (value) => ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'].includes(value)
  },
  LOG_ERROR_PATH: {
    value: process.env.LOG_ERROR_PATH || 'logs/error.log',
    required: false,
    default: 'logs/error.log'
  },
  LOG_COMBINED_PATH: {
    value: process.env.LOG_COMBINED_PATH || 'logs/combined.log',
    required: false,
    default: 'logs/combined.log'
  },
  LOG_CONSOLE: {
    value: process.env.LOG_CONSOLE === 'true',
    required: false,
    default: true
  }
};

// Process, validate and build the final config
const config = {};
const missingVars = [];

for (const [key, settings] of Object.entries(envConfig)) {
  // Set the value (either from env, or default)
  config[key] = settings.value || settings.default;
  
  // Check if required
  if (settings.required && !config[key]) {
    missingVars.push(key);
  }
  
  // Validate if necessary
  if (config[key] && settings.validate && !settings.validate(config[key])) {
    throw new Error(`Environment variable ${key} has invalid value: ${config[key]}`);
  }
}

// Throw an error if required variables are missing
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Export the processed configuration
export default config; 