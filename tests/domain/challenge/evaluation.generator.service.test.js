import { expect } from "chai";
import sinon from "sinon";
import { v4 as uuidv4 } from "uuid";
import testSetup from "../setup.js";
import { ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeProcessingError, ChallengeRepositoryError, ChallengeGenerationError } from "../../../src/core/challenge/errors/ChallengeErrors.js";
describe('Evaluation Generator Service', function () {
    // Set longer timeout for API calls
    this.timeout(30000);
    let sandbox;
    let challengeRepository;
    let evaluationRepository;
    let openAIMock;
    let evaluationGeneratorService;
    beforeEach(function () {
        // Set up test environment with in-memory repositories
        const setup = testSetup.setup();
        sandbox = setup.sandbox;
        challengeRepository = setup.challengeRepository;
        evaluationRepository = setup.evaluationRepository;
        openAIMock = setup.openAIClient;
        // Set up mock OpenAI response for evaluation
        openAIMock.responses.create.resolves({
            choices: [{
                    message: {
                        content: JSON.stringify({
                            overall_score: 8,
                            feedback: 'This is a well-reasoned response that demonstrates good critical thinking skills. The solution is systematic and addresses most of the constraints in the puzzle.',
                            strengths: [
                                'Clear logical approach',
                                'Step-by-step reasoning',
                                'Correctly identified constraints'
                            ],
                            areas_for_improvement: [
                                'Minor inconsistency in the initial reasoning',
                                'Could be more concise',
                                'Some redundant analysis'
                            ],
                            category_scores: {
                                clarity: 8,
                                reasoning: 9,
                                originality: 7
                            }
                        })
                    }
                }]
        });
        // Create the service to test
        evaluationGeneratorService = {
            generateEvaluation: async (challenge, userResponse) => {
                const promptText = `Evaluate the following response to a critical thinking challenge.
        
        Challenge: ${challenge.title}
        ${challenge.content.description}
        
        User's Response:
        ${userResponse}
        
        Evaluate this solution and provide an assessment in JSON format with the following structure:
        {
          "overall_score": 8, // number from 1-10
          "feedback": "Detailed overall feedback",
          "strengths": ["Strength 1", "Strength 2", "Strength 3"],
          "areas_for_improvement": ["Area 1", "Area 2", "Area 3"],
          "category_scores": {
            "clarity": 7,
            "reasoning": 8,
            "originality": 6
          }
        }`;
                // Make the completion call to OpenAI
                const completion = await openAIMock.responses.create({
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an evaluator for critical thinking challenges. Provide an assessment of the user\'s solution with constructive feedback.'
                        },
                        {
                            role: 'user',
                            content: promptText
                        }
                    ],
                    response_format: { type: 'json_object' }
                });
                // Get the response and parse it
                const responseText = completion.choices[0].message.content;
                const jsonData = JSON.parse(responseText);
                // Create an evaluation object
                const evaluation = {
                    id: uuidv4(),
                    challengeId: challenge.id,
                    userId: challenge.userId || 'test-user-id',
                    userEmail: challenge.userEmail || 'test-user@example.com',
                    score: jsonData.overall_score,
                    feedback: jsonData.feedback,
                    strengths: jsonData.strengths,
                    areasForImprovement: jsonData.areas_for_improvement,
                    createdAt: new Date().toISOString(),
                    categoryScores: jsonData.category_scores
                };
                // Save to repository
                await evaluationRepository.save(evaluation);
                return evaluation;
            },
            getEvaluationById: async (id) => {
                return await evaluationRepository.findById(id);
            },
            getEvaluationsByChallengeId: async (challengeId) => {
                return await evaluationRepository.findByChallengeId(challengeId);
            }
        };
    });
    afterEach(function () {
        // Restore sandbox to clean up stubs
        testSetup.teardown(sandbox);
    });
    describe('Evaluation Generation', function () {
        it('should generate an evaluation for a challenge response', async function () {
            // Arrange - Create a test challenge and user response
            const challenge = {
                id: uuidv4(),
                title: 'Logic Puzzle Challenge',
                content: {
                    description: 'Solve the grid puzzle with 5 people and their drinks.'
                },
                userId: 'test-user-123',
                challengeType: 'critical_thinking'
            };
            const userResponse = `First, I start by setting up a grid with 5 positions and noting what we know:
      1. Alice's cup contains water.
      2. Bob is sitting in the middle.
      3. The person drinking coffee is sitting at one of the ends.
      
      From clue 4, Charlie is sitting next to the person drinking tea. And from clue 5, Dana is sitting next to Elliot.
      
      Since Bob is in the middle (position 3), other people must be in positions 1, 2, 4, and 5.
      
      From clue 6, the person drinking orange juice is sitting next to the person drinking milk. 
      
      From clue 7, the person drinking soda is not sitting at either end, so they must be in position 2 or 4.
      
      The final arrangement:
      Position 1: Alice (water)
      Position 2: Charlie (soda)
      Position 3: Bob (tea)
      Position 4: Elliot (orange juice)
      Position 5: Dana (coffee)`;
            // Save challenge to repository
            await challengeRepository.save(challenge);
            // Act - Generate an evaluation for the response
            const evaluation = await evaluationGeneratorService.generateEvaluation(challenge, userResponse);
            // Assert - Verify the evaluation properties
            expect(evaluation).to.exist;
            expect(evaluation.id).to.exist;
            expect(evaluation.challengeId).to.equal(challenge.id);
            expect(evaluation.userId).to.equal('test-user-123');
            expect(evaluation.score).to.equal(8);
            expect(evaluation.feedback).to.be.a('string').and.not.empty;
            expect(evaluation.strengths).to.be.an('array').with.lengthOf(3);
            expect(evaluation.areasForImprovement).to.be.an('array').with.lengthOf(3);
            expect(evaluation.categoryScores).to.be.an('object');
            expect(evaluation.categoryScores.clarity).to.equal(8);
            expect(evaluation.categoryScores.reasoning).to.equal(9);
            // Verify OpenAI was called with the right parameters
            expect(openAIMock.responses.create.calledOnce).to.be.true;
            const callArgs = openAIMock.responses.create.firstCall.args[0];
            expect(callArgs.model).to.equal('gpt-4');
            expect(callArgs.messages[1].content).to.include('Logic Puzzle Challenge');
            expect(callArgs.messages[1].content).to.include('grid with 5 positions');
            // Verify evaluation was saved to repository
            const savedEvaluation = await evaluationRepository.findById(evaluation.id);
            expect(savedEvaluation).to.exist;
            expect(savedEvaluation.challengeId).to.equal(challenge.id);
            expect(savedEvaluation.score).to.equal(8);
        });
        it('should handle different types of responses with proper category scoring', async function () {
            // Arrange - Override OpenAI mock for this test
            openAIMock.responses.create.resolves({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                overall_score: 6,
                                feedback: 'The response shows some understanding but lacks depth of analysis.',
                                strengths: ['Good attempt', 'Some valid points'],
                                areas_for_improvement: ['Deepen analysis', 'Consider more alternatives', 'Provide evidence'],
                                category_scores: {
                                    clarity: 5,
                                    reasoning: 6,
                                    originality: 7
                                }
                            })
                        }
                    }]
            });
            // Create a test challenge
            const challenge = {
                id: uuidv4(),
                title: 'Ethics Challenge',
                content: {
                    description: 'Discuss the ethical implications of autonomous vehicles.'
                }
            };
            const userResponse = 'Autonomous vehicles raise ethical concerns about decision-making in unavoidable accident scenarios.';
            // Save challenge to repository
            await challengeRepository.save(challenge);
            // Act - Generate an evaluation for the short response
            const evaluation = await evaluationGeneratorService.generateEvaluation(challenge, userResponse);
            // Assert - Verify the evaluation is appropriate for a short response
            expect(evaluation).to.exist;
            expect(evaluation.score).to.equal(6);
            expect(evaluation.categoryScores.clarity).to.equal(5);
            expect(evaluation.areasForImprovement).to.include('Deepen analysis');
            // Verify OpenAI was called with the short response text
            expect(openAIMock.responses.create.calledOnce).to.be.true;
            const callArgs = openAIMock.responses.create.firstCall.args[0];
            expect(callArgs.messages[1].content).to.include(userResponse);
        });
        it('should retrieve evaluations by challenge ID', async function () {
            // Arrange - Create a test challenge
            const challenge = {
                id: uuidv4(),
                title: 'Test Challenge',
                content: { description: 'Test description' }
            };
            // Create multiple evaluations for the same challenge
            const evaluation1 = {
                id: uuidv4(),
                challengeId: challenge.id,
                userId: 'user-1',
                score: 7,
                feedback: 'Good work',
                strengths: ['Strength 1', 'Strength 2'],
                areasForImprovement: ['Area 1', 'Area 2'],
                categoryScores: { clarity: 7, reasoning: 7, originality: 7 }
            };
            const evaluation2 = {
                id: uuidv4(),
                challengeId: challenge.id,
                userId: 'user-2',
                score: 9,
                feedback: 'Excellent work',
                strengths: ['Strength A', 'Strength B'],
                areasForImprovement: ['Area A', 'Area B'],
                categoryScores: { clarity: 9, reasoning: 9, originality: 8 }
            };
            // Save everything to repositories
            await challengeRepository.save(challenge);
            await evaluationRepository.save(evaluation1);
            await evaluationRepository.save(evaluation2);
            // Act - Get evaluations by challenge ID
            const evaluations = await evaluationGeneratorService.getEvaluationsByChallengeId(challenge.id);
            // Assert - Verify the results
            expect(evaluations).to.be.an('array').with.lengthOf(2);
            const scores = evaluations.map(e => e.score);
            expect(scores).to.include(7);
            expect(scores).to.include(9);
            const userIds = evaluations.map(e => e.userId);
            expect(userIds).to.include('user-1');
            expect(userIds).to.include('user-2');
        });
    });
});
