/**
 * Apply Supabase Migration Script
 * 
 * This script reads an SQL migration file and applies it to the Supabase database
 * using the Supabase client.
 * 
 * Usage: node scripts/applyMigration.js path/to/migration.sql
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Get Supabase URL and Service Role Key from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
  process.exit(1);
}

// Create Supabase client with Service Role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Apply a SQL migration to the Supabase database
 * @param {string} migrationPath - Path to the SQL migration file
 */
async function applyMigration(migrationPath) {
  try {
    console.log(`Reading migration file: ${migrationPath}`);
    
    // Read the migration file
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Migration file read successfully');
    console.log('Applying migration to Supabase database...');
    
    // Execute the SQL using the Supabase client's rpc function
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_string: migrationSql
    });
    
    if (error) {
      console.error('Error applying migration:', error);
      process.exit(1);
    }
    
    console.log('Migration applied successfully!');
    console.log('Result:', data);
  } catch (error) {
    console.error('Error applying migration:', error.message);
    process.exit(1);
  }
}

// Get migration file path from command line arguments
const migrationPath = process.argv[2];

if (!migrationPath) {
  console.error('Error: Migration file path must be provided as an argument');
  console.error('Usage: node scripts/applyMigration.js path/to/migration.sql');
  process.exit(1);
}

// Resolve absolute path
const absoluteMigrationPath = path.resolve(process.cwd(), migrationPath);

// Check if file exists
if (!fs.existsSync(absoluteMigrationPath)) {
  console.error(`Error: Migration file not found: ${absoluteMigrationPath}`);
  process.exit(1);
}

// Apply the migration
applyMigration(absoluteMigrationPath); 