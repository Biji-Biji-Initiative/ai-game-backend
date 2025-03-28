/**
 * Domain Tests Setup
 * 
 * This file provides common setup and teardown functions for domain tests.
 */

const sinon = require('sinon');
const {
  createInMemoryChallengeRepository,
  createInMemoryFocusAreaRepository,
  createInMemoryEvaluationRepository,
  createInMemoryUserRepository,
  createInMemoryPersonalityRepository,
  createInMemoryPromptRepository,
  createInMemoryConversationStateRepository
} = require('../helpers/inMemory');

// Mock domain events
const domainEventsMock = {
  publish: () => Promise.resolve(),
  subscribe: () => {},
  unsubscribe: () => {}
};

/**
 * Sets up the test environment with in-memory repositories
 * and sinon sandbox
 */
function setup() {
  const sandbox = sinon.createSandbox();
  
  // Create in-memory repositories
  const repositories = {
    challengeRepository: createInMemoryChallengeRepository(),
    focusAreaRepository: createInMemoryFocusAreaRepository(),
    evaluationRepository: createInMemoryEvaluationRepository(),
    userRepository: createInMemoryUserRepository(),
    personalityRepository: createInMemoryPersonalityRepository(),
    promptRepository: createInMemoryPromptRepository(),
    conversationStateRepository: createInMemoryConversationStateRepository()
  };
  
  // Mock any external dependencies here
  const mocks = {
    openAIClient: {
      responses: {
        create: sandbox.stub().resolves({
          choices: [{
            message: {
              content: JSON.stringify({
                result: 'mock response',
                details: 'This is a mock OpenAI response'
              })
            }
          }]
        })
      },
      sendJsonMessage: sandbox.stub().resolves({
        data: {
          result: 'mock response',
          details: 'This is a mock OpenAI response'
        }
      })
    },
    supabaseClient: {
      from: sandbox.stub().returnsThis(),
      select: sandbox.stub().returnsThis(),
      insert: sandbox.stub().returnsThis(),
      update: sandbox.stub().returnsThis(),
      delete: sandbox.stub().returnsThis(),
      eq: sandbox.stub().returnsThis(),
      single: sandbox.stub().resolves({
        data: {}, 
        error: null
      })
    },
    domainEvents: domainEventsMock
  };
  
  return {
    sandbox,
    ...repositories,
    ...mocks
  };
}

/**
 * Tears down the test environment,
 * restoring sinon stubs and clearing repositories
 */
function teardown(sandbox) {
  if (sandbox) {
    sandbox.restore();
  } else {
    sinon.restore();
  }
}

module.exports = {
  setup,
  teardown
}; 