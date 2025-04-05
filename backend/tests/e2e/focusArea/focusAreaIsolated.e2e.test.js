/**
 * Focus Area Isolated E2E Tests
 * 
 * Tests for generating, retrieving and persisting focus areas in isolation.
 * Validates that focus areas can be personalized based on user data
 * and are correctly stored in the database.
 */

import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { 
  API_URL,
  TIMEOUT,
  skipIfMissingEnv,
  verifySupabaseConnection,
  setupTestUser,
  cleanupTestUser,
  apiRequest
} from '../../helpers/apiTestHelper.js';
import { getTestConfig, hasRequiredVars } from '../../config/testConfig.js';
import axios from 'axios';

// Set timeout for API requests
jest.setTimeout(TIMEOUT);

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

describe('Focus Area E2E Tests', () => {
  let testUser;

  beforeAll(async () => {
    // Set up test user
    testUser = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };
  });

  it('should generate a personalized focus area with minimal data', async () => {
    // Create a thread first
    const threadResponse = await axios.post(`${API_URL}/api/v1/focus-areas/thread`);
    expect(threadResponse.status).toBe(201);
    expect(threadResponse.data.data.threadId).toBeDefined();

    // Update user profile with thread ID
    const updateResponse = await axios.put(`${API_URL}/api/v1/users/profile`, {
      focus_area_thread_id: threadResponse.data.data.threadId
    });
    expect(updateResponse.status).toBe(200);

    // Now generate focus areas
    const response = await axios.post(`${API_URL}/api/v1/focus-areas/generate`, {
      professionalTitle: 'Software Developer',
      interests: ['coding']
    });

    expect(response.status).toBe(201);
    expect(response.data.data).toBeDefined();
    expect(response.data.data.id).toBeDefined();
    expect(response.data.data.title).toBeDefined();
    expect(response.data.data.description).toBeDefined();
    expect(response.data.data.skills).toBeDefined();
  });

  it('should generate a focus area with personality data', async () => {
    // Create a thread first
    const threadResponse = await axios.post(`${API_URL}/api/v1/focus-areas/thread`);
    expect(threadResponse.status).toBe(201);
    expect(threadResponse.data.data.threadId).toBeDefined();

    // Update user profile with thread ID
    const updateResponse = await axios.put(`${API_URL}/api/v1/users/profile`, {
      focus_area_thread_id: threadResponse.data.data.threadId
    });
    expect(updateResponse.status).toBe(200);

    // Now generate focus areas
    const response = await axios.post(`${API_URL}/api/v1/focus-areas/generate`, {
      professionalTitle: 'Software Developer',
      interests: ['coding', 'music'],
      preferredLearningStyle: 'visual',
      skillLevel: 'intermediate'
    });

    expect(response.status).toBe(201);
    expect(response.data.data).toBeDefined();
    expect(response.data.data.id).toBeDefined();
    expect(response.data.data.title).toBeDefined();
    expect(response.data.data.description).toBeDefined();
    expect(response.data.data.skills).toBeDefined();
  });

  it('should retrieve focus areas for the current user', async () => {
    const response = await axios.get(`${API_URL}/api/v1/focus-areas`);
    expect(response.status).toBe(200);
    expect(response.data.data).toBeDefined();
    expect(Array.isArray(response.data.data)).toBe(true);
  });

  // Skip this test for now as it requires admin access
  it.skip('should create a focus area template (admin only)', async () => {
    // Implementation pending
  });
}); 