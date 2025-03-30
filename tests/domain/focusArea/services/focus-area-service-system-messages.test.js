import { expect } from "chai";
import { FocusAreaGenerationService } from "../../../src/../../../src/core/focusArea/services/focusAreaGenerationService.js";
import sinon from "sinon";

import FocusAreaId from "../../../src/core/common/valueObjects/FocusAreaId.js";

/**
 * Focus Area Generation Service System Message Tests
 *
 * Tests that the focus area service properly uses dynamic system messages from prompt builders.
 * These tests ensure the feedback loop between user metrics and AI persona is active.
 */
// Create the mock for prompt builder
const mockPromptBuilder = {
    buildPrompt: sinon.stub().callsFake((type, params) => {
        // Return a mock prompt and system message
        return {
            prompt: 'Mock focus area generation prompt',
            systemMessage: `Custom system message for ${params.user?.skillLevel || 'standard'} level user with ${params.personalityProfile?.communicationStyle || 'default'} communication style focused on ${params.options?.focusArea || 'general'}`
        };
    })
};
// Use proxyquire to load the service with mocked dependencies
const focusAreaGenerationService = new FocusAreaGenerationService({
      promptBuilder: mockPromptBuilder
    });

// Helper for creating FocusAreaId value objects
const createFocusAreaId = (id) => new FocusAreaId(id);

describe('FocusAreaGenerationService System Message Integration', () => {
    // Set longer timeout for API calls
    this.timeout(30000);
    let focusAreaGenerationService;
    let mockOpenAIClient;
    beforeEach(() => {
        // Reset all stubs
        sinon.resetHistory();
        // Create a mock OpenAI client
        mockOpenAIClient = {
            sendJsonMessage: sinon.stub().resolves({
                responseId: 'mock-response-id',
                data: [
                    {
                        title: 'Mock Focus Area',
                        description: 'This is a mock focus area for testing',
                        difficulty: 'intermediate',
                        relevance: 'high',
                        metadata: {
                            responseId: 'mock-response-id'
                        }
                    }
                ]
            }),
            streamMessage: sinon.stub().resolves(true),
            MessageRole: {
                SYSTEM: 'system',
                USER: 'user'
            }
        };
        // Create mock repositories
        const mockFocusAreaRepository = {
            findByUserId: sinon.stub().resolves([]),
            save: sinon.stub().resolves(true)
        };
        const mockUserRepository = {
            findById: sinon.stub().resolves({
                id: 'test-user',
                email: 'test@example.com',
                skillLevel: 'intermediate'
            })
        };
        // Create an instance of the service with our mocks
        focusAreaGenerationService = new FocusAreaGenerationService({
            openAIClient: mockOpenAIClient,
            focusAreaRepository: mockFocusAreaRepository,
            userRepository: mockUserRepository,
            promptBuilder: mockPromptBuilder
        });
    });
    afterEach(() => {
        sinon.restore();
    });
    it('uses dynamic system message from prompt builder', async () => {
        // Test data
        const userId = 'test-user';
        const threadId = 'test-thread';
        const previousResponseId = 'previous-response-id';
        const personalityProfile = {
            communicationStyle: 'casual',
            traits: ['detail_oriented', 'progressive_learner']
        };
        const user = {
            id: 'test-user',
            email: 'test@example.com',
            skillLevel: 'intermediate',
            focusAreas: ['critical_thinking'],
            learningStyle: 'visual'
        };
        // Call the service
        await focusAreaGenerationService.generateFocusAreas(userId, threadId, previousResponseId, {
            personalityProfile,
            user
        });
        // Verify promptBuilder was called with user data and personality profile
        expect(mockPromptBuilder.buildPrompt.called).to.be.true;
        const builderCall = mockPromptBuilder.buildPrompt.getCall(0).args;
        expect(builderCall[0]).to.equal('focus-area'); // Check prompt type
        expect(builderCall[1].user).to.equal(user);
        expect(builderCall[1].personalityProfile).to.equal(personalityProfile);
        // Verify the client was called with the system message
        expect(mockOpenAIClient.sendJsonMessage.called).to.be.true;
        const apiCall = mockOpenAIClient.sendJsonMessage.getCall(0).args;
        // First message should be the system message
        expect(apiCall[0][0].role).to.equal('system');
        expect(apiCall[0][0].content).to.include('intermediate');
        expect(apiCall[0][0].content).to.include('casual');
        // Second message should contain the prompt
        expect(apiCall[0][1].role).to.equal('user');
        expect(apiCall[0][1].content).to.equal('Mock focus area generation prompt');
    });
    it('handles different user skill levels with appropriate system messages', async () => {
        // First test with a beginner user
        const beginnerUser = {
            id: 'beginner-user',
            email: 'beginner@example.com',
            skillLevel: 'beginner',
            focusAreas: []
        };
        await focusAreaGenerationService.generateFocusAreas('beginner-user', 'test-thread', null, { user: beginnerUser });
        // Verify beginner user was passed to prompt builder
        expect(mockPromptBuilder.buildPrompt.getCall(0).args[1].user.skillLevel).to.equal('beginner');
        // Reset stubs
        sinon.resetHistory();
        // Then test with an advanced user
        const advancedUser = {
            id: 'advanced-user',
            email: 'advanced@example.com',
            skillLevel: 'expert',
            focusAreas: ['ai_ethics', 'prompt_engineering']
        };
        await focusAreaGenerationService.generateFocusAreas('advanced-user', 'test-thread', null, { user: advancedUser });
        // Verify advanced user was passed to prompt builder
        expect(mockPromptBuilder.buildPrompt.getCall(0).args[1].user.skillLevel).to.equal('expert');
        // Verify different system messages were generated
        expect(mockOpenAIClient.sendJsonMessage.getCall(0).args[0][0].content).to.include('expert');
    });
});
