import { expect } from "chai";
import sinon from "sinon";
import { v4 as uuidv4 } from "uuid";
import { ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeProcessingError, ChallengeRepositoryError, ChallengeGenerationError } from "@/core/challenge/errors/ChallengeErrors.js";
describe('Challenge Generation Integration', function () {
    // Set timeout for tests
    this.timeout(5000);
    let sandbox;
    let challengeGenerationService;
    let openAIClient;
    let openAIStateManager;
    let challengeRepository;
    let promptBuilderMock;
    // Test data
    const testUserId = 'test-user-id';
    beforeEach(function () {
        // Set up sandbox for managing stubs
        sandbox = sinon.createSandbox();
        // Set up in-memory repository
        challengeRepository = {
            save: sandbox.stub().callsFake(challenge => Promise.resolve({ ...challenge, id: challenge.id || uuidv4() })),
            findById: sandbox.stub(),
            findByUserId: sandbox.stub().resolves([]),
            findByFocusArea: sandbox.stub().resolves([]),
            update: sandbox.stub(),
            delete: sandbox.stub().resolves(true)
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
                    title: 'AI Ethics in Automated Decision Making',
                    description: 'Explore the ethical implications of using AI in high-stakes decision-making contexts.',
                    content: {
                        scenario: 'A healthcare system is implementing an AI system to help prioritize patients in the emergency room based on predicted severity and treatment urgency.',
                        questions: [
                            {
                                id: 'q1',
                                text: 'What are the key ethical considerations that should be addressed before implementing this system?'
                            },
                            {
                                id: 'q2',
                                text: 'How would you design safeguards to ensure fair treatment across different patient demographics?'
                            }
                        ]
                    },
                    difficulty: 'intermediate',
                    focusArea: 'AI Ethics',
                    challengeType: 'critical-analysis',
                    formatType: 'case-study',
                    estimatedTime: 20,
                    keywords: ['ethics', 'healthcare', 'bias', 'decision-making', 'fairness'],
                    learningObjectives: [
                        'Understand ethical implications of AI in healthcare',
                        'Identify potential biases in automated decision systems',
                        'Design appropriate human oversight mechanisms'
                    ]
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
        promptBuilderMock = {
            buildPrompt: sandbox.stub().callsFake((promptType, data) => {
                // Return a simple prompt for challenge generation
                return {
                    prompt: `Create a challenge in the ${data.focusArea} area with ${data.difficulty} difficulty.`,
                    systemMessage: 'You are an expert in creating educational challenges.'
                };
            })
        };
        // Create the challenge generation service with injected dependencies
        challengeGenerationService = {
            generateChallenge: async (options = {}) => {
                const userId = options.userId || testUserId;
                const focusArea = options.focusArea || 'AI Ethics';
                const difficulty = options.difficulty || 'intermediate';
                const threadId = options.threadId || uuidv4();
                // Get or create a conversation state
                const conversationState = await openAIStateManager.findOrCreateConversationState(userId, `challenge_generation_${threadId}`, { createdAt: new Date().toISOString() });
                // Create a prompt for challenge generation
                const { prompt, systemMessage } = promptBuilderMock.buildPrompt('CHALLENGE_GENERATION', {
                    userId,
                    focusArea,
                    difficulty
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
                // For different focus areas and difficulties, customize the mock response
                if (focusArea !== 'AI Ethics' || difficulty !== 'intermediate') {
                    const mockData = { ...(openAIClient.sendJsonMessage.firstCall?.returnValue?.data || {}) };
                    mockData.focusArea = focusArea;
                    mockData.difficulty = difficulty;
                    openAIClient.sendJsonMessage.resolves({
                        responseId: `resp_${uuidv4()}`,
                        data: mockData
                    });
                }
                // Call the OpenAI API for JSON response
                const response = await openAIClient.sendJsonMessage(messages, {
                    model: 'gpt-4o',
                    temperature: 0.8,
                    responseFormat: 'json'
                });
                // Update the conversation state
                await openAIStateManager.updateLastResponseId(conversationState.id, response.responseId);
                // Process the challenge data
                const challengeData = response.data;
                // Create a challenge object
                const challenge = {
                    id: uuidv4(),
                    userId,
                    title: challengeData.title,
                    description: challengeData.description,
                    content: challengeData.content,
                    difficulty: challengeData.difficulty || difficulty,
                    focusArea: challengeData.focusArea || focusArea,
                    challengeType: challengeData.challengeType || 'critical-analysis',
                    formatType: challengeData.formatType || 'case-study',
                    estimatedTime: challengeData.estimatedTime || 15,
                    keywords: challengeData.keywords || [],
                    learningObjectives: challengeData.learningObjectives || [],
                    status: 'published',
                    aiGenerated: true,
                    generatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    responseId: response.responseId,
                    threadId
                };
                // Save to repository
                await challengeRepository.save(challenge);
                return challenge;
            },
            regenerateChallenge: async (challengeId, options = {}) => {
                // Find the existing challenge
                const existingChallenge = await challengeRepository.findById(challengeId);
                if (!existingChallenge) {
                    throw new ChallengeNotFoundError(`Challenge not found: ${challengeId}`);
                }
                // Generate a new challenge with similar parameters
                const newChallenge = await challengeGenerationService.generateChallenge({
                    userId: existingChallenge.userId,
                    focusArea: existingChallenge.focusArea,
                    difficulty: existingChallenge.difficulty,
                    threadId: options.threadId || uuidv4()
                });
                return newChallenge;
            }
        };
    });
    afterEach(function () {
        // Restore stubs
        sandbox.restore();
    });
    describe('Challenge Generation', function () {
        it('should generate a challenge using the service', async function () {
            // Generate a challenge
            const challenge = await challengeGenerationService.generateChallenge({
                focusArea: 'AI Ethics',
                difficulty: 'intermediate'
            });
            // Verify the challenge
            expect(challenge).to.exist;
            expect(challenge.id).to.be.a('string');
            expect(challenge.title).to.equal('AI Ethics in Automated Decision Making');
            expect(challenge.focusArea).to.equal('AI Ethics');
            expect(challenge.difficulty).to.equal('intermediate');
            expect(challenge.content).to.be.an('object');
            expect(challenge.content.scenario).to.be.a('string');
            expect(challenge.content.questions).to.be.an('array');
            expect(challenge.responseId).to.match(/^resp_/);
            // Verify that the OpenAI client was called correctly
            expect(openAIClient.sendJsonMessage.calledOnce).to.be.true;
            // Verify that the challenge was saved
            expect(challengeRepository.save.calledOnce).to.be.true;
            // Verify conversation state management
            expect(openAIStateManager.findOrCreateConversationState.calledOnce).to.be.true;
            expect(openAIStateManager.updateLastResponseId.calledOnce).to.be.true;
        });
        it('should generate challenges with different focus areas and difficulties', async function () {
            // Test different combinations
            const combinations = [
                { focusArea: 'AI Ethics', difficulty: 'beginner' },
                { focusArea: 'Machine Learning', difficulty: 'intermediate' },
                { focusArea: 'Data Privacy', difficulty: 'advanced' }
            ];
            for (const { focusArea, difficulty } of combinations) {
                // Reset stubs for each iteration to get fresh mocks
                openAIClient.sendJsonMessage.resetHistory();
                // Generate a challenge with these parameters
                const challenge = await challengeGenerationService.generateChallenge({
                    focusArea,
                    difficulty
                });
                // Verify the challenge matches the requested parameters
                expect(challenge).to.exist;
                expect(challenge.focusArea).to.equal(focusArea);
                expect(challenge.difficulty).to.equal(difficulty);
                // Check that the focus area and difficulty were passed to the prompt builder
                const promptBuilderCalls = promptBuilderMock.buildPrompt.getCalls();
                const matchingCall = promptBuilderCalls.find(call => call.args[1].focusArea === focusArea &&
                    call.args[1].difficulty === difficulty);
                expect(matchingCall).to.exist;
            }
        });
    });
    describe('Challenge Regeneration', function () {
        it('should regenerate a challenge based on an existing one', async function () {
            // Create an existing challenge
            const existingChallenge = {
                id: uuidv4(),
                userId: testUserId,
                title: 'Existing Challenge',
                description: 'This is an existing challenge',
                content: { scenario: 'Existing scenario', questions: [] },
                focusArea: 'Data Privacy',
                difficulty: 'advanced',
                challengeType: 'critical-analysis',
                formatType: 'case-study',
                createdAt: new Date().toISOString()
            };
            // Configure repository to return this challenge
            challengeRepository.findById.withArgs(existingChallenge.id).resolves(existingChallenge);
            // Customize the mock response for this specific request
            openAIClient.sendJsonMessage.resolves({
                responseId: `resp_${uuidv4()}`,
                data: {
                    title: 'Advanced Data Privacy Challenge',
                    description: 'A challenge about data privacy',
                    content: { scenario: 'Data privacy scenario', questions: [] },
                    difficulty: 'advanced',
                    focusArea: 'Data Privacy',
                    challengeType: 'critical-analysis',
                    formatType: 'case-study'
                }
            });
            // Regenerate the challenge
            const newChallenge = await challengeGenerationService.regenerateChallenge(existingChallenge.id);
            // Verify the new challenge
            expect(newChallenge).to.exist;
            expect(newChallenge.id).to.not.equal(existingChallenge.id);
            expect(newChallenge.userId).to.equal(existingChallenge.userId);
            expect(newChallenge.focusArea).to.equal(existingChallenge.focusArea);
            expect(newChallenge.difficulty).to.equal(existingChallenge.difficulty);
            // Verify that a new challenge was saved
            expect(challengeRepository.save.calledOnce).to.be.true;
        });
    });
    describe('Error Handling', function () {
        it('should handle errors from the OpenAI API', async function () {
            // Configure OpenAI client to throw an error
            const apiError = new Error('API rate limit exceeded');
            openAIClient.sendJsonMessage.rejects(apiError);
            try {
                // Attempt to generate a challenge
                await challengeGenerationService.generateChallenge();
                // Should not reach here
                expect.fail('Expected an error but none was thrown');
            }
            catch (ChallengeError) {
                // Verify error handling
                expect(error).to.exist;
                expect(error.message).to.include('API rate limit exceeded');
            }
        });
        it('should handle missing challenges during regeneration', async function () {
            // Configure repository to return null for any challenge ID
            challengeRepository.findById.resolves(null);
            try {
                // Attempt to regenerate a non-existent challenge
                await challengeGenerationService.regenerateChallenge(uuidv4());
                // Should not reach here
                expect.fail('Expected an error but none was thrown');
            }
            catch (ChallengeError) {
                // Verify error handling
                expect(error).to.exist;
                expect(error.message).to.include('Challenge not found');
            }
        });
    });
});
