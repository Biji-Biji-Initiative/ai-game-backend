import { expect } from "chai";
import sinon from "sinon";
import { v4 as uuidv4 } from "uuid";
import testSetup from "../domain/setup.js";
import { ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeProcessingError, ChallengeRepositoryError, ChallengeGenerationError } from "@/core/challenge/errors/ChallengeErrors.js";
describe('Integration: Challenge-Evaluation Workflow', function () {
    // Set longer timeout for API calls
    this.timeout(30000);
    let sandbox;
    let challengeRepository;
    let evaluationRepository;
    let openAIMock;
    let challengeService;
    let evaluationService;
    beforeEach(function () {
        // Set up test environment with in-memory repositories
        const setup = testSetup.setup();
        sandbox = setup.sandbox;
        challengeRepository = setup.challengeRepository;
        evaluationRepository = setup.evaluationRepository;
        openAIMock = setup.openAIClient;
        // Set up mock OpenAI responses for different requests
        openAIMock.responses.create.callsFake(params => {
            // Determine request type based on content
            const content = params.messages?.[1]?.content || '';
            if (content.includes('Create a cognitive challenge')) {
                // Challenge generation request
                return Promise.resolve({
                    choices: [{
                            message: {
                                content: JSON.stringify({
                                    title: 'Ethical Decision Making in AI Development',
                                    content: {
                                        description: 'You are leading a team developing an AI system that will help make lending decisions for a bank. You discover that the historical data used for training shows bias against certain demographic groups. How would you address this issue while maintaining the system\'s performance and meeting business requirements?'
                                    },
                                    evaluation_criteria: [
                                        'Understanding of ethical implications',
                                        'Technical feasibility of solution',
                                        'Balance between fairness and performance'
                                    ]
                                })
                            }
                        }]
                });
            }
            else if (content.includes('provide a thoughtful, well-reasoned response')) {
                // Response simulation request
                return Promise.resolve({
                    choices: [{
                            message: {
                                content: 'To address the bias in the historical data, I would take a multi-faceted approach:\n\n1. Data Analysis and Transparency: First, I would thoroughly analyze the data to identify the specific biases present. Understanding the nature and extent of the bias is crucial before attempting to mitigate it.\n\n2. Data Preprocessing: I would implement preprocessing techniques to rebalance the training data, such as oversampling underrepresented groups or applying statistical methods to reduce the impact of biased features.\n\n3. Algorithmic Fairness: I would incorporate fairness constraints directly into the model development process, ensuring that predictions are consistent across different demographic groups while maintaining performance metrics.\n\n4. Regular Auditing: Implementing a system of regular audits to catch any bias that emerges over time, with clear processes for addressing issues that are discovered.\n\n5. Regulatory Compliance: Ensure all solutions comply with relevant regulations like the Fair Lending Act and ECOA.\n\nThis approach aims to balance ethical considerations with performance requirements, recognizing that bias mitigation is an ongoing process rather than a one-time fix.'
                            }
                        }]
                });
            }
            else if (content.includes('Evaluate the following response')) {
                // Evaluation request
                return Promise.resolve({
                    choices: [{
                            message: {
                                content: JSON.stringify({
                                    overall_score: 8,
                                    feedback: 'This is a well-reasoned response that shows good understanding of the ethical implications. The proposed solution is technically feasible and balances fairness with performance requirements.',
                                    strengths: [
                                        'Strong understanding of ethical implications',
                                        'Practical approach to bias mitigation'
                                    ],
                                    areas_for_improvement: [
                                        'Could provide more technical details',
                                        'Limited discussion of regulatory compliance'
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
            }
            else {
                // Default response
                return Promise.resolve({
                    choices: [{
                            message: {
                                content: 'Default mock response'
                            }
                        }]
                });
            }
        });
        // Create the Challenge service
        challengeService = {
            generateChallenge: async (focusArea, difficulty) => {
                const prompt = `Create a cognitive challenge in the ${focusArea} focus area with ${difficulty} difficulty.
        
        The challenge should test critical thinking, problem-solving, and have clear evaluation criteria.
        
        Provide the challenge in JSON format with these properties:
        title: A concise, engaging title for the challenge
        content: An object with a 'description' property containing the challenge text
        evaluation_criteria: An array of criteria to evaluate responses by`;
                const completion = await openAIMock.responses.create({
                    model: 'gpt-4',
                    messages: [
                        { role: 'system', content: 'You are an expert in creating challenging cognitive exercises that test human skills.' },
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: 'json_object' }
                });
                const responseText = completion.choices[0].message.content;
                const challengeData = JSON.parse(responseText);
                const challenge = {
                    id: uuidv4(),
                    focusArea: focusArea,
                    difficulty: difficulty,
                    title: challengeData.title,
                    content: challengeData.content,
                    evaluationCriteria: challengeData.evaluation_criteria,
                    challengeType: 'critical_thinking',
                    formatType: 'text',
                    userId: 'test-user-id',
                    createdAt: new Date().toISOString(),
                    status: 'published',
                    aiGenerated: true
                };
                // Save to repository
                await challengeRepository.save(challenge);
                return challenge;
            },
            simulateResponse: async (challenge) => {
                const prompt = `
        You are presented with the following challenge:
        
        Title: ${challenge.title}
        
        ${challenge.content.description}
        
        Please provide a thoughtful, well-reasoned response to this challenge.`;
                const completion = await openAIMock.responses.create({
                    model: 'gpt-4',
                    messages: [
                        { role: 'system', content: 'You are a participant in a cognitive challenge, responding as a human would.' },
                        { role: 'user', content: prompt }
                    ]
                });
                return completion.choices[0].message.content;
            },
            getChallengeById: async (id) => {
                return await challengeRepository.findById(id);
            }
        };
        // Create the Evaluation service
        evaluationService = {
            evaluateResponse: async (challenge, responseText) => {
                const prompt = `Evaluate the following response to a cognitive challenge.
        
        Challenge: ${challenge.title}
        ${challenge.content.description}
        
        User's Response:
        ${responseText}
        
        Provide an evaluation in JSON format with these properties:
        overall_score: A number from 1-10 rating the overall quality
        feedback: Detailed feedback explaining the evaluation
        strengths: An array of 2-3 strengths in the response
        areas_for_improvement: An array of 2-3 areas that could be improved
        category_scores: An object with scores for clarity (1-10), reasoning (1-10), and originality (1-10)`;
                const completion = await openAIMock.responses.create({
                    model: 'gpt-4',
                    messages: [
                        { role: 'system', content: 'You are an expert evaluator for cognitive challenges.' },
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: 'json_object' }
                });
                const responseJson = completion.choices[0].message.content;
                const evaluationData = JSON.parse(responseJson);
                const evaluation = {
                    id: uuidv4(),
                    challengeId: challenge.id,
                    userId: challenge.userId,
                    responseText: responseText,
                    overallScore: evaluationData.overall_score,
                    feedback: evaluationData.feedback,
                    strengths: evaluationData.strengths,
                    areasForImprovement: evaluationData.areas_for_improvement,
                    categoryScores: evaluationData.category_scores,
                    submittedAt: new Date().toISOString(),
                    evaluatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    score: evaluationData.overall_score
                };
                // Save to repository
                await evaluationRepository.save(evaluation);
                return evaluation;
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
    describe('Challenge-Evaluation Cross-Domain Flow', function () {
        it('should create a challenge, simulate a response, and evaluate it', async function () {
            // 1. Generate a challenge
            const challenge = await challengeService.generateChallenge('AI Ethics', 'medium');
            // Verify challenge properties
            expect(challenge).to.exist;
            expect(challenge.id).to.exist;
            expect(challenge.title).to.equal('Ethical Decision Making in AI Development');
            expect(challenge.focusArea).to.equal('AI Ethics');
            expect(challenge.difficulty).to.equal('medium');
            // 2. Verify challenge was saved to repository
            const savedChallenge = await challengeRepository.findById(challenge.id);
            expect(savedChallenge).to.exist;
            expect(savedChallenge.title).to.equal(challenge.title);
            // 3. Generate a response to the challenge
            const response = await challengeService.simulateResponse(challenge);
            // Verify response properties
            expect(response).to.be.a('string').and.not.empty;
            expect(response).to.include('address the bias');
            // 4. Evaluate the response
            const evaluation = await evaluationService.evaluateResponse(challenge, response);
            // Verify evaluation properties
            expect(evaluation).to.exist;
            expect(evaluation.challengeId).to.equal(challenge.id);
            expect(evaluation.responseText).to.equal(response);
            expect(evaluation.overallScore).to.equal(8);
            expect(evaluation.strengths).to.be.an('array').with.lengthOf(2);
            // 5. Verify evaluation was saved to repository
            const savedEvaluation = await evaluationRepository.findById(evaluation.id);
            expect(savedEvaluation).to.exist;
            expect(savedEvaluation.challengeId).to.equal(challenge.id);
            expect(savedEvaluation.overallScore).to.equal(8);
            // 6. Cross-domain check: retrieve evaluations by challenge ID
            const evaluationsForChallenge = await evaluationService.getEvaluationsByChallengeId(challenge.id);
            expect(evaluationsForChallenge).to.be.an('array').with.lengthOf(1);
            expect(evaluationsForChallenge[0].id).to.equal(evaluation.id);
            expect(evaluationsForChallenge[0].overallScore).to.equal(8);
        });
        it('should handle multiple evaluations for the same challenge', async function () {
            // 1. Generate a challenge
            const challenge = await challengeService.generateChallenge('AI Ethics', 'medium');
            // 2. Generate multiple responses and evaluations
            const response1 = 'First response to the challenge about ethical AI.';
            const response2 = 'Second response with different content about addressing bias.';
            // 3. Evaluate both responses
            const evaluation1 = await evaluationService.evaluateResponse(challenge, response1);
            const evaluation2 = await evaluationService.evaluateResponse(challenge, response2);
            // 4. Verify both evaluations
            expect(evaluation1.id).to.not.equal(evaluation2.id);
            expect(evaluation1.challengeId).to.equal(challenge.id);
            expect(evaluation2.challengeId).to.equal(challenge.id);
            // 5. Cross-domain check: retrieve all evaluations for the challenge
            const evaluations = await evaluationService.getEvaluationsByChallengeId(challenge.id);
            expect(evaluations).to.be.an('array').with.lengthOf(2);
            const evaluationIds = evaluations.map(e => e.id);
            expect(evaluationIds).to.include(evaluation1.id);
            expect(evaluationIds).to.include(evaluation2.id);
        });
    });
});
