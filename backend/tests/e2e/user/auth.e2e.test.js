/**
 * E2E Tests for User Authentication Lifecycle
 *
 * This test suite covers the complete authentication flow:
 * - User signup
 * - Login
 * - Getting the user profile with auth token
 * - Refreshing the auth token
 * - Logout
 * - Error scenarios for each step
 */
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { setupTestUser, getAuthToken, apiRequest } from '../../helpers/apiTestHelper.js';
import { UserDTO } from "../../../src/core/user/dtos/UserDTO.js";

describe('Authentication Lifecycle E2E Tests', function() {
  // Increase timeout for real API calls
  this.timeout(15000);
  
  // Variables to store test data
  let testUser;
  let authToken;
  let refreshToken;
  
  before(async function() {
    // Set up the test user using the helper
    testUser = await setupTestUser();
    // We'll get a fresh token in each relevant test
  });
  
  describe('User Signup Flow', function() {
    it('should create a new user account with valid data', async function() {
      // Generate unique email to avoid conflicts
      const uniqueEmail = `test-signup-${uuidv4()}@example.com`;
      const signupData = {
        email: uniqueEmail,
        password: 'SecurePassword123!',
        fullName: 'Signup Test User'
      };
      
      // Make signup request
      const response = await apiRequest('post', 'api/v1/auth/signup', signupData);
      
      // Verify successful signup
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.exist;
      
      // Verify response structure (token and user data)
      expect(response.data.data.token).to.be.a('string');
      expect(response.data.data.user).to.exist;
      expect(response.data.data.user.email).to.equal(uniqueEmail);
      expect(response.data.data.user.fullName).to.equal('Signup Test User');
      expect(response.data.data.user.id).to.be.a('string');
    });
    
    it('should reject signup with existing email', async function() {
      // Try to sign up with the same email as our test user
      const signupData = {
        email: testUser.email,
        password: 'AnotherPassword123!',
        fullName: 'Duplicate User'
      };
      
      // Make signup request
      const response = await apiRequest('post', 'api/v1/auth/signup', signupData);
      
      // Verify error response - should be 409 Conflict or 400 Bad Request
      expect(response.status).to.equal(409); // Can be adjusted based on actual implementation
      expect(response.data.success).to.be.false;
      expect(response.data.message).to.include('email');
    });
    
    it('should reject signup with invalid data', async function() {
      // Try to sign up with invalid data (missing required field)
      const signupData = {
        email: `test-invalid-${uuidv4()}@example.com`,
        // Missing password
        fullName: 'Invalid User'
      };
      
      // Make signup request
      const response = await apiRequest('post', 'api/v1/auth/signup', signupData);
      
      // Verify validation error
      expect(response.status).to.equal(400);
      expect(response.data.success).to.be.false;
    });
  });
  
  describe('User Login Flow', function() {
    it('should login successfully with valid credentials', async function() {
      // Get a fresh token
      authToken = await getAuthToken(testUser.email, testUser.password);
      
      // Verify we got a token
      expect(authToken).to.be.a('string');
      expect(authToken).to.have.length.above(20);
    });
    
    it('should return token and user object on successful login', async function() {
      // Make direct login request to verify response structure
      const loginData = {
        email: testUser.email,
        password: testUser.password
      };
      
      const response = await apiRequest('post', 'api/v1/auth/login', loginData);
      
      // Verify successful login response
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.exist;
      
      // Verify response structure
      expect(response.data.data.token).to.be.a('string');
      expect(response.data.data.user).to.exist;
      expect(response.data.data.user.id).to.equal(testUser.id);
      expect(response.data.data.user.email).to.equal(testUser.email);
      
      // Save tokens for subsequent tests
      authToken = response.data.data.token;
      if (response.data.data.refreshToken) {
        refreshToken = response.data.data.refreshToken;
      }
    });
    
    it('should reject login with invalid credentials', async function() {
      // Make login request with wrong password
      const response = await apiRequest('post', 'api/v1/auth/login', {
        email: testUser.email,
        password: 'WrongPassword123!'
      });
      
      // Verify error response - should be 401 Unauthorized
      expect(response.status).to.equal(401, 'Response should indicate unauthorized for invalid credentials');
      expect(response.data.success).to.be.false;
    });
    
    it('should reject login with non-existent email', async function() {
      // Make login request with non-existent email
      const response = await apiRequest('post', 'api/v1/auth/login', {
        email: `nonexistent-${uuidv4()}@example.com`,
        password: testUser.password
      });
      
      // Verify error response - should be 401 Unauthorized
      expect(response.status).to.equal(401, 'Response should indicate unauthorized for non-existent email');
      expect(response.data.success).to.be.false;
    });
  });
  
  describe('User Profile Access', function() {
    before(async function() {
      // Ensure we have a valid token for these tests
      if (!authToken) {
        authToken = await getAuthToken(testUser.email, testUser.password);
      }
    });
    
    it('should return user profile with valid token', async function() {
      // Make profile request with token
      const response = await apiRequest('get', 'api/v1/users/me', null, authToken);
      
      // Verify successful response
      expect(response.status).to.equal(200, 'Response should be 200 OK');
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('user');
      
      // Verify user data
      const userDto = response.data.data.user;
      expect(userDto.id).to.equal(testUser.id);
      expect(userDto.email).to.equal(testUser.email);
      
      // Validate DTO structure
      const validatedDto = new UserDTO(userDto);
      expect(validatedDto).to.be.instanceOf(UserDTO);
    });
    
    it('should reject profile access without token', async function() {
      // Make profile request without token
      const response = await apiRequest('get', 'api/v1/users/me');
      
      // Verify error response - should be 401 Unauthorized
      expect(response.status).to.equal(401, 'Response should indicate unauthorized');
      expect(response.data.success).to.be.false;
    });
    
    it('should reject profile access with invalid token', async function() {
      // Make profile request with invalid token
      const response = await apiRequest('get', 'api/v1/users/me', null, 'invalid-token');
      
      // Verify error response - should be 401 Unauthorized
      expect(response.status).to.equal(401, 'Response should indicate unauthorized');
      expect(response.data.success).to.be.false;
    });
  });
  
  describe('Token Refresh Flow', function() {
    before(async function() {
      // We need to get both access token and refresh token if we don't have them
      if (!authToken || !refreshToken) {
        // Make login request to get both tokens
        const loginData = {
          email: testUser.email,
          password: testUser.password
        };
        
        const response = await apiRequest('post', 'api/v1/auth/login', loginData);
        
        if (response.status !== 200 || !response.data.data) {
          console.warn('Unable to get tokens for refresh test');
          this.skip();
          return;
        }
        
        authToken = response.data.data.token;
        refreshToken = response.data.data.refreshToken;
        
        if (!refreshToken) {
          console.warn('No refresh token available in login response, skipping refresh token tests');
          this.skip();
        }
      }
    });
    
    it('should refresh token successfully using API endpoint', async function() {
      // Skip if we don't have a refresh token
      if (!refreshToken) {
        this.skip();
        return;
      }
      
      // Make token refresh request
      const response = await apiRequest('post', 'api/v1/auth/refresh', {
        refreshToken: refreshToken
      });
      
      // Verify successful response
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.exist;
      expect(response.data.data.token).to.be.a('string');
      
      // Save the new token
      const newAuthToken = response.data.data.token;
      
      // Verify the new token works by making a protected request
      const profileResponse = await apiRequest('get', 'api/v1/users/me', null, newAuthToken);
      expect(profileResponse.status).to.equal(200);
      expect(profileResponse.data.success).to.be.true;
    });
  });
  
  describe('Logout Flow', function() {
    before(async function() {
      // Ensure we have a valid token for these tests
      if (!authToken) {
        authToken = await getAuthToken(testUser.email, testUser.password);
      }
    });
    
    it('should log out successfully and invalidate the token', async function() {
      // Make logout request
      const response = await apiRequest('post', 'api/v1/auth/logout', {}, authToken);
      
      // Verify successful response
      expect(response.status).to.equal(200, 'Response should indicate successful logout');
      expect(response.data.success).to.be.true;
      
      // Verify token is invalidated by trying to access a protected endpoint
      const profileResponse = await apiRequest('get', 'api/v1/users/me', null, authToken);
      expect(profileResponse.status).to.equal(401, 'Token should be invalidated after logout');
      expect(profileResponse.data.success).to.be.false;
    });
  });
}); 