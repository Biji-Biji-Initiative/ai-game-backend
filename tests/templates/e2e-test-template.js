/**
 * E2E Test Template
 * 
 * This file serves as a template for creating end-to-end tests that
 * interact with the application through its API endpoints. These tests
 * simulate real user workflows.
 * 
 * To use this template:
 * 1. Copy to the e2e directory
 * 2. Rename to match the workflow being tested (e.g., userLifecycle.e2e.test.js)
 * 3. Modify the imports, setup, and test cases as needed
 */

const { expect } = require('chai');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Import API test helper for authentication and setup
const apiTestHelper = require('../helpers/apiTestHelper');

// Timeout for API requests (30 seconds)
const API_TIMEOUT = 30000;

describe('E2E: Workflow Name', function() {
  // Configure longer timeout for E2E tests
  this.timeout(API_TIMEOUT);
  
  // Test variables
  let apiClient;
  let testUser;
  let authToken;
  
  before(async function() {
    // Skip tests if required environment variables are missing
    if (!process.env.API_BASE_URL) {
      console.warn('API_BASE_URL not set, skipping E2E tests');
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
      await apiTestHelper.cleanupTestUser(testUser.id);
      console.log(`Test user cleaned up: ${testUser.email}`);
    } catch (error) {
      console.warn('Failed to clean up test user:', error.message);
    }
  });
  
  describe('First Step in Workflow', function() {
    it('should successfully complete the first step', async function() {
      // ARRANGE - Prepare test data
      const testData = {
        // Test data specific to this step
      };
      
      // ACT - Make API request
      const response = await apiClient.post('/some-endpoint', testData);
      
      // ASSERT - Verify response
      expect(response.status).to.equal(200);
      expect(response.data).to.exist;
      expect(response.data.success).to.be.true;
      
      // Save response data for next steps if needed
      // this.someId = response.data.id;
    });
  });
  
  describe('Second Step in Workflow', function() {
    it('should successfully complete the second step', async function() {
      // ARRANGE - Ensure first step was completed
      // Skip if first step failed (optional)
      // if (!this.someId) this.skip();
      
      // ACT - Make API request
      const response = await apiClient.get('/some-endpoint');
      
      // ASSERT - Verify response
      expect(response.status).to.equal(200);
      expect(response.data).to.exist;
    });
    
    it('should handle edge cases correctly', async function() {
      // Test error scenarios or edge cases
      try {
        await apiClient.post('/some-endpoint', { invalid: 'data' });
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Verify the error
        expect(error.response.status).to.equal(400);
        expect(error.response.data.error).to.exist;
      }
    });
  });
  
  describe('Complete Workflow', function() {
    it('should successfully complete the entire workflow', async function() {
      // This test can simulate a full user journey through multiple API calls
      
      // Step 1: Initialize
      const initResponse = await apiClient.post('/workflow/init', {
        // Initialization data
      });
      
      expect(initResponse.status).to.equal(200);
      const workflowId = initResponse.data.id;
      
      // Step 2: Execute action
      const actionResponse = await apiClient.post(`/workflow/${workflowId}/action`, {
        // Action data
      });
      
      expect(actionResponse.status).to.equal(200);
      
      // Step 3: Complete
      const completeResponse = await apiClient.post(`/workflow/${workflowId}/complete`);
      
      expect(completeResponse.status).to.equal(200);
      expect(completeResponse.data.status).to.equal('completed');
    });
  });
}); 