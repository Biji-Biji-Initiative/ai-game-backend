import { expect } from "chai";
import sinon from "sinon";
import ChallengeGenerationService from "../../../../src/core/challenge/services/challengeGenerationService.js";
'use strict';
/**
 * Unit Tests for ChallengeGenerationService
 *
 * These tests verify that the ChallengeGenerationService correctly uses
 * the AIClient and AIStateManager ports for generating challenges.
 */
describe('ChallengeGenerationService', () => {
    let challengeGenerationService;
    let mockAiClient;
    let mockAiStateManager;
    let mockLogger;
    let mockPromptBuilder;
    beforeEach(() => {
        // Create mocks
        mockAiClient = {
            sendJsonMessage: sinon.stub().resolves({
                data: {
                    title: 'Test Challenge',
                    description: 'A test challenge description',
                    instructions: 'Follow these instructions',
                    content: { scenario: 'Test scenario' },
                    evaluationCriteria: { criteria: 'Test criteria' }
                },
                responseId: 'resp_123'
            }),
            streamMessage: sinon.stub().resolves()
        };
        mockAiStateManager = {
            findOrCreateConversationState: sinon.stub().resolves({ id: 'state_123' }),
            getLastResponseId: sinon.stub().resolves('resp_456'),
            updateLastResponseId: sinon.stub().resolves({ id: 'state_123', lastResponseId: 'resp_789' })
        };
        mockLogger = {
            debug: sinon.stub(),
            info: sinon.stub(),
            error: sinon.stub(),
            warn: sinon.stub()
        };
        // Mock the prompt builder module
        mockPromptBuilder = {
            buildPrompt: sinon.stub().resolves({
                prompt: 'This is a test prompt',
                systemMessage: 'This is a system message'
            })
        };
        // Replace the real prompt builder with our mock
        sinon.stub(require, '../../../../src/core/prompt/promptBuilder').returns(mockPromptBuilder);
        // Create service with mocks
        challengeGenerationService = new ChallengeGenerationService({
            aiClient: mockAiClient,
            aiStateManager: mockAiStateManager,
            openAIConfig: { model: 'gpt-4o' },
            logger: mockLogger
        });
    });
    afterEach(() => {
        sinon.restore();
    });
    describe('Constructor', () => {
        it('should throw error if aiClient is not provided', () => {
            expect(() => new ChallengeGenerationService({
                aiStateManager: mockAiStateManager,
                logger: mockLogger
            })).to.throw('aiClient is required');
        });
        it('should throw error if aiStateManager is not provided', () => {
            expect(() => new ChallengeGenerationService({
                aiClient: mockAiClient,
                logger: mockLogger
            })).to.throw('aiStateManager is required');
        });
        it('should not throw if logger is not provided', () => {
            expect(() => new ChallengeGenerationService({
                aiClient: mockAiClient,
                aiStateManager: mockAiStateManager
            })).not.to.throw();
        });
    });
    describe('generateChallenge', () => {
        const testUser = { id: 'user_123', email: 'test@example.com' };
        const testParams = {
            challengeTypeCode: 'logical-reasoning',
            focusArea: 'critical-thinking',
            formatTypeCode: 'multiple-choice',
            difficulty: 'intermediate'
        };
        const testRecentChallenges = [];
        it('should throw error if user is not provided', async () => {
            try {
                await challengeGenerationService.generateChallenge(null, testParams);
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.message).to.include('User data is required');
            }
        });
        it('should throw error if challengeParams is not provided', async () => {
            try {
                await challengeGenerationService.generateChallenge(testUser, null);
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.message).to.include('Challenge parameters are required');
            }
        });
        it('should use the AIStateManager to create a conversation state', async () => {
            await challengeGenerationService.generateChallenge(testUser, testParams, testRecentChallenges, {
                conversationContext: 'test_context'
            });
            expect(mockAiStateManager.findOrCreateConversationState.calledOnce).to.be.true;
            expect(mockAiStateManager.findOrCreateConversationState.firstCall.args[0]).to.equal(testUser.id);
            expect(mockAiStateManager.findOrCreateConversationState.firstCall.args[1]).to.equal('test_context');
        });
        it('should use the AIStateManager to get the last response ID', async () => {
            await challengeGenerationService.generateChallenge(testUser, testParams, testRecentChallenges, {
                conversationContext: 'test_context'
            });
            expect(mockAiStateManager.getLastResponseId.calledOnce).to.be.true;
            expect(mockAiStateManager.getLastResponseId.firstCall.args[0]).to.equal('state_123');
        });
        it('should use the prompt builder to create a challenge prompt', async () => {
            await challengeGenerationService.generateChallenge(testUser, testParams, testRecentChallenges, {
                conversationContext: 'test_context'
            });
            expect(mockPromptBuilder.buildPrompt.calledOnce).to.be.true;
            expect(mockPromptBuilder.buildPrompt.firstCall.args[0]).to.equal('challenge');
        });
        it('should use the AIClient to send the prompt and get a response', async () => {
            await challengeGenerationService.generateChallenge(testUser, testParams, testRecentChallenges, {
                conversationContext: 'test_context'
            });
            expect(mockAiClient.sendJsonMessage.calledOnce).to.be.true;
            // Verify the options object includes expected values
            const options = mockAiClient.sendJsonMessage.firstCall.args[1];
            expect(options).to.have.property('model', 'gpt-4o');
            expect(options).to.have.property('responseFormat', 'json');
            expect(options).to.have.property('previousResponseId', 'resp_456');
        });
        it('should update the last response ID after generation', async () => {
            await challengeGenerationService.generateChallenge(testUser, testParams, testRecentChallenges, {
                conversationContext: 'test_context'
            });
            expect(mockAiStateManager.updateLastResponseId.calledOnce).to.be.true;
            expect(mockAiStateManager.updateLastResponseId.firstCall.args[0]).to.equal('state_123');
            expect(mockAiStateManager.updateLastResponseId.firstCall.args[1]).to.equal('resp_123');
        });
        it('should return the challenge data with responseId', async () => {
            const result = await challengeGenerationService.generateChallenge(testUser, testParams, testRecentChallenges, {
                conversationContext: 'test_context'
            });
            expect(result).to.have.property('title', 'Test Challenge');
            expect(result).to.have.property('description', 'A test challenge description');
            expect(result).to.have.property('instructions', 'Follow these instructions');
            expect(result).to.have.property('content').that.deep.equals({ scenario: 'Test scenario' });
            expect(result).to.have.property('evaluationCriteria').that.deep.equals({ criteria: 'Test criteria' });
            expect(result).to.have.property('responseId', 'resp_123');
        });
        it('should throw error if AI service returns invalid data', async () => {
            // Make the AIClient return invalid data
            mockAiClient.sendJsonMessage.resolves({ data: { invalidStructure: true } });
            try {
                await challengeGenerationService.generateChallenge(testUser, testParams, testRecentChallenges, {
                    conversationContext: 'test_context'
                });
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.message).to.include('Invalid challenge response format');
            }
        });
    });
});
