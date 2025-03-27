/**
 * Integration Test: User Flow
 * 
 * This test verifies the complete flow for the User domain:
 * 1. Create a user in Supabase
 * 2. Update user details
 * 3. Set a focus area
 * 4. Delete test user
 */

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
require('dotenv').config();

// Generate a unique test ID for this run
const TEST_ID = `test_${Date.now()}`;
const LOG_DIR = path.join(__dirname, 'logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Helper to log test actions
function logTestAction(action, data) {
  const timestamp = new Date().toISOString();
  const logFile = path.join(LOG_DIR, `user_test_${timestamp.replace(/[:.]/g, '-')}.json`);
  
  fs.writeFileSync(logFile, JSON.stringify({
    timestamp,
    testId: TEST_ID,
    action,
    data
  }, null, 2));
  
  console.log(`[${timestamp}] ${action}: `, data);
}

describe('Integration: User Flow', function() {
  // Set longer timeout for API calls
  this.timeout(30000);
  
  // Skip if API keys not available
  before(function() {
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_KEY && !process.env.SUPABASE_ANON_KEY)) {
      console.warn('SUPABASE credentials not found, skipping integration tests');
      this.skip();
    }
  });
  
  it('should manage a user lifecycle in Supabase', async function() {
    try {
      // 1. ARRANGE - Setup dependencies
      let userService, userRepository, supabaseClient;
      
      try {
        // Try to import domain models and services
        const User = require('../../src/core/user/models/User');
        const UserRepository = require('../../src/core/user/repositories/UserRepository');
        const UserService = require('../../src/core/user/services/UserService');
        
        userRepository = new UserRepository();
        userService = new UserService(userRepository);
        
        logTestAction('Imports', {
          User: !!User,
          userRepository: !!userRepository,
          userService: !!userService
        });
      } catch (error) {
        // If we can't load the exact modules, create minimal versions for testing
        console.warn('Could not import exact modules, creating test versions');
        logTestAction('ImportError', { message: error.message });
        
        // Use environment variables to create Supabase client
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
        
        // Log the credentials we're using (obscuring the key)
        console.log(`Using Supabase URL: ${supabaseUrl}`);
        console.log(`Using Supabase Key: ${supabaseKey.substring(0, 10)}...`);
        
        // Create Supabase client
        const { createClient } = require('@supabase/supabase-js');
        supabaseClient = createClient(
          supabaseUrl,
          supabaseKey
        );
        
        // Import User model, repository and service
        const User = require('../../src/core/user/models/User');
        const UserRepository = require('../../src/core/user/repositories/UserRepository');
        userRepository = new UserRepository(supabaseClient);
        
        const UserService = require('../../src/core/user/services/UserService');
        userService = new UserService(userRepository);
      }
      
      // 2. ACT - Create a test user
      logTestAction('StartTest', { testId: TEST_ID });
      
      // Generate a unique email to prevent conflicts
      const testEmail = `test-user-${crypto.randomUUID()}@example.com`;
      
      // Create user data
      const userData = {
        email: testEmail,
        fullName: 'Test User'
      };
      
      // Create the user
      let createdUser = await userService.createUser(userData);
      
      logTestAction('UserCreated', {
        id: createdUser.id,
        email: createdUser.email,
        fullName: createdUser.fullName,
        createdAt: createdUser.createdAt
      });
      
      // 3. ASSERT - Verify user creation
      expect(createdUser).to.exist;
      expect(createdUser.id).to.be.a('string');
      expect(createdUser.email).to.equal(testEmail);
      expect(createdUser.fullName).to.equal('Test User');
      
      // 4. ACT - Update user profile
      const updates = {
        professionalTitle: 'Senior Software Engineer',
        location: 'Updated City',
        personalityTraits: {
          ...createdUser.personalityTraits,
          openness: 9
        }
      };
      
      const updatedUser = await userService.updateUser(createdUser.id, updates);
      
      logTestAction('UserUpdated', {
        id: updatedUser.id,
        professionalTitle: updatedUser.professionalTitle,
        location: updatedUser.location,
        personalityTraits: updatedUser.personalityTraits
      });
      
      // 5. ASSERT - Verify user update
      expect(updatedUser.professionalTitle).to.equal('Senior Software Engineer');
      expect(updatedUser.location).to.equal('Updated City');
      expect(updatedUser.personalityTraits.openness).to.equal(9);
      
      // 6. ACT - Set user focus area
      const focusAreaData = {
        focusArea: 'Machine Learning',
        threadId: `thread_${crypto.randomUUID()}`
      };
      
      const userWithFocusArea = await userService.setUserFocusArea(
        updatedUser.id,
        focusAreaData.focusArea,
        focusAreaData.threadId
      );
      
      logTestAction('FocusAreaSet', {
        id: userWithFocusArea.id,
        focusArea: userWithFocusArea.focusArea,
        focusAreaThreadId: userWithFocusArea.focusAreaThreadId
      });
      
      // 7. ASSERT - Verify focus area update
      expect(userWithFocusArea.focusArea).to.equal('Machine Learning');
      expect(userWithFocusArea.focusAreaThreadId).to.equal(focusAreaData.threadId);
      
      // 8. ACT - Retrieve user by ID
      const retrievedUser = await userService.getUserById(createdUser.id);
      
      logTestAction('UserRetrieved', {
        id: retrievedUser.id,
        email: retrievedUser.email,
        focusArea: retrievedUser.focusArea
      });
      
      // 9. ASSERT - Verify user retrieval
      expect(retrievedUser).to.exist;
      expect(retrievedUser.id).to.equal(createdUser.id);
      expect(retrievedUser.email).to.equal(testEmail);
      expect(retrievedUser.focusArea).to.equal('Machine Learning');
      
      // 10. CLEAN UP - Delete the test user
      try {
        const deleteResult = await userService.deleteUser(createdUser.id);
        
        logTestAction('UserDeleted', {
          id: createdUser.id,
          success: deleteResult
        });
        
        expect(deleteResult).to.be.true;
      } catch (cleanupError) {
        console.error('Error cleaning up test user:', cleanupError);
        logTestAction('CleanupError', { error: cleanupError.message });
      }
      
      // 11. Log test completion
      logTestAction('TestComplete', {
        success: true,
        message: 'User flow integration test passed'
      });
      
    } catch (error) {
      logTestAction('TestError', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  });
}); 