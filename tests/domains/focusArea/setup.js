/**
 * Focus Area Domain Test Setup
 * 
 * Provides setup and teardown functions for focus area domain tests
 */

const { setup: commonSetup, teardown: commonTeardown } = require('../../helpers/testSetup');
const { createInMemoryFocusAreaRepository } = require('../../helpers/inMemory/inMemoryRepository');

// In-memory repositories for testing
let focusAreaRepository;

/**
 * Sets up the focus area domain test environment
 */
function setup(options = {}) {
  // Call common setup
  commonSetup(options);
  
  // Initialize in-memory repositories
  focusAreaRepository = createInMemoryFocusAreaRepository();
  
  // Mock the repository module to use in-memory implementation
  try {
    jest.mock('../../../src/core/focusArea/repositories/focusAreaRepository', () => focusAreaRepository);
  } catch (error) {
    console.warn('Could not mock focus area repository:', error.message);
  }
  
  return {
    focusAreaRepository
  };
}

/**
 * Tears down the focus area domain test environment
 */
function teardown() {
  // Reset mocks
  jest.restoreAllMocks();
  
  // Clear repositories
  if (focusAreaRepository) {
    focusAreaRepository.deleteAll();
  }
  
  // Call common teardown
  commonTeardown();
}

module.exports = {
  setup,
  teardown
}; 