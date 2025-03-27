/**
 * Test Factory
 * 
 * Provides factory functions for creating test objects
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Creates a test user with optional overrides
 */
function createTestUser(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    professionalTitle: 'Software Engineer',
    location: 'San Francisco, CA',
    personality_traits: ['curious', 'analytical'],
    ai_attitudes: ['optimistic', 'pragmatic'],
    ...overrides
  };
}

/**
 * Creates a test challenge with optional overrides
 */
function createTestChallenge(overrides = {}) {
  return {
    id: uuidv4(),
    title: 'Test Challenge',
    content: 'This is a test challenge',
    difficulty: 'medium',
    type: 'scenario',
    focusArea: 'effective-communication',
    userId: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Creates a test focus area with optional overrides
 */
function createTestFocusArea(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'Test Focus Area',
    description: 'This is a test focus area for testing',
    userId: uuidv4(),
    priority: 1,
    metadata: {},
    createdAt: new Date(),
    ...overrides
  };
}

/**
 * Creates a test evaluation with optional overrides
 */
function createTestEvaluation(overrides = {}) {
  return {
    id: uuidv4(),
    challengeId: uuidv4(),
    userId: uuidv4(),
    score: 75,
    feedback: 'This is test feedback',
    strengths: ['clarity', 'structure'],
    weaknesses: ['brevity'],
    createdAt: new Date(),
    ...overrides
  };
}

module.exports = {
  createTestUser,
  createTestChallenge,
  createTestFocusArea,
  createTestEvaluation
};
