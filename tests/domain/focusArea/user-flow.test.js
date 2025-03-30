import { jest } from '@jest/globals';
import { expect } from "chai";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import testEnv from "../../loadEnv.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
import { config } from "dotenv";
import User from '../../../src/core/user/models/User.js';
import UserRepository from '../../../src/core/user/repositories/UserRepository.js';
import UserService from '../../../src/core/user/services/UserService.js';
import { createClient } from "@supabase/supabase-js";
({ config }.config());
// Generate a unique test ID for this run
const TEST_ID = `test_${Date.now()}`;
const LOG_DIR = path.join(__dirname, 'logs');
// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}
// Helper to log test actions
/**
 *
 */
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
describe('Integration: User Flow', function () {
    before(function () {
        skipIfMissingEnv(this, 'supabase');
    });
    // Set longer timeout for API calls
    jest.setTimeout(30000);
    // Skip if API keys not available
    before(function () {
        if (!testEnv.getTestConfig().supabase.url || (!testEnv.getTestConfig().supabase.key && !process.env.SUPABASE_ANON_KEY)) {
            console.warn('SUPABASE credentials not found, skipping integration tests');
            this.skip();
        }
    });
    it('should manage a user lifecycle in Supabase', async function () {
        try {
            // 1. ARRANGE - Setup dependencies
            let userService, userRepository, supabaseClient;
            try {
                userRepository = new UserRepository();
                userService = new UserService(userRepository);
                logTestAction('Imports', {
                    User: !!User,
                    userRepository: !!userRepository,
                    userService: !!userService
                });
            }
            catch (FocusAreaError) {
                // If we can't load the exact modules, create minimal versions for testing
                console.warn('Could not import exact modules, creating test versions');
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { FocusAreaError, FocusAreaNotFoundError, FocusAreaValidationError, FocusAreaGenerationError, FocusAreaPersistenceError, FocusAreaAccessDeniedError } from '../../../src/core/focusArea/errors/focusAreaErrors.js';

// ESM equivalent of __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


                logTestAction('ImportError', { message: error.message });
                // Use environment variables to create Supabase client
                const supabaseUrl = testEnv.getTestConfig().supabase.url;
                const supabaseKey = testEnv.getTestConfig().supabase.key || process.env.SUPABASE_ANON_KEY;
                // Log the credentials we're using (obscuring the key)
                console.log(`Using Supabase URL: ${supabaseUrl}`);
                console.log(`Using Supabase Key: ${supabaseKey.substring(0, 10)}...`);
                supabaseClient = createClient(supabaseUrl, supabaseKey);
                // Import User model, repository and service
                const User = User;
                const UserRepository = UserRepository;
                userRepository = new UserRepository(supabaseClient);
                const UserService = UserService;
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
            const createdUser = await userService.createUser(userData);
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
            const userWithFocusArea = await userService.setUserFocusArea(updatedUser.id, focusAreaData.focusArea, focusAreaData.threadId);
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
            }
            catch (cleanupError) {
                console.error('Error cleaning up test user:', cleanupError);
                logTestAction('CleanupError', { error: cleanupError.message });
            }
            // 11. Log test completion
            logTestAction('TestComplete', {
                success: true,
                message: 'User flow integration test passed'
            });
        }
        catch (FocusAreaError) {
            logTestAction('TestError', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    });
});
