/**
 * Test authentication process manually
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

/**
 *
 */
async function testAuth() {
  console.log('----------- TEST AUTH SCRIPT -----------');
  
  // Step 1: Get a token from Supabase
  console.log('Step 1: Getting token from Supabase...');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );
  
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'testuser@test.com',
    password: 'Test1234!'
  });
  
  if (signInError) {
    console.error('Sign-in error:', signInError);
    return;
  }
  
  const token = signInData.session.access_token;
  console.log(`Token obtained: ${token.substring(0, 20)}...`);
  
  // Step 2: Verify the token
  console.log('\nStep 2: Verifying token...');
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  
  if (userError) {
    console.error('Token verification error:', userError);
    return;
  }
  
  console.log('User verified:', userData.user.email);
  console.log('User ID:', userData.user.id);
  
  // Step 3: Look up the user in the database
  console.log('\nStep 3: Looking up user in database...');
  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('*')
    .eq('email', userData.user.email)
    .single();
  
  if (dbError) {
    console.error('Database lookup error:', dbError);
    return;
  }
  
  if (!dbUser) {
    console.error('User not found in database');
    return;
  }
  
  console.log('User found in database:', dbUser.email);
  console.log('User database ID:', dbUser.id);
  
  // Step 4: Verify DB user ID matches auth user ID
  console.log('\nStep 4: Verifying user IDs match...');
  if (dbUser.id === userData.user.id) {
    console.log('SUCCESS: User IDs match!');
  } else {
    console.error('FAILURE: User IDs do not match!');
    console.log('Auth user ID:', userData.user.id);
    console.log('DB user ID:', dbUser.id);
  }
  
  console.log('\nAll authentication steps completed successfully!');
}

testAuth().catch(console.error); 