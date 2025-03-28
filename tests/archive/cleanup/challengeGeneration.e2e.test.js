/**
 * E2E Test: Challenge Generation
 * 
 * Tests the challenge generation API endpoints that use OpenAI and store in Supabase.
 * This test makes real HTTP requests to the API.
 */

const { expect } = require('chai');
const axios = require('axios');

const testEnv = require('../../loadEnv');

const { skipIfMissingEnv } = require('../../helpers/testHelpers');
require('dotenv').config();

// Import API test helper for authentication and setup
const apiTestHelper = require('../../helpers/apiTestHelper');

// Timeout for API requests
const API_TIMEOUT = 40000;

// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

describe('E2E: Challenge Generation API', function() {
  
  
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
  let axiosInstance;
  let testUser;
  let authToken;
  let generatedChallengeId;
  
  before(async function() {
    // Skip tests if OpenAI API key is not available
    if (!testEnv.getTestConfig().openai.apiKey) {
      console.warn('OPENAI_API_KEY not found, skipping E2E tests');
      this.skip();
    }
    
    // Set up test user and auth token
    try {
      // Get test user
      testUser = await apiTestHelper.setupTestUser();
      console.log(`Test user created: ${testUser.email}`);
      
      // Get auth token
      authToken = await apiTestHelper.getAuthToken(testUser.email, testUser.password);
      
      // Create axios instance with authentication
      axiosInstance = axios.create({
        baseURL: API_URL,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
    } catch (error) {
      console.error('Failed to set up API client:', error.message);
      throw error;
    }
  });
  
  after(async function() {
    // Clean up test data
    try {
      // Delete challenge if it exists
      if (generatedChallengeId) {
        await apiTestHelper.apiRequest('delete', `/challenges/${generatedChallengeId}`, null, authToken);
        console.log(`Challenge deleted: ${generatedChallengeId}`);
      }
      
      // We're using a persistent test user, so no need to clean up
      console.log(`Test user retained: ${testUser.email}`);
    } catch (error) {
      console.warn('Failed to clean up test data:', error.message);
    }
  });
  
  describe('Challenge Generation Flow', function() {
    it('should generate a challenge using AI via the API', async function() {
      // Skip if no auth token is available
      if (!authToken) {
        this.skip();
      }
      
      // Step 1: Request AI-generated challenge
      const generationData = {
        category: 'logical-reasoning',
        difficulty: 'medium',
        focusArea: 'reasoning'
      };
      
      const generationResponse = await apiTestHelper.apiRequest(
        'post', 
        '/challenges/generate', 
        generationData, 
        authToken
      );
      
      // Verify challenge generation
      expect(generationResponse.status).to.equal(200);
      expect(generationResponse.data.success).to.be.true;
      expect(generationResponse.data.data).to.exist;
      
      // Save challenge ID for later
      generatedChallengeId = generationResponse.data.data.id;
      
      // Step 2: Retrieve the generated challenge
      const retrieveResponse = await apiTestHelper.apiRequest(
        'get', 
        `/challenges/${generatedChallengeId}`, 
        null, 
        authToken
      );
      
      // Verify retrieved challenge
      expect(retrieveResponse.status).to.equal(200);
      expect(retrieveResponse.data.success).to.be.true;
      expect(retrieveResponse.data.data).to.exist;
      
      const challenge = retrieveResponse.data.data;
      
      // Verify challenge structure
      expect(challenge.id).to.equal(generatedChallengeId);
      expect(challenge.title).to.be.a('string').and.not.empty;
      expect(challenge.difficulty).to.equal(generationData.difficulty);
      expect(challenge.challenge_type || challenge.challengeType).to.equal(generationData.category);
      expect(challenge.content).to.exist;
      
      console.log('Successfully generated and retrieved challenge:', {
        id: challenge.id,
        title: challenge.title
      });
    });
    
    it('should list user challenges including the generated one', async function() {
      // Skip if no challenge was created
      if (!generatedChallengeId || !authToken) {
        this.skip();
      }
      
      const listResponse = await apiTestHelper.apiRequest('get', '/challenges/user', null, authToken);
      
      // Verify list response
      expect(listResponse.status).to.equal(200);
      expect(listResponse.data.success).to.be.true;
      expect(listResponse.data.data).to.be.an('array');
      
      // Verify the challenge we created is in the list
      const userChallenges = listResponse.data.data;
      const createdChallenge = userChallenges.find(c => c.id === generatedChallengeId);
      expect(createdChallenge).to.exist;
    });
  });
}); 