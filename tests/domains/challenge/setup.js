/**
 * Challenge Domain Test Setup
 * 
 * Provides setup and teardown functions for challenge domain tests
 */

const { setup: commonSetup, teardown: commonTeardown } = require('../../helpers/testSetup');
const { createInMemoryChallengeRepository } = require('../../helpers/inMemory/inMemoryRepository');
const sinon = require('sinon');

// In-memory repositories for testing
let challengeRepository;
let sandbox;

/**
 * Sets up the challenge domain test environment
 */
function setup(options = {}) {
  // Initialize sinon sandbox for this test
  sandbox = sinon.createSandbox();
  
  // Call common setup
  commonSetup && commonSetup(options);
  
  // Initialize in-memory repositories
  challengeRepository = createInMemoryChallengeRepository();
  
  // Stub repository module
  const Challenge = require('../../../src/core/challenge/models/Challenge');
  
  return {
    challengeRepository,
    Challenge
  };
}

/**
 * Tears down the challenge domain test environment
 */
function teardown() {
  // Reset stubs
  sandbox && sandbox.restore();
  
  // Clear repositories
  if (challengeRepository) {
    challengeRepository.deleteAll && challengeRepository.deleteAll();
  }
  
  // Call common teardown
  commonTeardown && commonTeardown();
}

module.exports = {
  setup,
  teardown
}; 