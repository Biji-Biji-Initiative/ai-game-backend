/**
 * Challenge-Evaluation E2E Tests
 * 
 * End-to-end tests for the challenge generation and evaluation flow, 
 * testing with real HTTP requests.
 */

const { expect } = require('chai');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');


const testEnv = require('../loadEnv');

const { skipIfMissingEnv } = require('../helpers/testHelpers');
// Import API test helper for authentication and setup
const apiTestHelper = require('../helpers/apiTestHelper');

// Timeout for API requests
const API_TIMEOUT = 40000;

// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

describe('E2E: Challenge-Evaluation Flow', function() {
  
  
  // Set longer timeout for API calls
  this.timeout(30000);

before(function() {
    skipIfMissingEnv(this, 'openai');
  });

// Configure longer timeout for E2E tests
  this.timeout(API_TIMEOUT);
  
  // Skip if API keys not available
  before(function() {
    if (!process.env.API_URL && !process.env.TEST_API_URL) {
      console.warn('API_URL not set, skipping E2E tests');
      this.skip();
    }
  });
  
  // Test variables
  let apiClient;
  let testUser;
  let authToken;
  let challengeId;
  let evaluationId;
  
  before(async function() {
    // Skip tests if OpenAI API key is not available
    if (!testEnv.getTestConfig().openai.apiKey) {
      console.warn('OPENAI_API_KEY not found, skipping E2E tests');
      this.skip();
    }
    
    // Create API client with authentication
    try {
      const apiSetup = await apiTestHelper.setupApiClient();
      apiClient = apiSetup.apiClient;
      testUser = apiSetup.testUser;
      authToken = apiSetup.authToken;
      
      // Log successful setup
      console.log(`Test user created: ${testUser.email}`);
    } catch (error) {
      console.error('Failed to set up API client:', error.message);
      throw error;
    }
  });
  
  after(async function() {
    // Clean up test data
    try {
      // Delete evaluation if it exists
      if (evaluationId) {
        await apiClient.delete(`/api/evaluations/${evaluationId}`);
        console.log(`Evaluation deleted: ${evaluationId}`);
      }
      
      // Delete challenge if it exists
      if (challengeId) {
        await apiClient.delete(`/api/challenges/${challengeId}`);
        console.log(`Challenge deleted: ${challengeId}`);
      }
      
      // Clean up test user
      await apiTestHelper.cleanupTestUser(testUser.id);
      console.log(`Test user cleaned up: ${testUser.email}`);
    } catch (error) {
      console.warn('Failed to clean up test data:', error.message);
    }
  });
  
  describe('Challenge Generation and Evaluation', function() {
    it('should generate a challenge, submit a response, and get an evaluation', async function() {
      // Step 1: Generate a challenge
      const challengeRequestData = {
        focusArea: 'AI Ethics',
        difficulty: 'medium',
        type: 'text'
      };
      
      const challengeResponse = await apiClient.post('/api/challenges/generate', challengeRequestData);
      
      // Verify challenge response
      expect(challengeResponse.status).to.equal(200);
      expect(challengeResponse.data.success).to.be.true;
      expect(challengeResponse.data.data).to.exist;
      
      // Save challenge ID for later
      challengeId = challengeResponse.data.data.id;
      const challenge = challengeResponse.data.data;
      
      // Verify challenge format
      expect(challenge.title).to.be.a('string').and.not.empty;
      expect(challenge.content).to.be.an('object');
      expect(challenge.content.description).to.be.a('string').and.not.empty;
      expect(challenge.userId).to.equal(testUser.id);
      
      // Step 2: Get the challenge by ID to verify it was saved
      const getChallengeResponse = await apiClient.get(`/api/challenges/${challengeId}`);
      
      // Verify get challenge response
      expect(getChallengeResponse.status).to.equal(200);
      expect(getChallengeResponse.data.success).to.be.true;
      expect(getChallengeResponse.data.data.id).to.equal(challengeId);
      
      // Step 3: Submit a response to the challenge
      const responseText = "This is a test response to the challenge. To address ethical issues in AI, I would implement regular bias audits, ensure diverse training data, and establish an ethics review board for oversight.";
      
      const evaluationRequestData = {
        challengeId: challengeId,
        responseText: responseText
      };
      
      const evaluationResponse = await apiClient.post('/api/evaluations/submit', evaluationRequestData);
      
      // Verify evaluation response
      expect(evaluationResponse.status).to.equal(200);
      expect(evaluationResponse.data.success).to.be.true;
      expect(evaluationResponse.data.data).to.exist;
      
      // Save evaluation ID for later
      evaluationId = evaluationResponse.data.data.id;
      const evaluation = evaluationResponse.data.data;
      
      // Verify evaluation format
      expect(evaluation.challengeId).to.equal(challengeId);
      expect(evaluation.responseText).to.equal(responseText);
      expect(evaluation.overallScore).to.be.a('number');
      expect(evaluation.feedback).to.be.a('string').and.not.empty;
      expect(evaluation.strengths).to.be.an('array').and.not.empty;
      expect(evaluation.areasForImprovement).to.be.an('array');
      expect(evaluation.userId).to.equal(testUser.id);
      
      // Step 4: Get evaluations for the challenge
      const getEvaluationsResponse = await apiClient.get(`/api/challenges/${challengeId}/evaluations`);
      
      // Verify get evaluations response
      expect(getEvaluationsResponse.status).to.equal(200);
      expect(getEvaluationsResponse.data.success).to.be.true;
      expect(getEvaluationsResponse.data.data).to.be.an('array').with.lengthOf.at.least(1);
      
      // Verify the evaluation we created is in the list
      const evaluations = getEvaluationsResponse.data.data;
      const createdEvaluation = evaluations.find(e => e.id === evaluationId);
      expect(createdEvaluation).to.exist;
    });
    
    it('should get a list of user challenges and evaluations', async function() {
      // Skip if no challenge was created
      if (!challengeId) {
        this.skip();
      }
      
      // Get user challenges
      const userChallengesResponse = await apiClient.get('/api/challenges/user');
      
      // Verify user challenges response
      expect(userChallengesResponse.status).to.equal(200);
      expect(userChallengesResponse.data.success).to.be.true;
      expect(userChallengesResponse.data.data).to.be.an('array');
      
      // Verify the challenge we created is in the list
      const userChallenges = userChallengesResponse.data.data;
      const createdChallenge = userChallenges.find(c => c.id === challengeId);
      expect(createdChallenge).to.exist;
      
      // Get user evaluations
      const userEvaluationsResponse = await apiClient.get('/api/evaluations/user');
      
      // Verify user evaluations response
      expect(userEvaluationsResponse.status).to.equal(200);
      expect(userEvaluationsResponse.data.success).to.be.true;
      expect(userEvaluationsResponse.data.data).to.be.an('array');
      
      // Verify the evaluation we created is in the list
      if (evaluationId) {
        const userEvaluations = userEvaluationsResponse.data.data;
        const createdEvaluation = userEvaluations.find(e => e.id === evaluationId);
        expect(createdEvaluation).to.exist;
        expect(createdEvaluation.challengeId).to.equal(challengeId);
      }
    });
  });
}); 