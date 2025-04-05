/**
 * Test Environment Loader
 * 
 * This module is used by Mocha to load environment variables for tests.
 * It handles the loading of .env.test or .env.ci files and sets up any
 * required global configurations for testing.
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Determine which environment file to load
const envFile = process.env.NODE_ENV === 'ci' ? '.env.ci' : '.env.test';
const envPath = path.join(rootDir, envFile);

// Load environment variables
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error(`Error loading ${envFile}:`, result.error);
    throw result.error;
  }
  
  console.log(`Environment loaded from: ${envPath}`);
  
  // Log some debug information about critical environment variables
  // (without revealing sensitive values)
  console.log('ENV DEBUG: SUPABASE_URL =', process.env.SUPABASE_URL);
  console.log('ENV DEBUG: SUPABASE_KEY =', process.env.SUPABASE_KEY ? 'EXISTS' : 'MISSING');
  console.log('ENV DEBUG: SUPABASE_ANON_KEY =', process.env.SUPABASE_ANON_KEY ? 'EXISTS' : 'MISSING');
  console.log('ENV DEBUG: NODE_ENV =', process.env.NODE_ENV);
} else {
  console.warn(`Warning: Environment file ${envFile} not found at ${envPath}`);
  console.warn('Tests may fail due to missing environment variables');
}

// Set up global test configuration
global.TEST_ENV = {
  rootDir,
  isCI: process.env.NODE_ENV === 'ci',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
};

// Export a simple API for other test modules to use
export default {
  getRootDir: () => rootDir,
  isCI: () => process.env.NODE_ENV === 'ci',
  getEnv: (key, defaultValue = null) => process.env[key] || defaultValue,
}; 