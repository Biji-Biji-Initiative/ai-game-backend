import { expect } from "chai";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import testEnv from "../../loadEnv.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { UserError, UserNotFoundError, UserUpdateError, UserValidationError, UserInvalidStateError, UserAuthenticationError, UserAuthorizationError } from "@/core/user/errors/UserErrors.js";
({ config }.config());
// Generate a unique test ID for this run
const TEST_ID = `test_${Date.now()}`;
describe('Integration: User Storage Workflow', function () {
    before(function () {
        skipIfMissingEnv(this, 'supabase');
    });
    // Set longer timeout for API calls
    this.timeout(30000);
    // Skip if API keys not available
    before(function () {
        if (!testEnv.getTestConfig().supabase.url || !testEnv.getTestConfig().supabase.key && !process.env.SUPABASE_ANON_KEY) {
            console.warn('SUPABASE credentials not found, skipping integration tests');
            this.skip();
        }
    });
    let userService;
    let userRepository;
    let supabaseClient;
    let testUserId;
    beforeEach(async function () {
        const supabaseUrl = testEnv.getTestConfig().supabase.url;
        const supabaseKey = testEnv.getTestConfig().supabase.key || process.env.SUPABASE_ANON_KEY;
        console.log(`Using Supabase URL: ${supabaseUrl}`);
        console.log(`Using Supabase Key: ${supabaseKey.substring(0, 10)}...`);
        supabaseClient = createClient(supabaseUrl, supabaseKey);
        // Create test user directly in Supabase (will be cleaned up later)
        testUserId = null;
    });
    afterEach(async function () {
        // Clean up - Delete test user if created
        if (testUserId) {
            try {
                // Delete directly from Supabase
                const { error } = await supabaseClient
                    .from('users')
                    .delete()
                    .eq('id', testUserId);
                if (error) {
                    console.warn(`Failed to delete test user: ${error.message}`);
                }
                else {
                    console.log(`Test user deleted: ${testUserId}`);
                    testUserId = null;
                }
            }
            catch (UserError) {
                console.warn(`Failed to delete test user: ${error.message}`);
            }
        }
    });
    it('should store and retrieve a user in Supabase', async function () {
        // 1. ARRANGE - Create a unique test user
        const testEmail = `test-user-${TEST_ID}@example.com`;
        const userData = {
            id: uuidv4(),
            email: testEmail,
            full_name: 'Integration Test User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        // 2. ACT - Create user in Supabase directly
        const { data: createdUser, error: createError } = await supabaseClient
            .from('users')
            .insert(userData)
            .select()
            .single();
        if (createError) {
            console.error('Error creating test user:', createError);
            throw new UserError(`Failed to create test user: ${createError.message}`);
        }
        testUserId = createdUser.id; // Save for cleanup
        console.log(`Created test user: ${testUserId}`);
        // 3. ASSERT - Verify user was created
        expect(createdUser).to.exist;
        expect(createdUser.id).to.equal(userData.id);
        expect(createdUser.email).to.equal(testEmail);
        expect(createdUser.full_name).to.equal('Integration Test User');
        // 4. ACT - Retrieve user by ID
        const { data: retrievedUser, error: retrieveError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', testUserId)
            .single();
        if (retrieveError) {
            console.error('Error retrieving test user:', retrieveError);
            throw new UserError(`Failed to retrieve test user: ${retrieveError.message}`);
        }
        // 5. ASSERT - Verify retrieved user matches
        expect(retrievedUser).to.exist;
        expect(retrievedUser.id).to.equal(testUserId);
        expect(retrievedUser.email).to.equal(testEmail);
    });
    it('should update a user in Supabase', async function () {
        // 1. ARRANGE - Create a test user
        const testEmail = `test-user-${TEST_ID}-update@example.com`;
        const userData = {
            id: uuidv4(),
            email: testEmail,
            full_name: 'Update Test User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        // Create user in Supabase
        const { data: createdUser, error: createError } = await supabaseClient
            .from('users')
            .insert(userData)
            .select()
            .single();
        if (createError) {
            console.error('Error creating test user:', createError);
            throw new UserError(`Failed to create test user: ${createError.message}`);
        }
        testUserId = createdUser.id; // Save for cleanup
        // Updates to apply
        const updates = {
            professional_title: 'Software Engineer',
            location: 'Test Location'
        };
        // 2. ACT - Update user
        const { data: updatedUser, error: updateError } = await supabaseClient
            .from('users')
            .update(updates)
            .eq('id', testUserId)
            .select()
            .single();
        if (updateError) {
            console.error('Error updating test user:', updateError);
            throw new UserError(`Failed to update test user: ${updateError.message}`);
        }
        // 3. ASSERT - Verify user was updated
        expect(updatedUser).to.exist;
        expect(updatedUser.id).to.equal(testUserId);
        expect(updatedUser.email).to.equal(testEmail);
        expect(updatedUser.professional_title).to.equal(updates.professional_title);
        expect(updatedUser.location).to.equal(updates.location);
    });
    it('should find a user by email in Supabase', async function () {
        // 1. ARRANGE - Create a test user with unique email
        const testEmail = `test-user-${TEST_ID}-find@example.com`;
        const userData = {
            id: uuidv4(),
            email: testEmail,
            full_name: 'Find Test User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        // Create user in Supabase
        const { data: createdUser, error: createError } = await supabaseClient
            .from('users')
            .insert(userData)
            .select()
            .single();
        if (createError) {
            console.error('Error creating test user:', createError);
            throw new UserError(`Failed to create test user: ${createError.message}`);
        }
        testUserId = createdUser.id; // Save for cleanup
        // 2. ACT - Find user by email
        const { data: foundUser, error: findError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('email', testEmail)
            .single();
        if (findError) {
            console.error('Error finding test user:', findError);
            throw new UserError(`Failed to find test user: ${findError.message}`);
        }
        // 3. ASSERT - Verify user was found
        expect(foundUser).to.exist;
        expect(foundUser.id).to.equal(testUserId);
        expect(foundUser.email).to.equal(testEmail);
    });
    it('should delete a user from Supabase', async function () {
        // 1. ARRANGE - Create a test user
        const testEmail = `test-user-${TEST_ID}-delete@example.com`;
        const userData = {
            id: uuidv4(),
            email: testEmail,
            full_name: 'Delete Test User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        // Create user in Supabase
        const { data: createdUser, error: createError } = await supabaseClient
            .from('users')
            .insert(userData)
            .select()
            .single();
        if (createError) {
            console.error('Error creating test user:', createError);
            throw new UserError(`Failed to create test user: ${createError.message}`);
        }
        const userIdToDelete = createdUser.id;
        // 2. ACT - Delete the user
        const { error: deleteError } = await supabaseClient
            .from('users')
            .delete()
            .eq('id', userIdToDelete);
        if (deleteError) {
            console.error('Error deleting test user:', deleteError);
            throw new UserError(`Failed to delete test user: ${deleteError.message}`);
        }
        // 3. ASSERT - Check that the user no longer exists
        const { data: deletedUser, error: findError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', userIdToDelete)
            .maybeSingle();
        // Error is expected here since the user should be deleted
        expect(deletedUser).to.be.null;
        // Since we deleted the user, don't try to delete it again in cleanup
        testUserId = null;
    });
    it('should return null when finding non-existent user in Supabase', async function () {
        // 1. ARRANGE
        const nonExistentId = uuidv4();
        // 2. ACT
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', nonExistentId)
            .maybeSingle();
        // 3. ASSERT
        expect(data).to.be.null;
    });
});
