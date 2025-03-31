import { expect } from "chai";
import sinon from "sinon";
import ChallengeEvaluationService from "@/core/challenge/services/challengeEvaluationService.js";
import { MissingParameterError } from "@/core/infra/errors/MissingParameterError.js";
'use strict';
/**
 * Unit Tests for ChallengeEvaluationService
 *
 * These tests verify that the ChallengeEvaluationService correctly uses
 * the AIClient and AIStateManager ports for evaluating challenge responses.
 */
describe('ChallengeEvaluationService', () => {
    let challengeEvaluationService;
    let mockAiClient;
    let mockAiStateManager;
    let mockLogger;
    let mockPromptBuilder;
    beforeEach(() => {
        // Create mocks
        mockAiClient = {
            sendJsonMessage: sinon.stub().resolves({
                data: {
                    overallScore: 85,
                    feedback: 'Good job!',
                    strengths: ['Clear reasoning', 'Well structured'],
                    improvements: ['Could provide more examples'],
                    categoryScores: { clarity: 90, depth: 80 }
                },
                responseId: 'resp_eval_123'
            }),
            streamMessage: sinon.stub().resolves()
        };
        mockAiStateManager = {
            findOrCreateConversationState: sinon.stub().resolves({ id: 'state_eval_123' }),
            getLastResponseId: sinon.stub().resolves('resp_prev_456'),
            updateLastResponseId: sinon.stub().resolves({ id: 'state_eval_123', lastResponseId: 'resp_eval_123' })
        };
        mockLogger = {
            debug: sinon.stub(),
            info: sinon.stub(),
            error: sinon.stub(),
            warn: sinon.stub()
        };
        // Mock the prompt builder module
        const PROMPT_TYPES = { EVALUATION: 'evaluation' };
        sinon.stub(require, '../../../../src/core/prompt/promptTypes').value({ PROMPT_TYPES });
        mockPromptBuilder = {
            buildPrompt: sinon.stub().resolves({
                prompt: 'This is an evaluation prompt',
                systemMessage: 'This is an evaluation system message'
            })
        };
        // Replace the real prompt builder with our mock
        sinon.stub(require, '../../../../src/core/prompt/promptBuilder').returns(mockPromptBuilder);
        // Create service with mocks
        challengeEvaluationService = new ChallengeEvaluationService({
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
            expect(() => new ChallengeEvaluationService({
                aiStateManager: mockAiStateManager,
                logger: mockLogger
            })).to.throw(MissingParameterError);
        });
        it('should throw error if aiStateManager is not provided', () => {
            expect(() => new ChallengeEvaluationService({
                aiClient: mockAiClient,
                logger: mockLogger
            })).to.throw(MissingParameterError);
        });
        it('should not throw if logger is not provided', () => {
            expect(() => new ChallengeEvaluationService({
                aiClient: mockAiClient,
                aiStateManager: mockAiStateManager
            })).not.to.throw();
        });
    });
    describe('evaluateResponses', () => {
        const testChallenge = {
            id: 'challenge_123',
            userId: 'user_123',
            title: 'Test Challenge',
            challengeType: 'logical-reasoning',
            formatType: 'text-response',
            typeMetadata: { name: 'Logical Reasoning' },
            formatMetadata: { name: 'Text Response' }
        };
        const testResponses = [
            { response: 'This is my response to the challenge.' }
        ];
        it('should throw error if challenge is not provided', async () => {
            try {
                await challengeEvaluationService.evaluateResponses(null, testResponses);
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.message).to.include('Challenge is required');
            }
        });
        it('should throw error if responses are not provided', async () => {
            try {
                await challengeEvaluationService.evaluateResponses(testChallenge, []);
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.message).to.include('Responses are required');
            }
        });
        it('should throw error if thread ID or state ID is not provided', async () => {
            try {
                await challengeEvaluationService.evaluateResponses(testChallenge, testResponses, {});
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.message).to.include('Thread ID or State ID is required');
            }
        });
        it('should use the AIStateManager to create a conversation state', async () => {
            await challengeEvaluationService.evaluateResponses(testChallenge, testResponses, {
                conversationContext: 'eval_context'
            });
            expect(mockAiStateManager.findOrCreateConversationState.calledOnce).to.be.true;
            expect(mockAiStateManager.findOrCreateConversationState.firstCall.args[0]).to.equal(testChallenge.userId);
            expect(mockAiStateManager.findOrCreateConversationState.firstCall.args[1]).to.include('evaluation_');
        });
        it('should use the AIStateManager to get the last response ID', async () => {
            await challengeEvaluationService.evaluateResponses(testChallenge, testResponses, {
                threadId: 'thread_123'
            });
            expect(mockAiStateManager.getLastResponseId.calledOnce).to.be.true;
            expect(mockAiStateManager.getLastResponseId.firstCall.args[0]).to.equal('state_eval_123');
        });
        it('should use the prompt builder to create an evaluation prompt', async () => {
            await challengeEvaluationService.evaluateResponses(testChallenge, testResponses, {
                threadId: 'thread_123'
            });
            expect(mockPromptBuilder.buildPrompt.calledOnce).to.be.true;
            expect(mockPromptBuilder.buildPrompt.firstCall.args[1]).to.have.property('challenge', testChallenge);
            expect(mockPromptBuilder.buildPrompt.firstCall.args[1]).to.have.property('userResponse', testResponses);
        });
        it('should use the AIClient to send the prompt and get a response', async () => {
            await challengeEvaluationService.evaluateResponses(testChallenge, testResponses, {
                threadId: 'thread_123'
            });
            expect(mockAiClient.sendJsonMessage.calledOnce).to.be.true;
            // Verify the options object includes expected values
            const options = mockAiClient.sendJsonMessage.firstCall.args[1];
            expect(options).to.have.property('model', 'gpt-4o');
            expect(options).to.have.property('temperature', 0.7);
            expect(options).to.have.property('responseFormat', 'json');
            expect(options).to.have.property('previousResponseId', 'resp_prev_456');
        });
        it('should update the last response ID after evaluation', async () => {
            await challengeEvaluationService.evaluateResponses(testChallenge, testResponses, {
                threadId: 'thread_123'
            });
            expect(mockAiStateManager.updateLastResponseId.calledOnce).to.be.true;
            expect(mockAiStateManager.updateLastResponseId.firstCall.args[0]).to.equal('state_eval_123');
            expect(mockAiStateManager.updateLastResponseId.firstCall.args[1]).to.equal('resp_eval_123');
        });
        it('should return the evaluation results with additional metadata', async () => {
            const result = await challengeEvaluationService.evaluateResponses(testChallenge, testResponses, {
                threadId: 'thread_123'
            });
            expect(result).to.have.property('overallScore', 85);
            expect(result).to.have.property('feedback', 'Good job!');
            expect(result).to.have.property('strengths').that.deep.equals(['Clear reasoning', 'Well structured']);
            expect(result).to.have.property('improvements').that.deep.equals(['Could provide more examples']);
            expect(result).to.have.property('categoryScores').that.deep.equals({ clarity: 90, depth: 80 });
            expect(result).to.have.property('responseId', 'resp_eval_123');
            expect(result).to.have.property('evaluatedAt').that.is.a('string');
            expect(result).to.have.property('evaluationThreadId', 'thread_123');
            expect(result).to.have.property('challengeTypeName', 'Logical Reasoning');
            expect(result).to.have.property('formatTypeName', 'Text Response');
        });
    });
    describe('streamEvaluation', () => {
        const testChallenge = {
            id: 'challenge_123',
            userId: 'user_123',
            title: 'Test Challenge',
            challengeType: 'logical-reasoning',
            formatType: 'text-response',
            typeMetadata: { name: 'Logical Reasoning' },
            formatMetadata: { name: 'Text Response' }
        };
        const testResponses = [
            { response: 'This is my response to the challenge.' }
        ];
        const testCallbacks = {
            onChunk: sinon.stub(),
            onComplete: sinon.stub(),
            onError: sinon.stub()
        };
        it('should throw error if challenge is not provided', async () => {
            try {
                await challengeEvaluationService.streamEvaluation(null, testResponses, testCallbacks);
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.message).to.include('Challenge is required');
            }
        });
        it('should throw error if responses are not provided', async () => {
            try {
                await challengeEvaluationService.streamEvaluation(testChallenge, [], testCallbacks);
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.message).to.include('Responses are required');
            }
        });
        it('should throw error if onChunk callback is not provided', async () => {
            try {
                await challengeEvaluationService.streamEvaluation(testChallenge, testResponses, {});
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.message).to.include('onChunk callback is required');
            }
        });
        it('should throw error if thread ID or state ID is not provided', async () => {
            try {
                await challengeEvaluationService.streamEvaluation(testChallenge, testResponses, testCallbacks, {});
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.message).to.include('Thread ID or State ID is required');
            }
        });
        it('should use the AIStateManager to create a conversation state for streaming', async () => {
            await challengeEvaluationService.streamEvaluation(testChallenge, testResponses, testCallbacks, {
                threadId: 'thread_123'
            });
            expect(mockAiStateManager.findOrCreateConversationState.calledOnce).to.be.true;
            expect(mockAiStateManager.findOrCreateConversationState.firstCall.args[0]).to.equal(testChallenge.userId);
            expect(mockAiStateManager.findOrCreateConversationState.firstCall.args[1]).to.include('evaluation_stream_');
        });
        it('should use the AIClient to stream the evaluation', async () => {
            await challengeEvaluationService.streamEvaluation(testChallenge, testResponses, testCallbacks, {
                threadId: 'thread_123'
            });
            expect(mockAiClient.streamMessage.calledOnce).to.be.true;
            // Verify the options object includes expected values
            const options = mockAiClient.streamMessage.firstCall.args[1];
            expect(options).to.have.property('model', 'gpt-4o');
            expect(options).to.have.property('temperature', 0.7);
            expect(options).to.have.property('previousResponseId', 'resp_prev_456');
            expect(options).to.have.property('onEvent').that.is.a('function');
        });
        it('should update the last response ID if responseId is available in stream options', async () => {
            // Set a responseId in the streamOptions
            mockAiClient.streamMessage.callsFake((messages, options) => {
                options.responseId = 'resp_stream_789';
                return Promise.resolve();
            });
            await challengeEvaluationService.streamEvaluation(testChallenge, testResponses, testCallbacks, {
                threadId: 'thread_123'
            });
            expect(mockAiStateManager.updateLastResponseId.calledOnce).to.be.true;
            expect(mockAiStateManager.updateLastResponseId.firstCall.args[0]).to.equal('state_eval_123');
            expect(mockAiStateManager.updateLastResponseId.firstCall.args[1]).to.equal('resp_stream_789');
        });
    });
});
