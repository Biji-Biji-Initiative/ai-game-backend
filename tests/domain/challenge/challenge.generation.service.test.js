import { expect } from "chai";
import sinon from "sinon";
import { v4 as uuidv4 } from "uuid";
import testSetup from "../setup.js";
import { ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeProcessingError, ChallengeRepositoryError, ChallengeGenerationError } from "../../../src/core/challenge/errors/ChallengeErrors.js";
describe('Challenge Generation Service', function () {
    // Set longer timeout for API calls
    this.timeout(30000);
    let sandbox;
    let challengeRepository;
    let openAIMock;
    let challengeService;
    beforeEach(function () {
        // Set up test environment with in-memory repositories
        const setup = testSetup.setup();
        sandbox = setup.sandbox;
        challengeRepository = setup.challengeRepository;
        openAIMock = setup.openAIClient;
        // Set up mock OpenAI response for challenge generation
        openAIMock.responses.create.callsFake(params => {
            // Determine if this is a challenge generation or response simulation request
            const isResponseRequest = params.messages.some(msg => msg.content && msg.content.includes('provide a thoughtful, well-reasoned response'));
            if (isResponseRequest) {
                return Promise.resolve({
                    choices: [{
                            message: {
                                content: 'This is a simulated response to the challenge. It demonstrates critical thinking by analyzing the problem from multiple perspectives and proposing a balanced solution.'
                            }
                        }]
                });
            }
            else {
                // This is a challenge generation request
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
        });
        // Create the service to test
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
            },
            getChallengesByUserId: async (userId) => {
                return await challengeRepository.findByUserId(userId);
            },
            getChallengesByFocusArea: async (focusArea) => {
                return await challengeRepository.findByFocusArea(focusArea);
            }
        };
    });
    afterEach(function () {
        // Restore sandbox to clean up stubs
        testSetup.teardown(sandbox);
    });
    describe('Challenge Generation', function () {
        it('should generate a challenge with the specified focus area and difficulty', async function () {
            // Act - Generate a challenge
            const challenge = await challengeService.generateChallenge('AI Ethics', 'medium');
            // Assert - Verify the challenge properties
            expect(challenge).to.exist;
            expect(challenge.id).to.exist;
            expect(challenge.title).to.equal('Ethical Decision Making in AI Development');
            expect(challenge.focusArea).to.equal('AI Ethics');
            expect(challenge.difficulty).to.equal('medium');
            expect(challenge.content).to.be.an('object');
            expect(challenge.content.description).to.be.a('string').and.not.empty;
            expect(challenge.evaluationCriteria).to.be.an('array').with.lengthOf(3);
            // Verify OpenAI was called with the right parameters
            expect(openAIMock.responses.create.calledOnce).to.be.true;
            const callArgs = openAIMock.responses.create.firstCall.args[0];
            expect(callArgs.model).to.equal('gpt-4');
            expect(callArgs.messages[1].content).to.include('AI Ethics');
            expect(callArgs.messages[1].content).to.include('medium');
            // Verify challenge was saved to repository
            const savedChallenge = await challengeRepository.findById(challenge.id);
            expect(savedChallenge).to.exist;
            expect(savedChallenge.title).to.equal('Ethical Decision Making in AI Development');
        });
        it('should simulate a response to a challenge', async function () {
            // Arrange - Create a test challenge
            const testChallenge = {
                id: uuidv4(),
                title: 'Test Challenge',
                content: {
                    description: 'This is a test challenge description.'
                },
                focusArea: 'AI Ethics',
                difficulty: 'medium'
            };
            // Save challenge to repository
            await challengeRepository.save(testChallenge);
            // Act - Simulate a response
            const response = await challengeService.simulateResponse(testChallenge);
            // Assert - Verify the response
            expect(response).to.be.a('string').and.not.empty;
            expect(response).to.include('simulated response');
            // Verify OpenAI was called with the right parameters
            expect(openAIMock.responses.create.calledOnce).to.be.true;
            const callArgs = openAIMock.responses.create.firstCall.args[0];
            expect(callArgs.messages[1].content).to.include('Test Challenge');
            expect(callArgs.messages[1].content).to.include('test challenge description');
        });
        it('should retrieve challenges by focus area', async function () {
            // Arrange - Create and save test challenges
            const challenge1 = {
                id: uuidv4(),
                title: 'Challenge 1',
                content: { description: 'Description 1' },
                focusArea: 'AI Ethics',
                difficulty: 'easy',
                userId: 'test-user-1'
            };
            const challenge2 = {
                id: uuidv4(),
                title: 'Challenge 2',
                content: { description: 'Description 2' },
                focusArea: 'AI Ethics',
                difficulty: 'medium',
                userId: 'test-user-2'
            };
            const challenge3 = {
                id: uuidv4(),
                title: 'Challenge 3',
                content: { description: 'Description 3' },
                focusArea: 'AI Safety',
                difficulty: 'hard',
                userId: 'test-user-1'
            };
            await challengeRepository.save(challenge1);
            await challengeRepository.save(challenge2);
            await challengeRepository.save(challenge3);
            // Act - Get challenges by focus area
            const aiEthicsChallenges = await challengeService.getChallengesByFocusArea('AI Ethics');
            // Assert - Verify the results
            expect(aiEthicsChallenges).to.be.an('array').with.lengthOf(2);
            expect(aiEthicsChallenges.map(c => c.title)).to.include('Challenge 1');
            expect(aiEthicsChallenges.map(c => c.title)).to.include('Challenge 2');
            expect(aiEthicsChallenges.map(c => c.title)).to.not.include('Challenge 3');
        });
    });
});
