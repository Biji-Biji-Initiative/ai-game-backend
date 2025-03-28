/**
 * Database Migration Runner
 * 
 * This script runs the SQL migration files in the migrations directory.
 * It connects to the database using the Supabase client and executes each migration file.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Run a specific SQL migration file
 * @param {string} filePath - Path to migration file
 * @returns {Promise<void>}
 */
async function runMigration(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Running migration: ${path.basename(filePath)}`);
    
    // Split the SQL file into separate statements
    const statements = sql.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Run each statement
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`Error executing statement from ${path.basename(filePath)}:`, error);
        throw error;
      }
    }
    
    console.log(`Successfully executed migration: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`Failed to run migration ${filePath}:`, error);
    throw error;
  }
}

/**
 * Run all SQL migration files in the migrations directory
 * @returns {Promise<void>}
 */
async function runAllMigrations() {
  try {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Run migrations in alphabetical order
    
    console.log(`Found ${files.length} migration files`);
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      await runMigration(filePath);
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations when script is executed directly
if (require.main === module) {
  runAllMigrations();
}

module.exports = {
  runAllMigrations,
  runMigration
}; 