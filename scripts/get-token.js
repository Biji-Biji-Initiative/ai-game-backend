const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function getToken() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'testuser@test.com',
    password: 'Test1234!'
  });
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  console.log(data.session.access_token);
}

getToken().catch(console.error); 