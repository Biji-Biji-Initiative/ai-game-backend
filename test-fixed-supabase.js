/**
 * Test Fixed Supabase Client
 * 
 * This script tests if our fix for the Supabase client import works correctly
 * with both destructuring and direct imports.
 */

require('dotenv').config();

console.log('Testing different Supabase client import methods...\n');

// Test destructuring import
console.log('1. Testing destructuring import:');
const { supabase } = require('./src/lib/supabase');
console.log('- Is defined:', !!supabase);
console.log('- Has from method:', !!(supabase && supabase.from));

// Test direct import
console.log('\n2. Testing direct import:');
const directClient = require('./src/lib/supabase');
console.log('- Is defined:', !!directClient);
console.log('- Has from method:', !!(directClient && directClient.from));

// Test other exports
console.log('\n3. Testing other named exports:');
const { supabaseClient, supabaseAdmin, createSupabaseClient } = require('./src/lib/supabase');
console.log('- supabaseClient defined:', !!supabaseClient);
console.log('- supabaseAdmin defined:', !!supabaseAdmin);
console.log('- createSupabaseClient defined:', !!createSupabaseClient);

// Test a simple query
async function testQuery() {
  try {
    console.log('\n4. Testing a simple query:');
    const { data, error } = await supabase
      .from('challenge_types')
      .select('code, name')
      .limit(1);
    
    if (error) {
      console.error('- Query error:', error.message);
    } else {
      console.log('- Query successful!');
      console.log('- Result:', data);
    }
  } catch (err) {
    console.error('- Exception during query:', err.message);
  }
}

// Run the tests
testQuery(); 