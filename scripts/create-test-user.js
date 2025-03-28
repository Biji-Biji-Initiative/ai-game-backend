const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createTestUser() {
  console.log('Environment variables:');
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'set' : 'missing'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing'}`);
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  console.log('Creating test user...');
  
  const email = 'testuser@test.com';
  const password = 'Test1234!';
  
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  
  if (error) {
    console.error('Error creating user:', error);
    return;
  }
  
  console.log('User created successfully:', data.user.id);
  
  // Create user record in the users table
  const { error: userError } = await supabase
    .from('users')
    .insert({
      id: data.user.id,
      email,
      full_name: 'Test User',
      professional_title: 'Software Engineer',
      location: 'San Francisco',
      country: 'USA',
      focus_area: 'Testing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  
  if (userError) {
    console.error('Error creating user profile:', userError);
    return;
  }
  
  console.log('User profile created successfully');
  
  // Log in as the test user to get a token
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (authError) {
    console.error('Error signing in:', authError);
    return;
  }
  
  console.log('Token:', authData.session.access_token);
  
  return authData.session.access_token;
}

createTestUser().catch(console.error); 