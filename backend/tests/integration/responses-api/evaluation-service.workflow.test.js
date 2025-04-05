import { expect } from "chai";
import sinon from "sinon";
import { v4 as uuidv4 } from "uuid";
import { getTestConfig, hasRequiredVars } from "../../config/testConfig.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
import EvaluationService from "../../../src/core/evaluation/services/evaluationService.js";
describe('Integration: Evaluation Service with Responses API', function () {
    before(function () {
        skipIfMissingEnv(this, 'openai');
    });
    // Set longer timeout for API tests
    this.timeout(10000);
    let sandbox;
    let evaluationService;
    let openAIClient;
    let openAIStateManager;
    let evaluationRepository;
    let challengeRepository;
    // Test data
    const testUserId = 'test-user-id';
    const testChallengeId = uuidv4();
    beforeEach(function () {
        // Skip if no OpenAI API key in test environment
        if (!getTestConfig().openai.apiKey && process.env.NODE_ENV !== 'test') {
            console.warn('⚠️ OpenAI API key not found, skipping Responses API tests');
            this.skip();
        }
        // Set up sandbox for managing stubs
        sandbox = sinon.createSandbox();
        // Set up in-memory repositories
        evaluationRepository = {
            save: sandbox.stub().callsFake(eval => Promise.resolve({ ...eval, id: eval.id || uuidv4() })),
            findById: sandbox.stub(),
            findByChallengeId: sandbox.stub().resolves([]),
            findByUserId: sandbox.stub().resolves([]),
            update: sandbox.stub(),
            delete: sandbox.stub().resolves(true)
        };
        challengeRepository = {
            findById: sandbox.stub().resolves({
                id: testChallengeId,
                title: 'Test Challenge',
                challengeType: 'critical-analysis',
                formatType: 'case-study',
                focusArea: 'AI Literacy',
                difficulty: 'intermediate',
                content: {
                    scenario: 'This is a test scenario about AI literacy',
                    questions: [
                        { id: 'q1', text: 'What are key considerations for AI literacy?' }
                    ]
                },
                evaluationCriteria: ['Technical accuracy', 'Completeness', 'Clarity'],
                userId: testUserId
            })
        };
        // Create mock OpenAI client
        openAIClient = {
            sendMessage: sandbox.stub().resolves({
                responseId: `resp_${uuidv4()}`,
                content: 'Mock response from OpenAI'
            }),
            sendJsonMessage: sandbox.stub().resolves({
                responseId: `resp_${uuidv4()}`,
                data: {
                    overallScore: 8,
                    categoryScores: {
                        understanding: 9,
                        criticalThinking: 8,
                        communication: 7
                    },
                    strengths: [
                        'Comprehensive understanding of AI literacy concepts',
                        'Well-structured response with logical flow'
                    ],
                    areasForImprovement: [
                        'Could provide more specific examples',
                        'Some explanations could be more concise'
                    ],
                    feedback: 'Good job overall with strong technical understanding and clear explanations.',
                    nextSteps: 'Consider exploring more practical applications.'
                }
            }),
            streamMessage: sandbox.stub()
        };
        // Create mock OpenAI state manager
        openAIStateManager = {
            findOrCreateConversationState: sandbox.stub().callsFake((userId, context) => {
                return Promise.resolve({
                    id: uuidv4(),
                    userId,
                    context,
                    lastResponseId: null,
                    createdAt: new Date().toISOString()
                });
            }),
            updateLastResponseId: sandbox.stub().resolves(true),
            getLastResponseId: sandbox.stub().resolves(null),
            deleteConversationState: sandbox.stub().resolves(true)
        };
        // Create a Prompt Builder mock
        const promptBuilderMock = {
            buildPrompt: sandbox.stub().callsFake((promptType, data) => {
                // Return a simple prompt for evaluation
                return {
                    prompt: `Please evaluate the following response for ${data.challenge.title}:\n\n${data.userResponse}`,
                    systemMessage: 'You are an AI evaluation expert.'
                };
            })
        };
        evaluationService = {
            evaluateResponse: async (challenge, userResponse, options = {}) => {
                const threadId = options.threadId || uuidv4();
                // Get or create a conversation state for this evaluation
                const conversationState = await openAIStateManager.findOrCreateConversationState(challenge.userId, `evaluation_${threadId}`, { createdAt: new Date().toISOString() });
                // Create a prompt for evaluation
                const { prompt, systemMessage } = promptBuilderMock.buildPrompt('EVALUATION', {
                    challenge,
                    userResponse
                });
                // Create messages for the OpenAI API
                const messages = [
                    {
                        role: 'system',
                        content: systemMessage
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ];
                // Call the OpenAI API
                const response = await openAIClient.sendJsonMessage(messages, {
                    model: 'gpt-4o',
                    temperature: 0.7
                });
                // Update the conversation state
                await openAIStateManager.updateLastResponseId(conversationState.id, response.responseId);
                // Create an evaluation record
                const evaluation = {
                    id: uuidv4(),
                    challengeId: challenge.id,
                    userId: challenge.userId,
                    score: response.data.overallScore,
                    categoryScores: response.data.categoryScores || {},
                    strengths: response.data.strengths || [],
                    areasForImprovement: response.data.areasForImprovement || [],
                    feedback: response.data.feedback || '',
                    nextSteps: response.data.nextSteps || '',
                    responseId: response.responseId,
                    threadId,
                    submittedAt: new Date().toISOString(),
                    evaluatedAt: new Date().toISOString()
                };
                // Save to repository
                await evaluationRepository.save(evaluation);
                return evaluation;
            }
        };
    });
    afterEach(function () {
        // Restore stubs
        sandbox.restore();
    });
    describe('Challenge Response Evaluation', function () {
        it('should evaluate a response to a challenge using the Responses API', async function () {
            // Get a test challenge
            const challenge = await challengeRepository.findById(testChallengeId);
            // Test user response
            const userResponse = 'AI literacy requires understanding core concepts like machine learning, neural networks, and data processing. It also involves critical thinking about ethical implications and societal impacts. Users should be able to distinguish AI capabilities from limitations, and understand potential biases in AI systems.';
            // Evaluate the response
            const evaluation = await evaluationService.evaluateResponse(challenge, userResponse, {
                threadId: uuidv4()
            });
            // Verify the evaluation
            expect(evaluation).to.exist;
            expect(evaluation.challengeId).to.equal(challenge.id);
            expect(evaluation.userId).to.equal(challenge.userId);
            expect(evaluation.score).to.be.a('number');
            expect(evaluation.strengths).to.be.an('array');
            expect(evaluation.areasForImprovement).to.be.an('array');
            expect(evaluation.responseId).to.match(/^resp_/);
            // Verify that the OpenAI client was called correctly
            expect(openAIClient.sendJsonMessage.calledOnce).to.be.true;
            // Verify that the evaluation was saved
            expect(evaluationRepository.save.calledOnce).to.be.true;
            expect(evaluationRepository.save.firstCall.args[0]).to.deep.include({
                challengeId: challenge.id,
                userId: challenge.userId
            });
            // Verify conversation state management
            expect(openAIStateManager.findOrCreateConversationState.calledOnce).to.be.true;
            expect(openAIStateManager.updateLastResponseId.calledOnce).to.be.true;
        });
        it('should handle challenges with different types and formats', async function () {
            // Create different challenge types
            const challenges = [
                {
                    id: uuidv4(),
                    title: 'Critical Analysis Challenge',
                    challengeType: 'critical-analysis',
                    formatType: 'case-study',
                    focusArea: 'AI Ethics',
                    content: {
                        scenario: 'An AI system is being used for hiring decisions.',
                        questions: [{ id: 'q1', text: 'What ethical considerations apply?' }]
                    },
                    userId: testUserId
                },
                {
                    id: uuidv4(),
                    title: 'Multiple Choice Challenge',
                    challengeType: 'knowledge-assessment',
                    formatType: 'multiple-choice',
                    focusArea: 'AI Technical Concepts',
                    content: {
                        questions: [
                            {
                                id: 'q1',
                                text: 'Which is NOT an example of supervised learning?',
                                options: ['Decision trees', 'Clustering', 'Linear regression']
                            }
                        ]
                    },
                    userId: testUserId
                }
            ];
            // Configure repository mock
            challengeRepository.findById.callsFake(id => {
                const challenge = challenges.find(c => c.id === id);
                return Promise.resolve(challenge || null);
            });
            // Test each challenge type
            for (const challenge of challenges) {
                const userResponse = 'This is a test response to the challenge.';
                // Evaluate the response
                const evaluation = await evaluationService.evaluateResponse(challenge, userResponse, {
                    threadId: uuidv4()
                });
                // Verify the evaluation
                expect(evaluation).to.exist;
                expect(evaluation.challengeId).to.equal(challenge.id);
                expect(evaluation.userId).to.equal(challenge.userId);
                // Check that the challenge type was correctly passed to the prompt builder
                const promptBuilderCalls = promptBuilderMock.buildPrompt.getCalls();
                const matchingCall = promptBuilderCalls.find(call => call.args[1].challenge.id === challenge.id);
                expect(matchingCall).to.exist;
                expect(matchingCall.args[1].challenge.challengeType).to.equal(challenge.challengeType);
                expect(matchingCall.args[1].challenge.formatType).to.equal(challenge.formatType);
            }
        });
    });
    describe('Error Handling', function () {
        it('should handle errors from the OpenAI API', async function () {
            // Get a test challenge
            const challenge = await challengeRepository.findById(testChallengeId);
            // Configure OpenAI client to throw an error
            const apiError = new Error('API rate limit exceeded');
            openAIClient.sendJsonMessage.rejects(apiError);
            try {
                // Attempt to evaluate a response
                await evaluationService.evaluateResponse(challenge, 'Test response', {
                    threadId: uuidv4()
                });
                // Should not reach here
                expect.fail('Expected an error but none was thrown');
            }
            catch (error) {
                // Verify error handling
                expect(error).to.exist;
                expect(error.message).to.include('API rate limit exceeded');
            }
        });
    });
});
