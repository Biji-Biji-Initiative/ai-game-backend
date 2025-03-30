import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
supabase.from('users').select('count').then(result => {
  if (result.error) {
    console.error('Database connection error:', result.error);
    process.exit(1);
  }
  console.log('Database connection successful!');
  process.exit(0);
}).catch(err => {
  console.error('Supabase connection error:', err);
  process.exit(1);
}); 