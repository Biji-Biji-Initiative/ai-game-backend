/**
 * User-Personality Domain Integration Test
 * 
 * NOTE: This file has been replaced by real API integration tests in:
 * - tests/real-api/integration/user-personality-interaction.test.js
 * 
 * The real API tests make actual API calls with Supabase connections
 * instead of using mocks, providing more thorough end-to-end testing.
 * 
 * Run the real API tests with:
 * npm test -- --timeout=15000 tests/real-api/integration/user-personality-interaction.test.js
 */

// Re-export the real test file for backwards compatibility
module.exports = require('../real-api/integration/user-personality-interaction.test.js'); 