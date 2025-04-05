/**
 * Challenge Generation E2E Tests
 * 
 * This test suite validates the Challenge Generation API functionality:
 * 1. Generating AI-powered challenges with proper parameters
 * 2. Retrieving generated challenges with correct structure
 * 3. Listing user challenges and verifying correct ownership
 * 4. Generating challenges for specific focus areas
 * 5. Proper validation of challenge properties and persistence
 * 
 * These tests ensure that the Challenge Generation process works end-to-end,
 * properly storing the generated challenges and associating them with users.
 */

// Import test libraries directly (not through other files that might import this one)
import { expect } from 'chai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { setupTestUser, getAuthToken, apiRequest } from '../../helpers/apiTestHelper.js';
// Import the UserDTO for validating user data structures if needed
import UserDTO from '../../../src/core/user/dtos/UserDTO.js';

// Set up timeout for longer API calls
const API_TIMEOUT = 40000;

// Load environment variables - rely on apiTestHelper to handle this
console.log(`Environment loaded from: ${path.resolve(process.cwd(), '.env.test')}`);

describe('Challenge Generation E2E Tests', function() {
  this.timeout(API_TIMEOUT);
  
  // Tests that require authentication
  describe('Challenge Generation API Flow', function() {
    let authToken;
    let generatedChallengeId;
    let focusAreaChallengeId;
    let testUser;
    let generatedFocusAreaId;
    
    // Set up before running tests
    before(async function() {
      try {
        // Set up a test user 
        testUser = await setupTestUser();
        // Get auth token
        authToken = await getAuthToken(testUser.email, testUser.password);
        console.log('Auth token obtained successfully');
      } catch (error) {
        console.error('Error in test setup:', error);
        this.skip();
      }
    });
    
    // Cleanup after tests
    after(async function() {
      // Clean up test data
      try {
        // Delete generated challenges if they exist
        if (generatedChallengeId) {
          await apiRequest('delete', `api/v1/challenges/${generatedChallengeId}`, null, authToken);
          console.log(`Challenge deleted: ${generatedChallengeId}`);
        }
        if (focusAreaChallengeId) {
          await apiRequest('delete', `api/v1/challenges/${focusAreaChallengeId}`, null, authToken);
          console.log(`Focus area challenge deleted: ${focusAreaChallengeId}`);
        }
      } catch (error) {
        console.warn('Failed to clean up test data:', error.message);
      }
    });
    
    // Test: Generate a challenge
    it('should generate a challenge using AI via the API and verify content/persistence', async function() {
      // Skip if no auth token is available
      if (!authToken) {
        this.skip();
      }
      
      // Challenge generation data
      const generationData = {
        category: 'logical-reasoning',
        difficulty: 'medium',
        focusArea: 'reasoning'
      };
      
      // Generate the challenge
      const generationResponse = await apiRequest('post', 'api/v1/challenges/generate', generationData, authToken);
      
      // Verify challenge generation response
      expect(generationResponse.status).to.equal(200);
      expect(generationResponse.data.success).to.be.true;
      expect(generationResponse.data.data).to.exist;
      
      // Save basic challenge data for validation
      const challenge = generationResponse.data.data;
      
      // Verify basic structure of generated challenge
      expect(challenge.id).to.be.a('string');
      expect(challenge.content).to.exist;
      expect(challenge.difficulty).to.equal(generationData.difficulty);
      
      // Enhanced assertions for generated content - Ticket 5 requirement
      if (typeof challenge.content === 'string') {
        expect(challenge.content.length).to.be.greaterThan(100);
      } else if (challenge.content.description) {
        // Check that description has meaningful length
        expect(challenge.content.description.length).to.be.greaterThan(50);
        
        // Check for keywords related to the category (logical-reasoning)
        expect(challenge.content.description.toLowerCase()).to.satisfy(desc => {
          return desc.includes('logic') || 
                 desc.includes('reason') || 
                 desc.includes('problem') || 
                 desc.includes('think') ||
                 desc.includes('analyze');
        }, 'Description should contain keywords related to logical reasoning');
      }
      
      // Save challenge ID for later
      generatedChallengeId = challenge.id;
      
      // Verify persistence by retrieving the generated challenge - Ticket 5 indirect persistence check
      const retrieveResponse = await apiRequest('get', `api/v1/challenges/${generatedChallengeId}`, null, authToken);
      
      // Verify retrieval response
      expect(retrieveResponse.status).to.equal(200);
      expect(retrieveResponse.data.success).to.be.true;
      expect(retrieveResponse.data.data).to.exist;
      
      // Verify challenge structure after retrieval (persistence check)
      const retrievedChallenge = retrieveResponse.data.data;
      expect(retrievedChallenge.id).to.equal(generatedChallengeId);
      expect(retrievedChallenge.content).to.exist;
      expect(retrievedChallenge.difficulty).to.equal(generationData.difficulty);
    });
    
    // Test: List user challenges
    it('should list challenges for the current user with correct filtering', async function() {
      // Skip if no auth token is available
      if (!authToken) {
        this.skip();
      }
      
      // Ensure we have at least one challenge by using the ID from the previous test
      if (!generatedChallengeId) {
        this.skip();
      }
      
      // Get user challenges
      const listResponse = await apiRequest('get', 'api/v1/challenges', null, authToken);
      
      // Verify list response
      expect(listResponse.status).to.equal(200);
      expect(listResponse.data.success).to.be.true;
      expect(listResponse.data.data).to.be.an('array');
      
      // Verify the list contains our generated challenge
      const challenges = listResponse.data.data;
      const foundChallenge = challenges.find(c => c.id === generatedChallengeId);
      expect(foundChallenge).to.exist;
      
      // Verify the challenge belongs to the current user
      expect(foundChallenge.userId).to.equal(testUser.id);
    });
    
    // Test: Generate a challenge with a specific focus area
    it('should generate a challenge for a specific focus area and verify the linkage', async function() {
      // Skip if no auth token is available
      if (!authToken) {
        this.skip();
      }
      
      // First, generate a focus area
      const focusAreaData = {
        name: "Test Focus Area " + Date.now(),
        description: "A test focus area for challenge generation testing"
      };
      
      // Generate the focus area
      const focusAreaResponse = await apiRequest('post', 'api/v1/focus-areas/generate', focusAreaData, authToken);
      
      // Verify focus area generation response
      expect(focusAreaResponse.status).to.equal(200);
      expect(focusAreaResponse.data.success).to.be.true;
      expect(focusAreaResponse.data.data).to.exist;
      
      // Save focus area data
      const focusArea = focusAreaResponse.data.data;
      expect(focusArea.id).to.be.a('string');
      generatedFocusAreaId = focusArea.id;
      
      // Challenge generation data with the specific focus area
      const generationData = {
        category: 'communication',
        difficulty: 'easy',
        focusArea: focusArea.id
      };
      
      // Generate the challenge with the focus area
      const challengeResponse = await apiRequest('post', 'api/v1/challenges/generate', generationData, authToken);
      
      // Verify challenge generation response
      expect(challengeResponse.status).to.equal(200);
      expect(challengeResponse.data.success).to.be.true;
      expect(challengeResponse.data.data).to.exist;
      
      // Save challenge data
      const challenge = challengeResponse.data.data;
      expect(challenge.id).to.be.a('string');
      focusAreaChallengeId = challenge.id;
      
      // Verify the challenge has the correct focus area
      expect(challenge.focusArea).to.equal(focusArea.id);
      
      // Retrieve the challenge to verify persistence
      const retrieveResponse = await apiRequest('get', `api/v1/challenges/${focusAreaChallengeId}`, null, authToken);
      
      // Verify the retrieved challenge has the correct focus area
      expect(retrieveResponse.status).to.equal(200);
      expect(retrieveResponse.data.data.focusArea).to.equal(focusArea.id);
    });
  });
}); 