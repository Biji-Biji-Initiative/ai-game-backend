/**
 * E2E Test: User Management API
 * 
 * Tests the user management API endpoints that interact with Supabase.
 * This test makes real HTTP requests to the API.
 */

const { expect } = require('chai');
const axios = require('axios');
const crypto = require('crypto');

const { skipIfMissingEnv } = require('../../helpers/testHelpers');
require('dotenv').config();

// Import API test helper for authentication and setup
const apiTestHelper = require('../../helpers/apiTestHelper');

// Timeout for API requests
const API_TIMEOUT = 30000;

// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

// Generate a unique test ID
const TEST_ID = `test_${Date.now()}`;

describe('E2E: User Management API', function() {
  
  
  // Set longer timeout for API calls
  this.timeout(30000);

  before(function() {
    skipIfMissingEnv(this, 'supabase');
  });

  // Configure longer timeout for E2E tests
  this.timeout(API_TIMEOUT);
  
  // Skip if API URLs not available
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
  let testUserId;
  
  before(async function() {
    // Set up test user and auth token
    try {
      // Create a new test user for this run
      const uniqueEmail = `test-user-${TEST_ID}@example.com`;
      
      testUser = await apiTestHelper.setupTestUser({
        email: uniqueEmail,
        password: 'Test1234!',
        fullName: 'E2E Test User'
      });
      
      console.log(`Test user created: ${testUser.email}`);
      testUserId = testUser.id;
      
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
      // Delete test user if it exists
      if (testUserId) {
        await apiTestHelper.apiRequest('delete', `/users/${testUserId}`, null, authToken);
        console.log(`Test user deleted: ${testUserId}`);
      }
    } catch (error) {
      console.warn('Failed to clean up test data:', error.message);
    }
  });
  
  describe('User API Flow', function() {
    it('should get current user profile', async function() {
      // Skip if no auth token is available
      if (!authToken) {
        this.skip();
      }
      
      const response = await apiTestHelper.apiRequest('get', '/users/me', null, authToken);
      
      // Verify the response
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.exist;
      
      const user = response.data.data;
      expect(user.id).to.equal(testUserId);
      expect(user.email).to.equal(testUser.email);
      
      console.log('Successfully retrieved user profile');
    });
    
    it('should update user profile', async function() {
      // Skip if no auth token is available
      if (!authToken) {
        this.skip();
      }
      
      const updateData = {
        professionalTitle: 'Software Engineer',
        location: 'Test City'
      };
      
      const response = await apiTestHelper.apiRequest('put', `/users/${testUserId}`, updateData, authToken);
      
      // Verify the response
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.exist;
      
      const updatedUser = response.data.data;
      expect(updatedUser.id).to.equal(testUserId);
      expect(updatedUser.professionalTitle).to.equal(updateData.professionalTitle);
      expect(updatedUser.location).to.equal(updateData.location);
      
      console.log('Successfully updated user profile');
    });
    
    it('should set user focus area', async function() {
      // Skip if no auth token is available
      if (!authToken) {
        this.skip();
      }
      
      const focusAreaData = {
        focusArea: 'Software Development',
        threadId: `thread_${crypto.randomUUID()}`
      };
      
      const response = await apiTestHelper.apiRequest(
        'put', 
        `/users/${testUserId}/focus-area`, 
        focusAreaData, 
        authToken
      );
      
      // Verify the response
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.exist;
      
      const updatedUser = response.data.data;
      expect(updatedUser.id).to.equal(testUserId);
      expect(updatedUser.focusArea).to.equal(focusAreaData.focusArea);
      expect(updatedUser.focusAreaThreadId).to.equal(focusAreaData.threadId);
      
      console.log('Successfully set user focus area');
    });
    
    it('should update personality traits', async function() {
      // Skip if no auth token is available
      if (!authToken) {
        this.skip();
      }
      
      const traitsData = {
        personalityTraits: {
          openness: 8,
          conscientiousness: 7,
          extraversion: 6,
          agreeableness: 9,
          neuroticism: 4
        }
      };
      
      const response = await apiTestHelper.apiRequest(
        'put', 
        `/users/${testUserId}/personality`, 
        traitsData, 
        authToken
      );
      
      // Verify the response
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.exist;
      
      const updatedUser = response.data.data;
      expect(updatedUser.id).to.equal(testUserId);
      expect(updatedUser.personalityTraits).to.deep.include(traitsData.personalityTraits);
      
      console.log('Successfully updated personality traits');
    });
    
    it('should get user by ID', async function() {
      // Skip if no auth token is available
      if (!authToken) {
        this.skip();
      }
      
      const response = await apiTestHelper.apiRequest('get', `/users/${testUserId}`, null, authToken);
      
      // Verify the response
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.exist;
      
      const user = response.data.data;
      expect(user.id).to.equal(testUserId);
      expect(user.email).to.equal(testUser.email);
      expect(user.focusArea).to.equal('Software Development');
      
      console.log('Successfully retrieved user by ID');
    });
  });
}); 