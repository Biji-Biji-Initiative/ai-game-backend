/**
 * Database Seed Script
 *
 * This script connects to Supabase and seeds the database
 * with initial data from the seed.sql file.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedFile = path.resolve(__dirname, '../../seed.sql');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('ERROR: SUPABASE_URL environment variable is required');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('ERROR: SUPABASE_KEY/SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seedDatabase() {
  try {
    console.log('Checking seed file:', seedFile);

    // Check if seed file exists
    if (!fs.existsSync(seedFile)) {
      console.error(`Seed file doesn't exist: ${seedFile}`);
      process.exit(1);
    }

    // Read seed file
    const seedSql = fs.readFileSync(seedFile, 'utf8');

    if (!seedSql) {
      console.log('Seed file is empty.');
      return;
    }

    console.log('Seeding database...');

    // Execute seed SQL
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: seedSql
    });

    if (error) {
      throw new Error(`Failed to seed database: ${error.message}`);
    }

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
}

seedDatabase();
