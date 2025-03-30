/**
 * Database Schema Application Script
 * 
 * This script applies the database schema to your Supabase project.
 * It reads the schema.sql file and executes it against your Supabase database.
 * 
 * Usage:
 *   node db/apply-schema.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
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

async function applySchema() {
  try {
    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Split SQL into individual statements
    const statements = schemaSQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const sql = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}`);
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
        }
      } catch (err) {
        console.error(`Exception executing statement ${i + 1}:`, err.message);
      }
    }

    console.log('Schema applied successfully!');
  } catch (error) {
    console.error('Error applying schema:', error);
    process.exit(1);
  }
}

// Execute the function
console.log('Starting database schema application...');
applySchema()
  .then(() => {
    console.log('Schema application complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  }); 