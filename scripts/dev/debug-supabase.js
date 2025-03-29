/**
 * Debug Supabase Client
 * 
 * This script tests the Supabase client to see what's causing the issue
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Direct supabase connection
console.log('Creating direct Supabase client...');
const directSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

console.log('Direct Supabase client created. Properties:');
console.log('- URL: ' + process.env.SUPABASE_URL);
console.log('- Has auth:', !!directSupabase.auth);
console.log('- Has from:', !!directSupabase.from);
console.log('- Has rpc:', !!directSupabase.rpc);

// Test a direct query
/**
 * Tests a direct query to the Supabase challenge_types table
 * using the directly created Supabase client.
 * @async
 * @returns {Promise<void>} A promise that resolves when the query completes
 */
async function testDirectQuery() {
  try {
    console.log('\nTesting direct query to challenge_types table...');
    const { data, error } = await directSupabase
      .from('challenge_types')
      .select('id, code, name')
      .limit(1);
    
    if (error) {
      console.error('Error executing query:', error);
    } else {
      console.log('Query successful, data:', data);
    }
  } catch (err) {
    console.error('Exception during query:', err);
  }
}

// Use the imported client from our codebase
console.log('\nImporting Supabase client from src/core/infra/db/supabaseClient...');
const { supabaseClient: supabase } = require('../src/core/infra/db/supabaseClient');

console.log('Imported Supabase client properties:');
console.log('- Is defined:', !!supabase);
console.log('- Is object:', typeof supabase === 'object');
console.log('- Has auth:', supabase && !!supabase.auth);
console.log('- Has from:', supabase && !!supabase.from);
console.log('- Has rpc:', supabase && !!supabase.rpc);

// Test our codebase client
/**
 * Tests a query to the Supabase challenge_types table
 * using the imported Supabase client from the application codebase.
 * @async
 * @returns {Promise<void>} A promise that resolves when the query completes
 */
async function testLibraryQuery() {
  try {
    console.log('\nTesting imported client query to challenge_types table...');
    const { data, error } = await supabase
      .from('challenge_types')
      .select('id, code, name')
      .limit(1);
    
    if (error) {
      console.error('Error executing query with imported client:', error);
    } else {
      console.log('Imported client query successful, data:', data);
    }
  } catch (err) {
    console.error('Exception during imported client query:', err);
  }
}

// Run the tests
/**
 * Executes all Supabase client test functions in sequence.
 * @async
 * @returns {Promise<void>} A promise that resolves when all tests complete
 */
async function runTests() {
  await testDirectQuery();
  await testLibraryQuery();
}

runTests(); 