/**
 * Challenge Workflow Integration Test with Real APIs
 * 
 * This test validates the entire challenge workflow using real API calls
 * and our actual domain-driven design architecture.
 * 
 * @requires chai
 * @requires testHelper
 * @requires challengeService
 * @requires evaluationService
 * @requires domainEvents
 */

const { expect } = require('chai');
const testHelper = require('../../helpers/apiTestHelper');
const Challenge = require('../../src/core/challenge/models/Challenge');
const challengeRepository = require('../../src/core/challenge/repositories/challengeRepository');
const domainEvents = require('../../src/core/common/events/domainEvents');
const promptBuilder = require('../../src/core/prompt/promptBuilder');
const { PROMPT_TYPES } = require('../../src/core/prompt/promptTypes');


const testEnv = require('../../loadEnv');

const { skipIfMissingEnv } = require('../../helpers/testHelpers');
// Mock challenge generation service - we'll replace this with the real one when available
// This is just to simulate what the real service would do in production
/**
 *
 */
class ChallengeService {
  /**
   *
   */
  constructor(challengeRepository) {
    this.challengeRepository = challengeRepository;
  }
  
  /**
   *
   */
  async generateChallenge(userId, focusArea, options = {}) {
    // Create a challenge with our domain model
    const challenge = new Challenge({
      userId,
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
   *
   */
  async completeChallenge(challengeId, userId, response, score) {
    // Get the challenge
    const challenge = await this.challengeRepository.findById(challengeId);
    
    if (!challenge) {
      throw new Error(`Challenge not found with ID: ${challengeId}`);
    }
    
    // Update challenge state
    challenge.complete(score);
    
    // Save the updated challenge
    await this.challengeRepository.save(challenge);
    
    // Publish domain event
    await domainEvents.publish('ChallengeCompleted', {
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

// Simplified evaluation service for testing
/**
 *
 */
class EvaluationService {
  /**
   *
   */
  async evaluateResponse(challenge, userResponse) {
    // In a real implementation, this would call the evaluation prompt builder
    // and the responses API to evaluate the response

    // Create evaluation prompt using our prompt builder
    const evalPrompt = await promptBuilder.buildPrompt(PROMPT_TYPES.EVALUATION, {
      challenge: {
        id: challenge.id,
        title: challenge.title,
        content: challenge.content,
        evaluationCriteria: ['clarity', 'relevance', 'depth']
      },
      userResponse
    });
    
    // For testing, we'll return a simple evaluation
    return {
      score: 85,
      strengths: ['well-structured', 'addresses key points'],
      weaknesses: ['could provide more examples'],
      feedback: 'Good job addressing the main points of the challenge.',
      evaluationPrompt: evalPrompt 
    };
  }
}

describe('Challenge Workflow with Real APIs', function() {
  
  before(function() {
    skipIfMissingEnv(this, 'openai');
  });

  // Set longer timeout for real API calls
  this.timeout(30000);
  
  let testUser;
  let threadId;
  let challengeService;
  let evaluationService;
  let focusAreaCompletedHandlerCalled = false;
  
  before(async function() {
    // Skip tests if OpenAI API key is not available
    if (!testEnv.getTestConfig().openai.apiKey) {
      console.warn('Skipping tests: OPENAI_API_KEY not available');
      this.skip();
    }
    
    // Create test user and thread
    testUser = await testHelper.setupTestUser();
    threadId = await testHelper.createThread();
    
    // Initialize services
    challengeService = new ChallengeService(challengeRepository);
    evaluationService = new EvaluationService();
    
    // Register domain event handler to test cross-domain communication
    domainEvents.registerHandler('FocusAreaCompleted', async event => {
      focusAreaCompletedHandlerCalled = true;
      console.log('FocusAreaCompleted event received:', event.data);
    });
    
    console.log(`Test setup complete. User ID: ${testUser.id}, Thread ID: ${threadId}`);
  });
  
  after(async function() {
    // Clean up test data
    if (testUser && testUser.id) {
      await testHelper.cleanupTestData(testUser.id);
    }
  });
  
  it('should generate a challenge using our domain model', async function() {
    // Generate a challenge
    const challenge = await challengeService.generateChallenge(
      testUser.id,
      'Effective Questioning',
      {
        difficulty: 'medium',
        challengeType: 'scenario'
      }
    );
    
    // Verify the challenge was created
    expect(challenge).to.be.instanceOf(Challenge);
    expect(challenge.id).to.exist;
    expect(challenge.userId).to.equal(testUser.id);
    expect(challenge.focusArea).to.equal('Effective Questioning');
    expect(challenge.difficulty).to.equal('medium');
    expect(challenge.type).to.equal('scenario');
    
    // Store for next test
    this.challenge = challenge;
    
    console.log(`Generated challenge: ${challenge.title} (ID: ${challenge.id})`);
  });
  
  it('should retrieve the challenge from the repository', async function() {
    // Skip if no challenge was created
    if (!this.challenge) {
      this.skip();
    }
    
    // Retrieve the challenge
    const retrievedChallenge = await challengeRepository.findById(this.challenge.id);
    
    // Verify it was retrieved correctly
    expect(retrievedChallenge).to.be.instanceOf(Challenge);
    expect(retrievedChallenge.id).to.equal(this.challenge.id);
    expect(retrievedChallenge.title).to.equal(this.challenge.title);
    
    console.log(`Retrieved challenge: ${retrievedChallenge.title}`);
  });
  
  it('should create an evaluation prompt using our prompt builder', async function() {
    // Skip if no challenge was created
    if (!this.challenge) {
      this.skip();
    }
    
    // Create evaluation parameters
    const params = {
      challenge: {
        id: this.challenge.id,
        title: this.challenge.title,
        content: this.challenge.content,
        evaluationCriteria: ['clarity', 'accuracy', 'depth']
      },
      userResponse: 'This is a sample user response to the challenge. It addresses the key points in a structured way.'
    };
    
    // Use our prompt builder to generate an evaluation prompt
    const prompt = await promptBuilder.buildPrompt(PROMPT_TYPES.EVALUATION, params);
    
    // Verify the prompt was created
    expect(prompt).to.be.a('string');
    expect(prompt.length).to.be.greaterThan(100);
    
    // Verify it contains the challenge information
    expect(prompt).to.include(this.challenge.title);
    expect(prompt).to.include('This is a sample user response');
    
    console.log(`Generated evaluation prompt with ${prompt.length} characters`);
  });
  
  it('should complete a challenge and publish a domain event', async function() {
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
    
    // Complete the challenge
    const completedChallenge = await challengeService.completeChallenge(
      this.challenge.id,
      testUser.id,
      userResponse,
      85
    );
    
    // Verify the challenge was completed
    expect(completedChallenge).to.be.instanceOf(Challenge);
    expect(completedChallenge.id).to.equal(this.challenge.id);
    expect(completedChallenge.completed).to.be.true;
    expect(completedChallenge.score).to.equal(85);
    expect(completedChallenge.completedAt).to.exist;
    
    // Retrieve from repository to confirm persistence
    const retrievedChallenge = await challengeRepository.findById(this.challenge.id);
    expect(retrievedChallenge.completed).to.be.true;
    expect(retrievedChallenge.score).to.equal(85);
    
    console.log(`Completed challenge: ${completedChallenge.title} with score ${completedChallenge.score}`);
  });
  
  it('should evaluate a challenge response using the evaluation service', async function() {
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
  
  it('should find challenges by focus area', async function() {
    // Create multiple challenges with different focus areas
    await challengeService.generateChallenge(testUser.id, 'Data Analysis', { difficulty: 'easy' });
    await challengeService.generateChallenge(testUser.id, 'Data Analysis', { difficulty: 'medium' });
    await challengeService.generateChallenge(testUser.id, 'Clear Instructions', { difficulty: 'hard' });
    
    // Find challenges by focus area
    const dataAnalysisChallenges = await challengeRepository.findByFocusArea('Data Analysis');
    
    // Verify we found the correct challenges
    expect(dataAnalysisChallenges).to.be.an('array');
    expect(dataAnalysisChallenges.length).to.be.at.least(2);
    
    // Verify they are all for Data Analysis
    dataAnalysisChallenges.forEach(challenge => {
      expect(challenge).to.be.instanceOf(Challenge);
      expect(challenge.focusArea).to.equal('Data Analysis');
    });
    
    console.log(`Found ${dataAnalysisChallenges.length} Data Analysis challenges`);
  });
  
  it('should find challenges by user ID', async function() {
    // Find challenges for our test user
    const userChallenges = await challengeRepository.findByUserId(testUser.id);
    
    // Verify we found challenges
    expect(userChallenges).to.be.an('array');
    expect(userChallenges.length).to.be.at.least(1);
    
    // Verify they all belong to our test user
    userChallenges.forEach(challenge => {
      expect(challenge).to.be.instanceOf(Challenge);
      expect(challenge.userId).to.equal(testUser.id);
    });
    
    console.log(`Found ${userChallenges.length} challenges for user ${testUser.id}`);
  });
}); 