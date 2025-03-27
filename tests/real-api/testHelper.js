/**
 * Real API Test Helper
 * 
 * Provides setup and teardown functionality for tests that use real API calls.
 * Ensures we're using the actual architecture with real API dependencies.
 */

// Load environment variables
require('dotenv').config();

const { randomUUID } = require('crypto');
const logger = require('../../src/utils/logger');
const responsesApiClient = require('../../src/utils/api/responsesApiClient');
const supabaseClient = require('../../src/utils/api/supabaseClient');

// Configure logger for tests
if (logger.configure) {
  logger.configure({
    level: process.env.TEST_LOG_LEVEL || 'error',
    silent: process.env.NODE_ENV === 'test'
  });
}

/**
 * Generate a unique test identifier for isolating test data
 * @returns {string} A UUID prefixed with "test-"
 */
function generateTestId() {
  return `test-${randomUUID()}`;
}

/**
 * Create a test user for API tests
 * @param {Object} userData - Base user data
 * @returns {Object} Created test user data including test-specific IDs
 */
async function createTestUser(userData = {}) {
  const testId = generateTestId();
  const email = userData.email || `${testId}@example.com`;
  
  const defaultUserData = {
    id: testId,
    email,
    fullName: userData.fullName || 'Test User',
    professionalTitle: userData.professionalTitle || 'Software Engineer',
    location: userData.location || 'Test City',
    personality_traits: userData.personality_traits || {
      analytical: 8,
      creative: 7,
      detail_oriented: 6,
      adaptable: 8,
      curious: 9
    },
    ai_attitudes: userData.ai_attitudes || {
      trust: 7,
      interest: 8,
      concern: 5,
      experience: 6,
      optimism: 7
    },
    created_at: new Date().toISOString()
  };
  
  // Create user in Supabase if needed
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .insert(defaultUserData)
        .select()
        .single();
        
      if (error) {
        console.error('Error creating test user in Supabase:', error);
      } else {
        console.log(`Created test user ${testId} in Supabase`);
        return data;
      }
    } catch (err) {
      console.error('Exception creating test user:', err);
    }
  }
  
  return defaultUserData;
}

/**
 * Creates a new thread for communication with Responses API
 * @returns {Promise<string>} Thread ID
 */
async function createThread() {
  try {
    const thread = await responsesApiClient.createThread();
    return thread.id;
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
}

/**
 * Delete test data after tests
 * @param {string} userId - ID of the test user to clean up
 */
async function cleanupTestData(userId) {
  if (!userId || !userId.startsWith('test-')) {
    console.warn('Refusing to delete non-test user:', userId);
    return;
  }
  
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    try {
      // Delete user data
      const { error: userError } = await supabaseClient
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (userError) {
        console.error('Error deleting test user:', userError);
      }
      
      // Delete associated focus areas
      const { error: focusAreaError } = await supabaseClient
        .from('focus_areas')
        .delete()
        .eq('user_id', userId);
      
      if (focusAreaError) {
        console.error('Error deleting test focus areas:', focusAreaError);
      }
      
      // Delete associated challenges
      const { error: challengeError } = await supabaseClient
        .from('challenges')
        .delete()
        .eq('user_id', userId);
      
      if (challengeError) {
        console.error('Error deleting test challenges:', challengeError);
      }
      
      console.log(`Cleaned up test data for user ${userId}`);
    } catch (err) {
      console.error('Exception cleaning up test data:', err);
    }
  }
}

module.exports = {
  generateTestId,
  createTestUser,
  createThread,
  cleanupTestData
}; 