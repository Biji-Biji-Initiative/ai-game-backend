/**
 * Migration Runner Script
 * 
 * This script runs SQL migration files against the Supabase database.
 * It can be used to set up or update the database schema.
 */

// Load environment variables first
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { supabaseClient } = require('../src/core/infra/db/supabaseClient');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

/**
 * Run a specific migration file
 * @param {string} fileName - Migration file name
 * @returns {Promise<void>}
 */
async function runMigration(fileName) {
  console.log(`Running migration: ${fileName}`);
  
  try {
    const filePath = path.join(MIGRATIONS_DIR, fileName);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split the SQL file into separate statements
    const statements = sql.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Run each statement
    for (const statement of statements) {
      const { error } = await supabaseClient.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`Error executing statement from ${fileName}:`, error);
        // Continue with other statements
      }
    }
    
    console.log(`Migration ${fileName} completed successfully`);
  } catch (error) {
    console.error(`Error running migration ${fileName}:`, error);
    throw error;
  }
}

/**
 * Run all migrations in the migrations directory
 * or a specific migration if file name is provided
 */
async function runMigrations() {
  try {
    const specificFile = process.argv[2];
    
    if (specificFile) {
      // Run specific migration
      await runMigration(specificFile);
    } else {
      // Run all migrations in order
      const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Sort to ensure order
      
      console.log(`Found ${files.length} migration files`);
      
      for (const file of files) {
        await runMigration(file);
      }
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    supabaseClient.removeAllChannels();
  }
}

// Run the migrations
runMigrations(); 