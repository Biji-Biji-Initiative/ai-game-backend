import { expect } from "chai";
import { v4 as uuidv4 } from "uuid";
import testEnv from "../util/loadEnv.js";
import { skipIfMissingEnv } from "../util/testHelpers.js";
import { config } from "dotenv";
import { getTestSupabaseClient } from "../util/supabaseClientFactory.js";
import { UserError, UserNotFoundError, UserUpdateError, UserValidationError, UserInvalidStateError, UserAuthenticationError, UserAuthorizationError } from '../../../../src/core/user/errors/UserErrors.js';
({ config }.config());
// Generate a unique test ID for this run
const TEST_ID = `test_${Date.now()}`;

/**
 * Integration test for user storage workflows
 * Uses either a mock or real Supabase client depending on configuration
 */
describe('Integration: User Storage Workflow', function () {
    // Set longer timeout for tests with external API
    this.timeout(15000);
    
    // Setup variables for the tests
    let supabaseClient;
    let testUserId;
    
    // Run before all tests in this block
    before(function () {
        console.log('Setting up Supabase client for all tests');
    });
    
    // Run before each test
    beforeEach(function () {
        // Create a new Supabase client for each test (mock or real based on config)
        supabaseClient = getTestSupabaseClient();
        console.log('Database reset for test isolation');
        
        // Reset the test user ID
        testUserId = null;
    });
    
    // Run after each test
    afterEach(async function () {
        // Clean up any test user if created
        if (testUserId) {
            console.log(`Cleaning up test user: ${testUserId}`);
            await supabaseClient.from('users').delete().eq('id', testUserId);
            testUserId = null;
        }
    });
    
    // Test: Create and retrieve a user
    it('should store and retrieve a user in Supabase', async function () {
        // 1. ARRANGE - Create a unique test user
        const testEmail = `test-user-${TEST_ID}@example.com`;
        const userData = {
            id: uuidv4(),
            email: testEmail,
            name: 'Integration Test User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log(`Creating test user with id: ${userData.id}`);
        
        // 2. ACT - Create user in Supabase
        const { data: createdUser, error: createError } = await supabaseClient
            .from('users')
            .insert(userData)
            .select()
            .single();
            
        // Check for errors
        if (createError) {
            console.error('Error creating user:', createError);
        }
        
        expect(createError).to.be.null;
        expect(createdUser).to.exist;
        
        // Save ID for cleanup
        testUserId = createdUser.id;
        console.log(`Created test user: ${testUserId}`);
        
        // 3. ASSERT - Verify user was created with correct data
        expect(createdUser.id).to.equal(userData.id);
        expect(createdUser.email).to.equal(testEmail);
        expect(createdUser.name).to.equal('Integration Test User');
        
        // 4. ACT - Retrieve user by ID
        const { data: retrievedUser, error: retrieveError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', testUserId)
            .single();
            
        // Check for errors
        if (retrieveError) {
            console.error('Error retrieving user:', retrieveError);
        }
        
        expect(retrieveError).to.be.null;
        expect(retrievedUser).to.exist;
        
        // 5. ASSERT - Verify retrieved user matches
        expect(retrievedUser.id).to.equal(testUserId);
        expect(retrievedUser.email).to.equal(testEmail);
    });
    
    // Test: Update user
    it('should update a user in Supabase', async function () {
        // 1. ARRANGE - Create a user to update
        const testEmail = `update-user-${TEST_ID}@example.com`;
        const userData = {
            id: uuidv4(),
            email: testEmail,
            name: 'User To Update',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Create user in Supabase
        const { data: createdUser, error: createError } = await supabaseClient
            .from('users')
            .insert(userData)
            .select()
            .single();
            
        // Check for errors
        expect(createError).to.be.null;
        expect(createdUser).to.exist;
        
        // Save ID for cleanup
        testUserId = createdUser.id;
        
        // 2. ARRANGE - Define update data
        const updateData = {
            name: 'Updated User Name',
            updated_at: new Date().toISOString()
        };
        
        // 3. ACT - Update the user
        const { data: updatedUser, error: updateError } = await supabaseClient
            .from('users')
            .update(updateData)
            .eq('id', testUserId)
            .select()
            .single();
            
        // 4. ASSERT - Verify update was successful
        expect(updateError).to.be.null;
        expect(updatedUser).to.exist;
        expect(updatedUser.name).to.equal('Updated User Name');
        expect(updatedUser.email).to.equal(testEmail); // Email should not change
    });
    
    // Test: Find user by email
    it('should find a user by email in Supabase', async function () {
        // 1. ARRANGE - Create a test user with unique email
        const testEmail = `test-user-${TEST_ID}-find@example.com`;
        const userData = {
            id: uuidv4(),
            email: testEmail,
            name: 'Find Test User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Create user in Supabase
        const { data: createdUser, error: createError } = await supabaseClient
            .from('users')
            .insert(userData)
            .select()
            .single();
            
        // Check for errors
        expect(createError).to.be.null;
        expect(createdUser).to.exist;
        
        // Save ID for cleanup
        testUserId = createdUser.id;
        
        // 2. ACT - Find user by email
        const { data: foundUser, error: findError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('email', testEmail)
            .single();
            
        // Check for errors
        expect(findError).to.be.null;
        expect(foundUser).to.exist;
        
        // 3. ASSERT - Verify user was found
        expect(foundUser.id).to.equal(testUserId);
        expect(foundUser.email).to.equal(testEmail);
    });
    
    // Test: Delete a user
    it('should delete a user from Supabase', async function () {
        // 1. ARRANGE - Create a test user
        const testEmail = `test-user-${TEST_ID}-delete@example.com`;
        const userData = {
            id: uuidv4(),
            email: testEmail,
            name: 'Delete Test User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Create user in Supabase
        const { data: createdUser, error: createError } = await supabaseClient
            .from('users')
            .insert(userData)
            .select()
            .single();
            
        // Check for errors
        expect(createError).to.be.null;
        expect(createdUser).to.exist;
        
        const userIdToDelete = createdUser.id;
        
        // 2. ACT - Delete the user
        const { error: deleteError } = await supabaseClient
            .from('users')
            .delete()
            .eq('id', userIdToDelete);
            
        // Check for errors
        expect(deleteError).to.be.null;
        
        // 3. ASSERT - Check that the user no longer exists
        const { data: deletedUser, error: findError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', userIdToDelete)
            .maybeSingle();
            
        // User should not exist
        expect(deletedUser).to.be.null;
        
        // Since we deleted the user, don't try to delete it again in cleanup
        testUserId = null;
    });
    
    // Test: Finding non-existent user
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
        expect(error).to.be.null;
    });
    
    // Test: Test with seeded data
    it('should work with pre-seeded data', async function () {
        // 1. ARRANGE - Seed the Supabase with test data
        const testUsers = [
            {
                id: uuidv4(),
                email: 'seed-user1@example.com',
                name: 'Seeded User 1',
                created_at: new Date().toISOString()
            },
            {
                id: uuidv4(),
                email: 'seed-user2@example.com',
                name: 'Seeded User 2',
                created_at: new Date().toISOString()
            }
        ];
        
        await supabaseClient.from('users').insert(testUsers);
        
        // 2. ACT - Find the first seeded user
        const { data: foundUser, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('email', 'seed-user1@example.com')
            .single();
            
        // 3. ASSERT
        expect(error).to.be.null;
        expect(foundUser).to.exist;
        expect(foundUser.name).to.equal('Seeded User 1');
    });
});
