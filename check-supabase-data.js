/**
 * Check Supabase Data
 * 
 * This script checks if our data is being saved correctly in Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Check environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('ERROR: Missing Supabase configuration.');
  console.error('Please set SUPABASE_URL and SUPABASE_KEY in your .env file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkData() {
  try {
    console.log('Checking Supabase data...');
    
    // Check users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
    } else {
      console.log(`Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`- ${user.id} (${user.email})`);
      });
    }
    
    // Check focus areas
    const { data: focusAreas, error: focusAreasError } = await supabase
      .from('focus_areas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (focusAreasError) {
      console.error('Error fetching focus areas:', focusAreasError);
    } else {
      console.log(`\nFound ${focusAreas.length} focus areas:`);
      focusAreas.forEach(area => {
        console.log(`- ${area.id}: ${area.name} (User: ${area.user_id})`);
      });
    }
    
    // Check test users (ones created for testing)
    const { data: testUsers, error: testUsersError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', '%@example.com')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (testUsersError) {
      console.error('Error fetching test users:', testUsersError);
    } else {
      console.log(`\nFound ${testUsers.length} test users:`);
      testUsers.forEach(user => {
        console.log(`- ${user.id} (${user.email})`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error checking data:', error);
    return false;
  }
}

// Run the check
console.log('Starting Supabase data check...');
checkData()
  .then(success => {
    if (success) {
      console.log('\nData check completed successfully!');
      process.exit(0);
    } else {
      console.log('\nData check failed!');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unhandled error during data check:', err);
    process.exit(1);
  }); 