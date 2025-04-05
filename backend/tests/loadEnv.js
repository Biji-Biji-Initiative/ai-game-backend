/**
 * Tests Environment Variables Loader
 *
 * This file centralizes environment variable loading for tests.
 * It's intended to be used with mocha's --require flag:
 * For example: npx mocha --require tests/loadEnv.js tests/path/to/test.js
 */
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define potential env file locations in order of preference
const envFiles = [
    path.resolve(process.cwd(), '.env.test'),
    path.resolve(process.cwd(), '.env')
];

// Load environment variables immediately on module import
// This way the environment is set up before any test runs
let envFileLoaded = false;
for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
        const result = dotenv.config({ path: envFile });
        if (!result.error) {
            console.log(`Environment loaded from: ${envFile}`);
            envFileLoaded = true;
            break;
        }
    }
}

if (!envFileLoaded) {
    console.warn('Warning: No .env or .env.test file found, using existing environment variables');
}

// Validate required test environment variables
const requiredVars = [
    'OPENAI_API_KEY'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.warn(`Warning: Missing recommended environment variables for tests: ${missingVars.join(', ')}`);
    console.warn('Some tests may be skipped due to missing credentials');
}

// Debug environment variables 
if (process.env.DEBUG_ENV === 'true') {
    console.log('ENV DEBUG: SUPABASE_URL =', process.env.SUPABASE_URL ? process.env.SUPABASE_URL : 'NOT SET');
    console.log('ENV DEBUG: SUPABASE_KEY =', process.env.SUPABASE_KEY ? 'EXISTS' : 'NOT SET');
    console.log('ENV DEBUG: SUPABASE_ANON_KEY =', process.env.SUPABASE_ANON_KEY ? 'EXISTS' : 'NOT SET');
    console.log('ENV DEBUG: NODE_ENV =', process.env.NODE_ENV);
}

// Export a flag that indicates the environment was loaded
// This doesn't cause circular dependencies but allows other modules to check
export const environmentLoaded = true;
