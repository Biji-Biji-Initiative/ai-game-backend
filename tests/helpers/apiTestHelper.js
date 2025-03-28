/**
 * API Test Helper
 * 
 * Common utilities for API testing with real external services.
 */

const { randomUUID } = require('crypto');
const axios = require('axios');
const { supabaseClient, supabaseAdmin } = require('../../src/core/infra/db/supabaseClient');
const testEnv = require('../loadEnv');
const { v4: uuidv4 } = require('uuid');

// Initialize test environment
const env = testEnv.getTestConfig();

/**
 * Generate a unique test identifier for isolating test data
 * @returns {string} A UUID prefixed with "test-"
 */
function generateTestId() {
  return `test-${randomUUID()}`;
}

/**
 * Create a test user with Supabase Auth and database entry
 * @returns {Promise<Object>} Created test user data including auth credentials
 */
const setupTestUser = async () => {
  // Use the existing test user instead of creating a new one
  const testUser = {
    id: 'a46bfa50-d4a1-408c-bbcc-faed77fc7d2a',
    email: 'testuser@test.com',
    password: 'Test1234!',
    full_name: 'Test User',
    professional_title: 'Software Engineer',
    location: 'San Francisco',
    country: 'USA',
    focus_area: 'Testing'
  };
  
  console.log(`Using existing test user: ${testUser.id}`);
  
  return testUser;
};

/**
 * Get an auth token for a test user
 * @param {string} email - Test user email
 * @param {string} password - Test user password
 * @returns {Promise<string>} JWT auth token
 */
async function getAuthToken(email, password) {
  if (email === 'testuser@test.com') {
    // Get a fresh token by authenticating with the known credentials
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Error signing in:', error);
        throw error;
      }
      
      console.log('Obtained fresh auth token for test user');
      return data.session.access_token;
    } catch (err) {
      console.error('Exception getting auth token:', err);
      throw err;
    }
  } else {
    // For other users, use the standard flow
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Error signing in:', error);
        throw error;
      }
      
      return data.session.access_token;
    } catch (err) {
      console.error('Exception getting auth token:', err);
      throw err;
    }
  }
}

/**
 * Delete test user and all related data
 * @param {string} userId - ID of the test user to clean up
 */
async function cleanupTestUser(userId) {
  // In this scenario, we don't want to actually delete the test user
  console.log(`Skipping cleanup for test user: ${userId}`);
  return;
}

/**
 * Make authenticated API request
 * @param {string} method - HTTP method (get, post, put, delete)
 * @param {string} endpoint - API endpoint path
 * @param {Object} data - Request body data
 * @param {string} token - Auth token
 * @returns {Promise<Object>} API response
 */
async function apiRequest(method, endpoint, data = null, token) {
  try {
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    let response;
    const url = `${env.API_URL}/${endpoint.replace(/^\//, '')}`;
    
    switch (method.toLowerCase()) {
      case 'get':
        response = await axios.get(url, config);
        break;
      case 'post':
        response = await axios.post(url, data, config);
        break;
      case 'put':
        response = await axios.put(url, data, config);
        break;
      case 'delete':
        response = await axios.delete(url, config);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
    
    return response;
  } catch (error) {
    // Return the error response if available
    if (error.response) {
      return error.response;
    }
    throw error;
  }
}

/**
 * Set up an API client for E2E testing
 * Creates a test user, gets an auth token, and creates a configured axios instance
 * @returns {Promise<Object>} Object containing apiClient, testUser, and authToken
 */
async function setupApiClient() {
  try {
    // Set up test user
    const testUser = await setupTestUser();
    
    // Get auth token
    const authToken = await getAuthToken(testUser.email, testUser.password);
    
    // Create axios instance with auth headers
    const baseURL = env.API_URL || 'http://localhost:3000';
    const apiClient = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      apiClient,
      testUser,
      authToken
    };
  } catch (error) {
    console.error('Error setting up API client:', error);
    throw error;
  }
}

module.exports = {
  generateTestId,
  setupTestUser,
  getAuthToken,
  cleanupTestUser,
  apiRequest,
  setupApiClient
}; 