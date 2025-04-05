/**
 * Test Configuration Bridge
 * 
 * This file serves as a bridge between the test environment setup and the test helpers.
 * It provides access to configuration values from process.env, which are set by the test runner.
 * 
 * IMPORTANT: This file should NOT import loadEnv.js or any file that loads environment
 * variables to avoid circular dependencies. It should only read from process.env
 * which will already be populated by the test runner or Mocha setup hooks.
 */

/**
 * Retrieves the test configuration values from process.env
 * @returns {Object} Configuration values
 */
export function getTestConfig() {
    return {
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY, 
        openaiApiKey: process.env.OPENAI_API_KEY,
        environment: process.env.NODE_ENV || 'test',
        baseUrl: process.env.BASE_URL || 'http://localhost:3081',
        mockMode: process.env.TEST_MOCK_MODE === 'true' || false
    };
}

/**
 * Checks if all required environment variables are set
 * @param {string[]} requiredVars - Array of required environment variable names
 * @returns {boolean} True if all required vars are present
 */
export function hasRequiredVars(requiredVars) {
    if (!requiredVars || !Array.isArray(requiredVars)) {
        return false;
    }
    
    return requiredVars.every(varName => {
        const value = process.env[varName];
        return value !== undefined && value !== null && value !== '';
    });
}

/**
 * Gets the value of a specific environment variable
 * @param {string} varName - The name of the environment variable
 * @returns {string|undefined} The value of the environment variable
 */
export function getEnvVar(varName) {
    return process.env[varName];
}

export default {
    getTestConfig,
    hasRequiredVars,
    getEnvVar
}; 