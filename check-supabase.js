/**
 * Simple Supabase connectivity check
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Use synchronous logging
function log(message) {
  console.log(message);
  fs.appendFileSync('supabase-check.log', message + '\n');
}

async function checkSupabase() {
  try {
    log('Checking Supabase connection...');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
    
    log(`Using URL: ${supabaseUrl}`);
    log(`Using Key: ${supabaseKey ? supabaseKey.substring(0, 15) + '...' : 'undefined'}`);
    
    if (!supabaseUrl || !supabaseKey) {
      log('❌ Supabase credentials not found in environment');
      process.exit(1);
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try a simple query
    log('Attempting to query Supabase...');
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .limit(1);
      
    if (error) {
      log('❌ Failed to connect to Supabase: ' + error.message);
      log('Error details: ' + JSON.stringify(error, null, 2));
      process.exit(1);
    }
    
    log('✅ Successfully connected to Supabase!');
    log(`Retrieved ${data ? data.length : 0} items from challenges table`);
    
    if (data && data.length > 0) {
      log('Sample data: ' + JSON.stringify(data[0], null, 2));
    }
    
    process.exit(0);
  } catch (err) {
    log('❌ Error checking Supabase connection: ' + err.message);
    log('Error stack: ' + err.stack);
    process.exit(1);
  }
}

// Run the check
log('Starting Supabase check at ' + new Date().toISOString());
checkSupabase(); 