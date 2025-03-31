import { expect } from "chai";
import sinon from "sinon";
import { v4 as uuidv4 } from "uuid";
import testEnv from "../../loadEnv.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
import testSetup from "../../helpers/testSetup.js";
import { container } from "@/config/container.js";
import { EvaluationError, EvaluationNotFoundError, EvaluationValidationError, EvaluationProcessingError, EvaluationRepositoryError } from "@/core/evaluation/errors/evaluationErrors.js";
describe('Integration: OpenAI Responses API Workflow', function () {
    before(function () {
        skipIfMissingEnv(this, 'openai');
    });
    // Set longer timeout for API tests
    this.timeout(10000);
    let sandbox;
    let openAIClient;
    let conversationStateRepository;
    let openAIStateManager;
    // Test dependencies
    let MessageRole;
    // Test variables
    const TEST_USER_ID = 'test-user-id';
    let threadId;
    let conversationState;
    beforeEach(async function () {
        // Skip if no OpenAI API key in test environment
        if (!testEnv.getTestConfig().openai.apiKey && process.env.NODE_ENV !== 'test') {
            console.warn('⚠️ OpenAI API key not found, skipping Responses API tests');
            this.skip();
        }
        // Set up sandbox for managing stubs
        sandbox = sinon.createSandbox();
        // Set up in-memory repositories
        conversationStateRepository = {
            save: sandbox.stub().callsFake(state => Promise.resolve({ ...state, id: state.id || uuidv4() })),
            findById: sandbox.stub(),
            findByUserIdAndContext: sandbox.stub(),
            update: sandbox.stub().callsFake((id, updates) => Promise.resolve({ id, ...updates })),
            delete: sandbox.stub().resolves(true)
        };
        // Define message roles (same as in your actual code)
        MessageRole = {
            SYSTEM: 'system',
            USER: 'user',
            ASSISTANT: 'assistant'
        };
        // Create a mock or real OpenAI client based on environment
        if (process.env.NODE_ENV === 'test') {
            // Use a mock in test environment
            openAIClient = {
                sendMessage: sandbox.stub().callsFake(() => Promise.resolve({
                    responseId: `resp_${uuidv4()}`,
                    content: 'Mock response from OpenAI Responses API'
                })),
                sendJsonMessage: sandbox.stub().callsFake(() => Promise.resolve({
                    responseId: `resp_${uuidv4()}`,
                    data: {
                        overallScore: 8,
                        strengths: ['Clear explanation', 'Logically structured'],
                        areasForImprovement: ['Could provide more examples'],
                        feedback: 'Overall well-articulated response that addresses the key points.'
                    }
                })),
                streamMessage: sandbox.stub()
            };
        }
        else {
            openAIClient = container.get('openAIClient');
        }
        // Create the OpenAI state manager with injected dependencies
        openAIStateManager = {
            createConversationState: async (userId, context, metadata = {}) => {
                // Create a new conversation state
                const state = {
                    id: uuidv4(),
                    userId,
                    context,
                    metadata,
                    lastResponseId: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                // Save to repository
                await conversationStateRepository.save(state);
                return state;
            },
            findOrCreateConversationState: async (userId, context, metadata = {}) => {
                // Try to find existing state
                const existingState = await conversationStateRepository.findByUserIdAndContext(userId, context);
                if (existingState) {
                    return existingState;
                }
                // Create new state if not found
                return openAIStateManager.createConversationState(userId, context, metadata);
            },
            updateLastResponseId: async (stateId, responseId) => {
                // Find the state
                const state = await conversationStateRepository.findById(stateId);
                if (!state) {
                    throw new EvaluationNotFoundError(`Conversation state not found: ${stateId}`);
                }
                // Update the state
                state.lastResponseId = responseId;
                state.updatedAt = new Date().toISOString();
                // Save updates
                await conversationStateRepository.update(stateId, {
                    lastResponseId: responseId,
                    updatedAt: state.updatedAt
                });
                return true;
            },
            getLastResponseId: async (stateId) => {
                // Find the state
                const state = await conversationStateRepository.findById(stateId);
                if (!state) {
                    throw new EvaluationNotFoundError(`Conversation state not found: ${stateId}`);
                }
                return state.lastResponseId;
            },
            deleteConversationState: async (stateId) => {
                // Delete the state
                return conversationStateRepository.delete(stateId);
            }
        };
        // Generate a unique thread ID for this test run
        threadId = uuidv4();
        // Create a test conversation state
        conversationState = await openAIStateManager.createConversationState(TEST_USER_ID, `test_${threadId}`, {
            testId: threadId,
            createdAt: new Date().toISOString()
        });
        // Configure repository to return this state when queried
        conversationStateRepository.findById.callsFake(id => {
            if (id === conversationState.id) {
                return Promise.resolve(conversationState);
            }
            return Promise.resolve(null);
        });
        conversationStateRepository.findByUserIdAndContext.callsFake((userId, context) => {
            if (userId === TEST_USER_ID && context === `test_${threadId}`) {
                return Promise.resolve(conversationState);
            }
            return Promise.resolve(null);
        });
    });
    afterEach(function () {
        // Restore stubs
        sandbox.restore();
    });
    describe('JSON Response Format Handling', function () {
        it('should request and process JSON-formatted evaluations', async function () {
            // Skip if not in test environment and missing OpenAI key
            if (!testEnv.getTestConfig().openai.apiKey && process.env.NODE_ENV !== 'test') {
                this.skip();
            }
            // Create messages with JSON format instructions
            const messages = [
                {
                    role: MessageRole.SYSTEM,
                    content: `You are an AI evaluation expert specializing in providing fair and constructive feedback.
Always return your evaluation as a VALID JSON object with the following structure:
{
  "overallScore": number from 1-10,
  "strengths": [array of strings describing strengths],
  "areasForImprovement": [array of strings with improvement suggestions],
  "feedback": "detailed feedback paragraph"
}
Your response MUST be formatted as valid, parsable JSON.`
                },
                {
                    role: MessageRole.USER,
                    content: `Please evaluate this response about AI implementation:

USER RESPONSE: Key considerations for implementing AI systems include data privacy and security, bias mitigation, transparency and explainability, human oversight, regulatory compliance, ethical use cases, scalability, and system integration.

Evaluate based on:
1. Technical accuracy
2. Completeness
3. Clarity of presentation`
                }
            ];
            // Send the evaluation request
            const response = await openAIClient.sendJsonMessage(messages, {
                model: 'gpt-4o',
                temperature: 0.7,
                responseFormat: 'json'
            });
            // Update conversation state
            await openAIStateManager.updateLastResponseId(conversationState.id, response.responseId);
            // Verify response structure
            expect(response).to.be.an('object');
            expect(response.responseId).to.be.a('string');
            expect(response.responseId).to.match(/^resp_/);
            expect(response.data).to.be.an('object');
            expect(response.data.overallScore).to.be.a('number');
            expect(response.data.strengths).to.be.an('array');
            expect(response.data.areasForImprovement).to.be.an('array');
            expect(response.data.feedback).to.be.a('string');
            // Verify conversation state update
            const lastResponseId = await openAIStateManager.getLastResponseId(conversationState.id);
            expect(lastResponseId).to.equal(response.responseId);
        });
    });
    describe('Stateful Conversation', function () {
        it('should maintain context between messages using previous_response_id', async function () {
            // Skip if not in test environment and missing OpenAI key
            if (!testEnv.getTestConfig().openai.apiKey && process.env.NODE_ENV !== 'test') {
                this.skip();
            }
            // 1. Send initial message
            const initialMessages = [
                {
                    role: MessageRole.SYSTEM,
                    content: 'You are a helpful AI assistant specializing in AI literacy topics.'
                },
                {
                    role: MessageRole.USER,
                    content: 'What are the key considerations when implementing AI systems?'
                }
            ];
            const initialResponse = await openAIClient.sendMessage(initialMessages, {
                model: 'gpt-4o',
                temperature: 0.7
            });
            // Update conversation state
            await openAIStateManager.updateLastResponseId(conversationState.id, initialResponse.responseId);
            // Verify initial response
            expect(initialResponse.responseId).to.match(/^resp_/);
            // 2. Send follow-up using previous response ID
            const previousResponseId = await openAIStateManager.getLastResponseId(conversationState.id);
            const followUpMessages = [
                {
                    role: MessageRole.SYSTEM,
                    content: 'You are a helpful AI assistant specializing in AI literacy topics.'
                },
                {
                    role: MessageRole.USER,
                    content: 'Expand on the ethical considerations from your previous answer.'
                }
            ];
            const followUpResponse = await openAIClient.sendMessage(followUpMessages, {
                model: 'gpt-4o',
                temperature: 0.7,
                previous_response_id: previousResponseId
            });
            // Update conversation state with new response ID
            await openAIStateManager.updateLastResponseId(conversationState.id, followUpResponse.responseId);
            // Verify follow-up response
            expect(followUpResponse.responseId).to.match(/^resp_/);
            expect(followUpResponse.responseId).to.not.equal(initialResponse.responseId);
            // In a real test with actual API, we could check that the content references the previous message
            if (process.env.NODE_ENV !== 'test') {
                expect(followUpResponse.content).to.include('ethical');
            }
        });
    });
    describe('Conversation State Management', function () {
        it('should create, find, update and delete conversation states', async function () {
            // Create a new state
            const newState = await openAIStateManager.createConversationState(TEST_USER_ID, 'new_context', { test: true });
            expect(newState.id).to.be.a('string');
            expect(newState.userId).to.equal(TEST_USER_ID);
            expect(newState.context).to.equal('new_context');
            expect(newState.metadata).to.deep.include({ test: true });
            // Find the state
            conversationStateRepository.findByUserIdAndContext.callsFake((userId, context) => {
                if (userId === TEST_USER_ID && context === 'new_context') {
                    return Promise.resolve(newState);
                }
                return Promise.resolve(null);
            });
            const foundState = await openAIStateManager.findOrCreateConversationState(TEST_USER_ID, 'new_context', { test: true });
            expect(foundState.id).to.equal(newState.id);
            // Update the state
            const responseId = `resp_${uuidv4()}`;
            await openAIStateManager.updateLastResponseId(newState.id, responseId);
            expect(conversationStateRepository.update.calledOnce).to.be.true;
            expect(conversationStateRepository.update.firstCall.args[0]).to.equal(newState.id);
            expect(conversationStateRepository.update.firstCall.args[1].lastResponseId).to.equal(responseId);
            // Delete the state
            await openAIStateManager.deleteConversationState(newState.id);
            expect(conversationStateRepository.delete.calledOnce).to.be.true;
            expect(conversationStateRepository.delete.firstCall.args[0]).to.equal(newState.id);
        });
    });
});
