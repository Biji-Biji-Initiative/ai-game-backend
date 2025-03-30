/**
 * True integration test with real Supabase connection
 * 
 * This test will be skipped if:
 * 1. USE_REAL_SUPABASE environment variable is set to 'false'
 * 2. Supabase credentials are not available
 * 3. We're running in a CI environment
 * 
 * Note: For true integration tests to work with write operations,
 * you need to either:
 * 1. Use a service key instead of anon key, or
 * 2. Disable RLS (Row Level Security) for the test database
 */
import { expect } from "chai";
import { v4 as uuidv4 } from "uuid";
import { getTestSupabaseClient, shouldUseRealSupabase } from "../util/supabaseClientFactory.js";

// Generate a unique test ID for this run to avoid conflicts
const TEST_ID = `test_${Date.now()}`;
const TEST_PREFIX = `integration_${TEST_ID}`;

// Only run these tests if using real Supabase
const itWithRealSupabase = shouldUseRealSupabase() ? it : it.skip;

// Skip write tests unless we have a service key or know RLS is disabled
const hasServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.length > 0;
const itWithWriteAccess = (shouldUseRealSupabase() && hasServiceRoleKey) ? it : it.skip;

describe('True Integration: Supabase Connection', function() {
  // Extend timeout for external API calls
  this.timeout(10000);
  
  let supabaseClient;
  let testUserId;
  
  before(function() {
    // Skip all tests if not using real Supabase
    if (!shouldUseRealSupabase()) {
      console.log('Skipping true integration tests - real Supabase not configured');
      this.skip();
    } else {
      console.log('Running true integration tests with real Supabase connection');
      
      if (!hasServiceRoleKey) {
        console.log('WARNING: No service role key detected. Write operations may fail due to RLS.');
        console.log('Read-only tests will still run.');
      } else {
        console.log('Service role key detected. Full CRUD operations should work.');
      }
    }
    
    // Create Supabase client for tests
    supabaseClient = getTestSupabaseClient();
  });
  
  // Clean up after tests
  after(async function() {
    if (shouldUseRealSupabase() && testUserId) {
      // Clean up test user if created
      console.log(`Cleaning up test user: ${testUserId}`);
      try {
        await supabaseClient.from('users').delete().eq('id', testUserId);
      } catch (error) {
        console.warn('Failed to clean up test user:', error.message);
      }
    }
  });
  
  // Test basic connectivity (read-only)
  itWithRealSupabase('should connect to Supabase successfully', async function() {
    // Simple health check query
    const { data, error } = await supabaseClient.from('users').select('id').limit(1);
    
    // Just verify we got a response without error
    expect(error).to.be.null;
    expect(data).to.be.an('array');
  });
  
  // Test full CRUD operations with real Supabase (requires service key)
  itWithWriteAccess('should perform CRUD operations on actual Supabase database', async function() {
    // 1. CREATE - Insert a test user
    const testEmail = `${TEST_PREFIX}@example.com`;
    const userData = {
      id: uuidv4(),
      email: testEmail,
      name: 'Integration Test User',
      created_at: new Date().toISOString()
    };
    
    const { data: createdUser, error: createError } = await supabaseClient
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (createError) {
      console.log('Create error:', createError);
    }
      
    // Save ID for later cleanup
    testUserId = userData.id;
    
    // Check creation worked
    expect(createError).to.be.null;
    expect(createdUser).to.exist;
    expect(createdUser.id).to.equal(userData.id);
    expect(createdUser.email).to.equal(testEmail);
    
    // 2. READ - Fetch the user we just created
    const { data: fetchedUser, error: readError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single();
    
    if (readError) {
      console.log('Read error:', readError);
    }
    
    expect(readError).to.be.null;
    expect(fetchedUser).to.exist;
    expect(fetchedUser.id).to.equal(testUserId);
    
    // 3. UPDATE - Modify the user
    const updateData = {
      updated_at: new Date().toISOString(),
      name: 'Updated Integration Test User'
    };
    
    const { data: updatedUser, error: updateError } = await supabaseClient
      .from('users')
      .update(updateData)
      .eq('id', testUserId)
      .select()
      .single();
    
    if (updateError) {
      console.log('Update error:', updateError);
    }
    
    expect(updateError).to.be.null;
    expect(updatedUser).to.exist;
    expect(updatedUser.name).to.equal(updateData.name);
    
    // 4. DELETE - Remove the test user
    const { error: deleteError } = await supabaseClient
      .from('users')
      .delete()
      .eq('id', testUserId);
    
    if (deleteError) {
      console.log('Delete error:', deleteError);
    }
    
    expect(deleteError).to.be.null;
    
    // Verify deletion
    const { data: shouldBeNull, error: verifyError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .maybeSingle();
    
    expect(verifyError).to.be.null;
    expect(shouldBeNull).to.be.null;
    
    // Since we deleted the user, clear the ID so after() doesn't try to delete again
    testUserId = null;
  });
  
  // Add a read-only test that works without a service key
  itWithRealSupabase('should be able to read data without a service key', async function() {
    // This test only performs a read operation which should work with anon key
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .limit(5);
    
    expect(error).to.be.null;
    expect(data).to.be.an('array');
    // We don't assert on the content because it depends on the database
  });
}); 