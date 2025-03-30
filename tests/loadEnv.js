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
// Try loading each env file in order until one is found
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
// Export validated config
const testConfig = {
    /**
     * Returns a validated config object with all environment variables
     * Tests can use this instead of directly accessing process.env
     */
    getTestConfig: () => {
        return {
            openai: {
                apiKey: process.env.OPENAI_API_KEY || null,
                organization: process.env.OPENAI_ORGANIZATION || null,
            },
            supabase: {
                url: process.env.SUPABASE_URL || null,
                key: process.env.SUPABASE_KEY || null,
                anonKey: process.env.SUPABASE_ANON_KEY || null,
                serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
            },
            test: {
                timeout: parseInt(process.env.TEST_TIMEOUT || '30000', 10)
            }
        };
    },
    /**
     * Checks if all required variables for a specific test type are present
     * @param {string} testType - Type of test ('openai', 'supabase', etc.)
     * @returns {boolean} - Whether all required variables are present
     */
    hasRequiredVars: testType => {
        switch (testType) {
            case 'openai':
                return !!process.env.OPENAI_API_KEY;
            case 'supabase':
                return !!(process.env.SUPABASE_URL &&
                    (process.env.SUPABASE_KEY ||
                        process.env.SUPABASE_ANON_KEY ||
                        process.env.SUPABASE_SERVICE_ROLE_KEY));
            default:
                return true;
        }
    }
};
export default testConfig;
