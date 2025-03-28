/**
 * Integration Test Setup
 * 
 * Configures the testing environment for integration tests
 * Handles setup and teardown between tests
 */

const domainEvents = require('../../src/core/common/events/domainEvents');
const logger = require('../../src/utils/logger');

// Configure the logger for tests
if (logger.configure) {
  logger.configure({
    level: process.env.TEST_LOG_LEVEL || 'error', // Silence logs in tests unless specified
    transports: [] // No transports in tests
  });
}

/**
 * Reset application state before each test
 */
function resetAppState() {
  // Clear domain events
  domainEvents.clearAll();
}

/**
 * Setup function to call before each test
 */
function setup() {
  resetAppState();
}

/**
 * Teardown function to call after each test
 */
function teardown() {
  resetAppState();
}

module.exports = {
  setup,
  teardown,
  resetAppState
}; 