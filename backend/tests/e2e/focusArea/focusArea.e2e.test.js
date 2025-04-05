/**
 * Focus Area E2E Tests
 * 
 * Tests for generating, retrieving and persisting focus areas.
 * Validates that focus areas can be personalized based on user data
 * and are correctly stored in the database.
 */

import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { 
  apiRequest, 
  setupTestUser, 
  cleanupTestUser,
  verifySupabaseConnection
} from '../../helpers/apiTestHelper.js';
import { getTestConfig, hasRequiredVars } from '../../config/testConfig.js';

// Set timeout for API requests
const TIMEOUT = 15000;

/**
 * Skip test if missing required environment variables
 * @param {string[]} requiredVars 
 */
function skipIfMissingEnv(requiredVars) {
  if (!hasRequiredVars(requiredVars)) {
    console.warn(`Skipping tests due to missing environment variables: ${requiredVars.join(', ')}`);
    return true;
  }
  return false;
}

describe('Focus Area API - E2E Tests', function() {
  this.timeout(TIMEOUT);
  
  let testUser = null;
  let testUserToken = null;
  let focusAreaId = null;
  
  before(async function() {
    // Check for OpenAI API key
    if (skipIfMissingEnv(['openai.apiKey'])) {
      this.skip();
    }
    
    // Check Supabase connection
    if (!verifySupabaseConnection()) {
      console.warn('Supabase connection not available, skipping tests');
      this.skip();
    }
    
    // Create test user
    try {
      testUser = await setupTestUser();
      testUserToken = testUser.token;
      console.log(`Test user created: ${testUser.email}`);
    } catch (error) {
      console.error('Failed to set up test user:', error.message);
      throw error;
    }
  });
  
  after(async function() {
    // Clean up test user if created
    if (testUser && testUser.userId) {
      await cleanupTestUser(testUser.userId);
    }
  });
  
  it('should generate a personalized focus area', async function() {
    // Test data
    const personalityData = {
      openness: 0.8,
      conscientiousness: 0.7,
      extraversion: 0.6,
      agreeableness: 0.9,
      neuroticism: 0.3
    };
    
    // First, set personality data
    const personalityResponse = await apiRequest({
      method: 'POST',
      endpoint: '/api/v1/user/personality',
      data: personalityData,
      token: testUserToken
    });
    
    expect(personalityResponse.status).to.equal(200);
    
    // Now generate a focus area
    const response = await apiRequest({
      method: 'POST',
      endpoint: '/api/v1/focus-areas/generate',
      data: {
        interests: ['coding', 'music', 'hiking'],
        preferredLearningStyle: 'visual',
        skillLevel: 'intermediate'
      },
      token: testUserToken
    });
    
    expect(response.status).to.equal(201);
    expect(response.data).to.have.property('id');
    expect(response.data).to.have.property('title');
    expect(response.data).to.have.property('description');
    expect(response.data).to.have.property('skills');
    expect(response.data.skills).to.be.an('array');
    
    // Save the focus area ID for later tests
    focusAreaId = response.data.id;
  });
  
  it('should retrieve a generated focus area', async function() {
    // Skip if the previous test didn't create a focus area
    if (!focusAreaId) {
      this.skip();
    }
    
    const response = await apiRequest({
      method: 'GET',
      endpoint: `/api/v1/focus-areas/${focusAreaId}`,
      token: testUserToken
    });
    
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('id', focusAreaId);
    expect(response.data).to.have.property('title');
    expect(response.data).to.have.property('description');
    expect(response.data).to.have.property('skills');
  });
  
  it('should list all user focus areas', async function() {
    const response = await apiRequest({
      method: 'GET',
      endpoint: '/api/v1/focus-areas',
      token: testUserToken
    });
    
    expect(response.status).to.equal(200);
    expect(response.data).to.be.an('array');
    
    // Should include the created focus area
    if (focusAreaId) {
      const found = response.data.some(item => item.id === focusAreaId);
      expect(found).to.be.true;
    }
  });
  
  it('should update a focus area', async function() {
    // Skip if no focus area was created
    if (!focusAreaId) {
      this.skip();
    }
    
    const newTitle = `Updated Focus Area ${uuidv4().slice(0, 8)}`;
    
    const response = await apiRequest({
      method: 'PATCH',
      endpoint: `/api/v1/focus-areas/${focusAreaId}`,
      data: {
        title: newTitle
      },
      token: testUserToken
    });
    
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('title', newTitle);
    
    // Verify the update persisted
    const checkResponse = await apiRequest({
      method: 'GET',
      endpoint: `/api/v1/focus-areas/${focusAreaId}`,
      token: testUserToken
    });
    
    expect(checkResponse.status).to.equal(200);
    expect(checkResponse.data).to.have.property('title', newTitle);
  });
});
