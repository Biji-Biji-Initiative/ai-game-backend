/**
 * Simple test helpers for workflow tests
 */

/**
 * Skip a test if the required environment variable is missing
 * @param {Object} context - Mocha test context 
 * @param {string} envName - Name of the required environment
 */
export function skipIfMissingEnv(context, envName) {
  if (!process.env[`${envName.toUpperCase()}_URL`] || !process.env[`${envName.toUpperCase()}_KEY`]) {
    console.warn(`${envName.toUpperCase()} credentials not found, skipping test`);
    context.skip();
  }
}

/**
 * Generates a random test ID for use in tests
 * @returns {string} - A unique ID for test data
 */
export function generateTestId() {
  return `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
} 