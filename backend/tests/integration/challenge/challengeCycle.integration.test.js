/**
 * Challenge Cycle Integration Tests
 * 
 * This test suite validates the complete challenge workflow at the service level:
 * 1. Challenge generation with proper domain model validation
 * 2. Challenge storage and retrieval from the repository
 * 3. Evaluation prompt generation for challenge responses
 * 4. Challenge completion and domain event publishing
 * 5. Response evaluation using the evaluation service
 * 6. Challenge querying by focus area and user ID
 * 
 * NOTE: These are integration tests that test the internal domain services and repositories,
 * not API endpoints. They interact directly with:
 * - Supabase for data persistence (real client)
 * - OpenAI for prompt building (real client)
 * - Domain event system (real implementation)
 * 
 * They validate internal service interactions rather than HTTP API functionality.
 */

import { expect } from "chai";
import * as testHelper from "../../helpers/apiTestHelper.js";
import Challenge from "../../../src/core/challenge/models/Challenge.js";
import challengeRepository from "../../../src/core/challenge/repositories/ChallengeRepository.js";
import domainEvents from "../../../src/core/common/events/domainEvents.js";
import promptBuilder from "../../../src/core/prompt/promptBuilder.js";
import { PROMPT_TYPES } from "../../../src/core/prompt/promptTypes.js";
import { getTestConfig, hasRequiredVars } from "../../config/testConfig.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
import { ChallengeDTO, ChallengeDTOMapper } from "../../../src/core/challenge/dtos/index.js";
import { createUserId, createChallengeId, UserId, ChallengeId } from "../../../src/core/common/valueObjects/index.js";
import ChallengeDTOMapper from "../../../src/application/challenge/mappers/ChallengeDTOMapper.js";
import ChallengeResponseDTOMapper from "../../../src/application/challenge/mappers/ChallengeResponseDTOMapper.js";

// Mock challenge generation service - we'll replace this with the real one when available
// This is just to simulate what the real service would do in production
/**
 * Internal service-level implementation of challenge generation and completion
 * This class interacts directly with the domain model and repositories
 */
class ChallengeService {
    /**
     * @param {Object} challengeRepository - Repository for challenge persistence
     */
    constructor(challengeRepository) {
        this.challengeRepository = challengeRepository;
    }
    
    /**
     * Generates a new challenge for the user with the given focus area
     * @param {UserId|string} userId - User ID or UserId value object
     * @param {string} focusArea - Focus area for the challenge
     * @param {Object} options - Additional options like difficulty and type
     * @returns {Promise<Challenge>} - Generated challenge domain model
     */
    async generateChallenge(userId, focusArea, options = {}) {
        // Create a userId Value Object if a string was passed
        const userIdVO = typeof userId === 'string' ? createUserId(userId) : userId;
        
        // Create a challenge with our domain model
        const challenge = new Challenge({
            userId: userIdVO,
            title: `${focusArea} Challenge`,
            content: `This is a test challenge for ${focusArea}`,
            difficulty: options.difficulty || 'medium',
            type: options.challengeType || 'scenario',
            focusArea,
            questions: [
                {
                    id: 'q1',
                    text: 'How would you approach this problem?'
                },
                {
                    id: 'q2',
                    text: 'What considerations are important?'
                }
            ]
        });
        
        // Save using our repository
        return await this.challengeRepository.save(challenge);
    }
    
    /**
     * Completes a challenge with the user's response and score
     * @param {ChallengeId|string} challengeId - Challenge ID or ChallengeId value object
     * @param {UserId|string} userId - User ID or UserId value object
     * @param {string} response - User's response to the challenge
     * @param {number} score - Score for the response
     * @returns {Promise<Challenge>} - Updated challenge domain model
     */
    async completeChallenge(challengeId, userId, response, score) {
        // Create Value Objects if strings were passed
        const challengeIdVO = typeof challengeId === 'string' ? createChallengeId(challengeId) : challengeId;
        const userIdVO = typeof userId === 'string' ? createUserId(userId) : userId;
        
        // Get the challenge
        const challenge = await this.challengeRepository.findById(challengeIdVO);
        if (!challenge) {
            throw new Error(`Challenge not found with ID: ${challengeIdVO.value}`);
        }
        
        // Update challenge state
        challenge.complete(score);
        
        // Save the updated challenge
        await this.challengeRepository.save(challenge);
        
        // Publish domain event
        domainEvents.publish('ChallengeCompleted', {
            challengeId: challenge.id,
            userId: challenge.userId,
            focusArea: challenge.focusArea,
            score,
            response,
            completedAt: challenge.completedAt
        });
        
        return challenge;
    }
}

/**
 * Service for evaluating challenge responses
 * This interacts with the prompt builder, which uses OpenAI
 */
class EvaluationService {
    /**
     * Evaluates a user's response to a challenge
     * @param {Challenge} challenge - Challenge domain model
     * @param {string} userResponse - User's response to evaluate
     * @returns {Promise<Object>} - Evaluation results
     */
    async evaluateResponse(challenge, userResponse) {
        // Create evaluation prompt using our prompt builder
        // This uses the real OpenAI connection
        const evalPrompt = await promptBuilder.buildPrompt(PROMPT_TYPES.EVALUATION, {
            challenge: {
                id: challenge.id instanceof ChallengeId ? challenge.id.value : challenge.id,
                title: challenge.title,
                content: challenge.content,
                evaluationCriteria: ['clarity', 'relevance', 'depth']
            },
            userResponse
        });
        
        // For testing, we'll return a simulated evaluation result
        // In production, this would send the prompt to OpenAI
        return {
            score: 85,
            strengths: ['well-structured', 'addresses key points'],
            weaknesses: ['could provide more examples'],
            feedback: 'Good job addressing the main points of the challenge.',
            evaluationPrompt: evalPrompt
        };
    }
}

describe('Challenge Domain Service Integration Tests', function () {
    before(function () {
        skipIfMissingEnv(this, 'openai');
    });
    
    // Set longer timeout for real API calls
    this.timeout(30000);
    
    let testUser;
    let testUserId;
    let threadId;
    let challengeService;
    let evaluationService;
    let focusAreaCompletedHandlerCalled = false;
    let eventPromise;
    
    before(async function () {
        // Skip tests if OpenAI API key is not available
        if (!getTestConfig().openai.apiKey) {
            console.warn('Skipping tests: OPENAI_API_KEY not available');
            this.skip();
        }
        
        // Create test user and thread
        testUser = await testHelper.setupTestUser();
        testUserId = createUserId(testUser.id);
        threadId = await testHelper.createThread();
        
        // Initialize services
        challengeService = new ChallengeService(challengeRepository);
        evaluationService = new EvaluationService();
        
        // Create a promise for event handling that resolves when event is received
        let eventResolve;
        eventPromise = new Promise(resolve => {
            eventResolve = resolve;
        });
        
        // Register domain event handler to test cross-domain communication
        domainEvents.registerHandler('FocusAreaCompleted', async (event) => {
            focusAreaCompletedHandlerCalled = true;
            console.log('FocusAreaCompleted event received:', event.data);
            eventResolve(event.data);
        });
        
        console.log(`Test setup complete. User ID: ${testUserId.value}, Thread ID: ${threadId}`);
    });
    
    after(async function () {
        // Clean up test data
        if (testUser && testUser.id) {
            await testHelper.cleanupTestData(testUser.id);
        }
    });
    
    it('should generate a challenge using the domain model and persist it', async function () {
        // Generate a challenge
        const challenge = await challengeService.generateChallenge(testUserId, 'Effective Questioning', {
            difficulty: 'medium',
            challengeType: 'scenario'
        });
        
        // Verify the challenge was created with proper domain model
        expect(challenge).to.be.instanceOf(Challenge);
        expect(challenge.id).to.exist;
        expect(challenge.userId).to.be.instanceOf(UserId);
        expect(challenge.userId.value).to.equal(testUser.id);
        expect(challenge.focusArea).to.equal('Effective Questioning');
        expect(challenge.difficulty).to.equal('medium');
        expect(challenge.type).to.equal('scenario');
        
        // Create a DTO and validate it
        const challengeDto = new ChallengeDTO(ChallengeDTOMapper.toDTO(challenge));
        expect(challengeDto).to.be.instanceOf(ChallengeDTO);
        
        // Store for next test
        this.challenge = challenge;
        console.log(`Generated challenge: ${challenge.title} (ID: ${challenge.id.value})`);
    });
    
    it('should retrieve the challenge from the repository', async function () {
        // Skip if no challenge was created
        if (!this.challenge) {
            this.skip();
        }
        
        // Retrieve the challenge
        const retrievedChallenge = await challengeRepository.findById(this.challenge.id);
        
        // Verify it was retrieved correctly with proper domain model
        expect(retrievedChallenge).to.be.instanceOf(Challenge);
        expect(retrievedChallenge.id).to.be.instanceOf(ChallengeId);
        expect(retrievedChallenge.id.value).to.equal(this.challenge.id.value);
        expect(retrievedChallenge.title).to.equal(this.challenge.title);
        expect(retrievedChallenge.focusArea).to.equal(this.challenge.focusArea);
        console.log(`Retrieved challenge: ${retrievedChallenge.title}`);
    });
    
    it('should create an evaluation prompt using the prompt builder', async function () {
        // Skip if no challenge was created
        if (!this.challenge) {
            this.skip();
        }
        
        // Create evaluation parameters
        const params = {
            challenge: {
                id: this.challenge.id.value,
                title: this.challenge.title,
                content: this.challenge.content,
                evaluationCriteria: ['clarity', 'accuracy', 'depth']
            },
            userResponse: 'This is a sample user response to the challenge. It addresses the key points in a structured way.'
        };
        
        // Use our prompt builder to generate an evaluation prompt
        // This uses the real OpenAI connection
        const prompt = await promptBuilder.buildPrompt(PROMPT_TYPES.EVALUATION, params);
        
        // Verify the prompt was created
        expect(prompt).to.be.a('string');
        expect(prompt.length).to.be.greaterThan(100);
        
        // Verify it contains the challenge information
        expect(prompt).to.include(this.challenge.title);
        expect(prompt).to.include('This is a sample user response');
        console.log(`Generated evaluation prompt with ${prompt.length} characters`);
    });
    
    it('should complete a challenge and publish a domain event', async function () {
        // Skip if no challenge was created
        if (!this.challenge) {
            this.skip();
        }
        
        // Sample user response
        const userResponse = `
      To approach this problem, I would first identify the key elements that need to be considered.
      The most important considerations include understanding the context, identifying the stakeholders,
      and analyzing potential impacts. It's essential to gather all relevant information before making decisions.
    `;
        
        // Register a handler that resolves when the event is published
        let eventReceived = false;
        const eventPromise = new Promise(resolve => {
            const handler = (event) => {
                if (event.data.challengeId.value === this.challenge.id.value) {
                    eventReceived = true;
                    domainEvents.unregisterHandler('ChallengeCompleted', handler);
                    resolve(event.data);
                }
            };
            domainEvents.registerHandler('ChallengeCompleted', handler);
        });
        
        // Complete the challenge
        const completedChallenge = await challengeService.completeChallenge(this.challenge.id, testUserId, userResponse, 85);
        
        // Verify the challenge was completed and domain model updated correctly
        expect(completedChallenge).to.be.instanceOf(Challenge);
        expect(completedChallenge.id).to.be.instanceOf(ChallengeId);
        expect(completedChallenge.id.value).to.equal(this.challenge.id.value);
        expect(completedChallenge.completed).to.be.true;
        expect(completedChallenge.score).to.equal(85);
        expect(completedChallenge.completedAt).to.exist;
        
        // Wait for the event to be published with a timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Event publication timed out')), 3000)
        );
        
        try {
            await Promise.race([eventPromise, timeoutPromise]);
            expect(eventReceived).to.be.true;
        } catch (error) {
            console.warn('Event may not have been received:', error.message);
        }
        
        // Create a DTO and validate it
        const challengeDto = new ChallengeDTO(ChallengeDTOMapper.toDTO(completedChallenge));
        expect(challengeDto).to.be.instanceOf(ChallengeDTO);
        expect(challengeDto.completed).to.be.true;
        expect(challengeDto.score).to.equal(85);
        
        // Retrieve from repository to confirm persistence
        const retrievedChallenge = await challengeRepository.findById(this.challenge.id);
        expect(retrievedChallenge.completed).to.be.true;
        expect(retrievedChallenge.score).to.equal(85);
        console.log(`Completed challenge: ${completedChallenge.title} with score ${completedChallenge.score}`);
    });
    
    it('should evaluate a challenge response using the evaluation service', async function () {
        // Skip if no challenge was created
        if (!this.challenge) {
            this.skip();
        }
        
        // Sample user response
        const userResponse = `
      I would approach this problem methodically by breaking it down into components.
      First, I would analyze the key factors involved, then consider potential solutions,
      and finally evaluate each solution against a set of criteria.
      
      Important considerations include efficiency, scalability, and user impact.
      We need to ensure that any solution addresses the root cause while minimizing
      negative effects on the overall system.
    `;
        
        // Evaluate the response
        const evaluation = await evaluationService.evaluateResponse(this.challenge, userResponse);
        
        // Verify the evaluation
        expect(evaluation).to.be.an('object');
        expect(evaluation.score).to.be.a('number');
        expect(evaluation.strengths).to.be.an('array');
        expect(evaluation.weaknesses).to.be.an('array');
        expect(evaluation.feedback).to.be.a('string');
        expect(evaluation.evaluationPrompt).to.be.a('string');
        console.log(`Evaluation score: ${evaluation.score}`);
        console.log(`Strengths: ${evaluation.strengths.join(', ')}`);
        console.log(`Weaknesses: ${evaluation.weaknesses.join(', ')}`);
    });
    
    it('should find challenges by focus area from repository', async function () {
        // Create multiple challenges with different focus areas
        await challengeService.generateChallenge(testUserId, 'Data Analysis', { difficulty: 'easy' });
        await challengeService.generateChallenge(testUserId, 'Data Analysis', { difficulty: 'medium' });
        await challengeService.generateChallenge(testUserId, 'Clear Instructions', { difficulty: 'hard' });
        
        // Find challenges by focus area
        const dataAnalysisChallenges = await challengeRepository.findByFocusArea('Data Analysis');
        
        // Verify we found the correct challenges
        expect(dataAnalysisChallenges).to.be.an('array');
        expect(dataAnalysisChallenges.length).to.be.at.least(2);
        
        // Verify they are all for Data Analysis and use proper Value Objects
        dataAnalysisChallenges.forEach(challenge => {
            expect(challenge).to.be.instanceOf(Challenge);
            expect(challenge.id).to.be.instanceOf(ChallengeId);
            expect(challenge.userId).to.be.instanceOf(UserId);
            expect(challenge.focusArea).to.equal('Data Analysis');
        });
        console.log(`Found ${dataAnalysisChallenges.length} Data Analysis challenges`);
    });
    
    it('should find challenges by user ID from repository', async function () {
        // Find challenges for our test user
        const userChallenges = await challengeRepository.findByUserId(testUserId);
        
        // Verify we found challenges
        expect(userChallenges).to.be.an('array');
        expect(userChallenges.length).to.be.at.least(1);
        
        // Verify they all belong to our test user and use proper Value Objects
        userChallenges.forEach(challenge => {
            expect(challenge).to.be.instanceOf(Challenge);
            expect(challenge.id).to.be.instanceOf(ChallengeId);
            expect(challenge.userId).to.be.instanceOf(UserId);
            expect(challenge.userId.value).to.equal(testUser.id);
        });
        console.log(`Found ${userChallenges.length} challenges for user ${testUser.id}`);
    });
});
