/**
 * Evaluation Domain Test Setup
 * 
 * Provides setup and teardown functions for evaluation domain tests
 */

const { setup: commonSetup, teardown: commonTeardown } = require('../../helpers/testSetup');
const { createInMemoryEvaluationRepository } = require('../../helpers/inMemory/inMemoryRepository');

// In-memory repositories for testing
let evaluationRepository;

/**
 * Sets up the evaluation domain test environment
 */
function setup(options = {}) {
  // Call common setup
  commonSetup(options);
  
  // Initialize in-memory repositories
  evaluationRepository = createInMemoryEvaluationRepository();
  
  // Mock the repository modules to use in-memory implementation
  try {
    jest.mock('../../../src/core/evaluation/repositories/evaluationRepository', () => evaluationRepository);
  } catch (error) {
    console.warn('Could not mock evaluation repository:', error.message);
  }
  
  return {
    evaluationRepository
  };
}

/**
 * Tears down the evaluation domain test environment
 */
function teardown() {
  // Reset mocks
  jest.restoreAllMocks();
  
  // Clear repositories
  if (evaluationRepository) {
    evaluationRepository.deleteAll();
  }
  
  // Call common teardown
  commonTeardown();
}

module.exports = {
  setup,
  teardown
}; 