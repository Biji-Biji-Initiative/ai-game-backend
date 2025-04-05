/**
 * Mocha Setup Hook (ESM)
 * 
 * This file is used by Mocha to setup the testing environment before running tests.
 * Note that this hook will be imported, not required, as we're using ES modules.
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env.test file
const envPaths = [
  path.resolve(__dirname, '../../.env.test'),
  path.resolve(process.cwd(), '.env.test')
];

let loaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Found .env.test file at ${envPath}`);
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log('Environment variables loaded from .env.test');
      
      // Set a debug flag to indicate we've loaded the environment
      process.env.ENV_LOADED_BY_MOCHA = 'true';
      
      // Print some diagnostic info
      if (process.env.DEBUG_ENV === 'true') {
        console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'NOT SET');
        console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'EXISTS' : 'NOT SET');
        console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'EXISTS' : 'NOT SET');
      }
      
      loaded = true;
      break;
    } else {
      console.error(`Error loading .env.test from ${envPath}:`, result.error);
    }
  }
}

if (!loaded) {
  console.warn('No .env.test file found. Using existing environment variables.');
}

// Tell Mocha this module doesn't export anything
export default {}; 