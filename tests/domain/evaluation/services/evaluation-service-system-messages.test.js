const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

/**
 * Evaluation Service System Message Tests
 * 
 * Tests that services properly use dynamic system messages from prompt builders.
 * These tests ensure the feedback loop between user metrics and AI persona is active.
 */

// Create mock dependencies for our services
const mockOpenAIClient = {
  sendJsonMessage: sinon.stub().resolves({
    responseId: 'mock-response-id',
    data: {
      overallScore: 85,
      categoryScores: { clarity: 90, accuracy: 80 },
      feedback: 'Good work',
      strengths: ['Clear explanation'],
      improvements: ['Add more depth']
    }
  }),
  streamMessage: sinon.stub().callsFake(() => {
    const mockStream = {
      async *[Symbol.asyncIterator]() {
        yield { 
          response_id: 'mock-stream-id',
          output: [{ content: [{ text: 'Mock stream output' }] }]
        };
      }
    };
    return mockStream;
  })
};

const mockOpenAIStateManager = {
  findOrCreateConversationState: sinon.stub().resolves({ id: 'mock-state-id' }),
  getLastResponseId: sinon.stub().resolves('mock-previous-id'),
  updateLastResponseId: sinon.stub().resolves(true)
};

const mockOpenAIConfig = {
  OpenAITypes: {
    MessageRole: {
      SYSTEM: 'system',
      USER: 'user',
      ASSISTANT: 'assistant'
    }
  }
};

const mockPromptBuilder = {
  buildPrompt: sinon.stub().callsFake((type, params) => {
    // Create a dynamic system message based on user data
    const user = params.user || {};
    const personalityProfile = params.personalityProfile || {};
    
    return {
      prompt: 'Mock prompt content for testing',
      systemMessage: `Custom system message for ${user.skillLevel || 'standard'} level user with ${personalityProfile.communicationStyle || 'default'} communication style`
    };
  })
};

// Mock the container with our mock dependencies
const containerStub = {
  get: sinon.stub().callsFake((service) => {
    if (service === 'openAIClient') return mockOpenAIClient;
    if (service === 'openAIStateManager') return mockOpenAIStateManager;
    if (service === 'openAIConfig') return mockOpenAIConfig;
    if (service === 'promptBuilder') return mockPromptBuilder;
    return {};
  })
};

// Import the Supabase mock helper
const { createSupabaseProxyStub } = require('../../../helpers/mockSupabaseClient');

// Create a mock responsesApiClient for evaluationService tests
const mockResponsesApiClient = {
  sendJsonMessage: sinon.stub().resolves({
    responseId: 'mock-response-id',
    data: {
      overallScore: 85,
      categoryScores: { clarity: 90, accuracy: 80 },
      overallFeedback: 'Great work',
      strengths: ['Good clarity'],
      areasForImprovement: ['Could improve depth']
    }
  }),
  streamMessage: sinon.stub().resolves(true),
  MessageRole: {
    SYSTEM: 'system',
    USER: 'user'
  }
};

// Mock Evaluation model
const MockEvaluation = function(data) {
  return { ...data, id: 'mock-evaluation-id' };
};

// Use proxyquire to load services with mocked dependencies
const evaluationService = proxyquire(
  '../../../../src/core/evaluation/services/evaluationService', 
  {
    '../../../../src/config/container': containerStub,
    '../../../../src/core/infra/api/responsesApiClient': mockResponsesApiClient,
    '../../../../src/core/infra/db/supabaseClient': createSupabaseProxyStub(),
    '../../../../src/core/evaluation/models/Evaluation': MockEvaluation,
    '../../../../src/core/prompt/promptBuilder': mockPromptBuilder
  }
);

const challengeEvaluationService = proxyquire(
  '../../../../src/core/challenge/services/challengeEvaluationService',
  {
    '../../../../src/config/container': containerStub,
    '../../../../src/core/infra/db/supabaseClient': createSupabaseProxyStub(),
    '../../../../src/core/prompt/promptBuilder': mockPromptBuilder
  }
);

const { evaluateResponse } = evaluationService;
const { evaluateResponses } = challengeEvaluationService;

describe('Services System Message Integration', () => {
  
  
  // Set longer timeout for API calls
  this.timeout(30000);

beforeEach(() => {
    // Reset all stubs
    sinon.resetHistory();
  });
  
  afterEach(() => {
    // Clean up sinon stubs
    sinon.restore();
  });
  
  describe('evaluationService', () => {
    it('uses system message from prompt builder', async () => {
      // Set up test data
      const challenge = {
        id: 'test-challenge-id',
        title: 'Test Challenge',
        content: 'Challenge content',
        userId: 'test-user'
      };
      
      const userResponse = 'This is my response';
      
      const user = {
        id: 'test-user',
        email: 'test@example.com',
        skillLevel: 'advanced',
        focusAreas: ['critical_thinking']
      };
      
      const personalityProfile = {
        communicationStyle: 'technical'
      };
      
      // Call the service with personalization data
      const result = await evaluateResponse(challenge, userResponse, {
        threadId: 'test-thread',
        user,
        personalityProfile
      });
      
      // Verify promptBuilder was called
      expect(mockPromptBuilder.buildPrompt.called).to.be.true;
      
      // Verify the promptBuilder was called with the user and personality data
      const promptBuilderCall = mockPromptBuilder.buildPrompt.getCall(0).args[1];
      expect(promptBuilderCall.user).to.equal(user);
      expect(promptBuilderCall.personalityProfile).to.equal(personalityProfile);
      
      // Verify responsesApiClient was called
      expect(mockResponsesApiClient.sendJsonMessage.called).to.be.true;
      const apiCall = mockResponsesApiClient.sendJsonMessage.getCall(0).args[0];
      
      // The system message should contain elements from the user data
      expect(apiCall[0].content).to.include('advanced');
      expect(apiCall[0].content).to.include('technical');
    });
  });
  
  describe('challengeEvaluationService', () => {
    it('uses system message from prompt builder', async () => {
      // Set up test data
      const challenge = {
        id: 'test-challenge-id',
        title: 'Test Challenge',
        content: 'Challenge content',
        userId: 'test-user',
        challengeType: 'analysis'
      };
      
      const responses = ['This is my response'];
      
      // Call the service
      await evaluateResponses(challenge, responses, {
        threadId: 'test-thread'
      });
      
      // Verify promptBuilder was called
      expect(mockPromptBuilder.buildPrompt.called).to.be.true;
      
      // Verify OpenAI client was called with the system message
      expect(mockOpenAIClient.sendJsonMessage.called).to.be.true;
      const apiCall = mockOpenAIClient.sendJsonMessage.getCall(0).args[0];
      expect(apiCall[0].role).to.equal('system');
      
      // The system message should match what was returned by the promptBuilder
      const expectedSystemMessage = mockPromptBuilder.buildPrompt.getCall(0).returnValue.systemMessage;
      expect(apiCall[0].content).to.equal(expectedSystemMessage);
    });
    
    it('includes user metrics in system message when provided', async () => {
      // Set up test data
      const challenge = {
        id: 'test-challenge-id',
        title: 'Test Challenge',
        content: 'Challenge content',
        userId: 'test-user',
        challengeType: 'scenario'
      };
      
      const responses = ['This is my response'];
      
      const user = {
        id: 'test-user',
        skillLevel: 'beginner'
      };
      
      const personalityProfile = {
        communicationStyle: 'casual'
      };
      
      // Call the service with user data
      await evaluateResponses(challenge, responses, {
        threadId: 'test-thread',
        user,
        personalityProfile
      });
      
      // Verify promptBuilder was called
      expect(mockPromptBuilder.buildPrompt.called).to.be.true;
      
      // Verify OpenAI client was called with the system message
      expect(mockOpenAIClient.sendJsonMessage.called).to.be.true;
      const apiCall = mockOpenAIClient.sendJsonMessage.getCall(0).args[0];
      
      // The system message should contain elements from the user data
      expect(apiCall[0].content).to.include('beginner');
      expect(apiCall[0].content).to.include('casual');
    });
  });
}); 