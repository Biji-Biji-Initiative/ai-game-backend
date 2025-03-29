/**
 * Focus Area E2E Tests
 * 
 * End-to-end tests for focus area API endpoints, testing with real HTTP requests.
 */

const { expect } = require('chai');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');


const testEnv = require('../../loadEnv');

const { skipIfMissingEnv } = require('../../helpers/testHelpers');
// Import API test helper for authentication and setup
const apiTestHelper = require('../../helpers/apiTestHelper');

// Timeout for API requests
const API_TIMEOUT = 30000;

// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

describe('E2E: Focus Area API', function() {
  
  
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
  let focusAreaId;
  
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
      // Delete focus area if it exists
      if (focusAreaId) {
        await apiClient.delete(`/api/focus-areas/${focusAreaId}`);
        console.log(`Focus area deleted: ${focusAreaId}`);
      }
      
      // Clean up test user
      await apiTestHelper.cleanupTestUser(testUser.id);
      console.log(`Test user cleaned up: ${testUser.email}`);
    } catch (error) {
      console.warn('Failed to clean up test data:', error.message);
    }
  });
  
  describe('Focus Area Recommendations', function() {
    it('should generate a focus area recommendation based on user profile', async function() {
      // User profile data
      const profileData = {
        professionalTitle: 'Product Manager',
        interests: ['AI ethics', 'Product development', 'User experience'],
        skills: ['Project management', 'Data analysis', 'Team leadership']
      };
      
      // Make API request
      const response = await apiClient.post('/api/focus-areas/recommend', profileData);
      
      // Verify response
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.exist;
      
      // Save focus area ID for later
      focusAreaId = response.data.data.id;
      
      // Verify focus area format
      const focusArea = response.data.data;
      expect(focusArea.name).to.be.a('string').and.not.empty;
      expect(focusArea.description).to.be.a('string').and.not.empty;
      expect(focusArea.skills).to.be.an('array').and.not.empty;
      expect(focusArea.userId).to.equal(testUser.id);
    });
    
    it('should retrieve focus areas for the current user', async function() {
      // Skip if no focus area was created
      if (!focusAreaId) {
        this.skip();
      }
      
      // Make API request
      const response = await apiClient.get('/api/focus-areas');
      
      // Verify response
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.be.an('array');
      
      // Verify the focus area we created is in the list
      const focusAreas = response.data.data;
      const createdFocusArea = focusAreas.find(fa => fa.id === focusAreaId);
      expect(createdFocusArea).to.exist;
    });
    
    it('should retrieve a specific focus area by ID', async function() {
      // Skip if no focus area was created
      if (!focusAreaId) {
        this.skip();
      }
      
      // Make API request
      const response = await apiClient.get(`/api/focus-areas/${focusAreaId}`);
      
      // Verify response
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.exist;
      
      // Verify focus area details
      const focusArea = response.data.data;
      expect(focusArea.id).to.equal(focusAreaId);
      expect(focusArea.skills).to.be.an('array');
    });
  });
  
  describe('Focus Area Challenge Integration', function() {
    it('should generate challenges for a focus area', async function() {
      // Skip if no focus area was created
      if (!focusAreaId) {
        this.skip();
      }
      
      // Make API request to generate challenges
      const response = await apiClient.post(`/api/focus-areas/${focusAreaId}/challenges`, {
        count: 1,
        difficulty: 'medium'
      });
      
      // Verify response
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.be.an('array');
      
      // Verify challenge format
      if (response.data.data.length > 0) {
        const challenge = response.data.data[0];
        expect(challenge.id).to.exist;
        expect(challenge.title).to.be.a('string');
        expect(challenge.focusArea).to.equal(focusAreaId);
        expect(challenge.userId).to.equal(testUser.id);
      }
    });
  });
}); 