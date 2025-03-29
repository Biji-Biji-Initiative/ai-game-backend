#!/usr/bin/env node
/**
 * Database Migration Runner
 * 
 * This script runs the SQL migration files in the migrations directory.
 * It connects to the database using the Supabase client and executes each migration file.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const chalk = require('chalk');

// Try to load environment variables
const envPath = process.env.NODE_ENV === 'test' 
  ? path.join(__dirname, '../../.env.test')
  : path.join(__dirname, '../../.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(chalk.green(`Loaded environment from ${path.basename(envPath)}`));
} else {
  console.warn(chalk.yellow(`Warning: Environment file ${path.basename(envPath)} not found`));
  dotenv.config(); // Try to load from default .env
}

// Check for required Supabase package
let createClient;
try {
  ({ createClient } = require('@supabase/supabase-js'));
} catch (error) {
  console.error(chalk.red('Error: @supabase/supabase-js package not found. Please run npm install first.'));
  process.exit(1);
}

console.log(chalk.blue('=== Database Migration Runner ==='));

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(chalk.red('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY environment variables'));
  console.error(chalk.yellow('Please make sure your .env file contains these variables.'));
  console.error(chalk.yellow('You can run "npm run setup:env" to set up your environment.'));
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
    console.log(chalk.cyan(`Running migration: ${path.basename(filePath)}`));
    
    // Split the SQL file into separate statements
    const statements = sql.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Run each statement
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement }).catch(err => ({ error: err }));
      
      if (error) {
        console.error(chalk.red(`Error executing statement from ${path.basename(filePath)}:`), error);
        throw error;
      }
    }
    
    console.log(chalk.green(`✓ Successfully executed migration: ${path.basename(filePath)}`));
  } catch (error) {
    console.error(chalk.red(`✗ Failed to run migration ${path.basename(filePath)}:`), error);
    throw error;
  }
}

/**
 * Run all SQL migration files in the migrations directory
 * @param {string} [specificMigration] - Optional specific migration filename to run
 * @returns {Promise<void>}
 */
async function runAllMigrations(specificMigration) {
  try {
    const migrationsDir = path.join(__dirname, '../../migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.error(chalk.red(`Error: Migrations directory not found: ${migrationsDir}`));
      console.error(chalk.yellow('Please create a migrations directory in the project root with your SQL files.'));
      process.exit(1);
    }
    
    let files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Run migrations in alphabetical order
    
    if (specificMigration) {
      files = files.filter(file => file === specificMigration || file.includes(specificMigration));
      if (files.length === 0) {
        console.error(chalk.red(`Error: No migration file matching "${specificMigration}" was found.`));
        process.exit(1);
      }
    }
    
    console.log(chalk.blue(`Found ${files.length} migration file${files.length === 1 ? '' : 's'}`));
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      await runMigration(filePath);
    }
    
    console.log(chalk.green.bold('✅ All migrations completed successfully'));
  } catch (error) {
    console.error(chalk.red.bold('✗ Migration failed:'), error.message || error);
    process.exit(1);
  }
}

// Process command line arguments
const args = process.argv.slice(2);
const specificMigration = args[0]; // Optional specific migration to run

// Run migrations when script is executed directly
if (require.main === module) {
  if (specificMigration) {
    console.log(chalk.yellow(`Running specific migration matching: ${specificMigration}`));
  }
  runAllMigrations(specificMigration).catch(error => {
    console.error(chalk.red('Unexpected error:'), error);
    process.exit(1);
  });
}

module.exports = {
  runAllMigrations,
  runMigration
}; 