/**
 * Prompt Domain Test Setup
 * 
 * Provides setup and teardown functions for prompt domain tests
 */

const { setup: commonSetup, teardown: commonTeardown } = require('../../helpers/testSetup');

/**
 * Sets up the prompt domain test environment
 */
function setup(options = {}) {
  // Call common setup
  commonSetup(options);
  
  // Initialize prompt builders and any necessary dependencies
  const promptBuilder = require('../../../src/core/prompt/promptBuilder');
  
  // Reset prompt builder registrations
  promptBuilder.reset && promptBuilder.reset();
  
  // Register default builders
  promptBuilder.registerDefaultBuilders && promptBuilder.registerDefaultBuilders();
  
  return {
    promptBuilder
  };
}

/**
 * Tears down the prompt domain test environment
 */
function teardown() {
  // Reset mocks
  jest.restoreAllMocks();
  
  // Reset prompt builders
  try {
    const promptBuilder = require('../../../src/core/prompt/promptBuilder');
    promptBuilder.reset && promptBuilder.reset();
  } catch (error) {
    console.warn('Error resetting prompt builder:', error.message);
  }
  
  // Call common teardown
  commonTeardown();
}

module.exports = {
  setup,
  teardown
}; 