#!/usr/bin/env node
/**
 * Get User Token
 * 
 * This script gets an authentication token for a user by signing in with email/password.
 * Useful for testing APIs that require authentication.
 */

'use strict';

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

// Get the directory name from the current module URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load environment variables from project root
const rootDir = path.join(__dirname, '../..');
const envPath = process.env.NODE_ENV === 'test' 
  ? path.join(rootDir, '.env.test')
  : path.join(rootDir, '.env');

console.log(chalk.blue('=== Getting Authentication Token ==='));
console.log(chalk.cyan(`Looking for env file at: ${envPath}`));

if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  console.log(chalk.green(`Loaded environment from ${path.basename(envPath)}`));
  
  if (result.error) {
    console.error(chalk.red(`Error loading .env file: ${result.error.message}`));
  }
} else {
  console.warn(chalk.yellow(`Warning: Environment file ${path.basename(envPath)} not found`));
  const result = dotenv.config(); // Try to load from default .env in root
  
  if (result.error) {
    console.error(chalk.red(`Error loading default .env file: ${result.error.message}`));
  }
}

/**
 * Gets an authentication token for a user
 * @param {Object} options - Login options
 * @param {string} options.email - User email
 * @param {string} options.password - User password
 * @returns {Promise<string>} The user's access token
 */
async function getToken({ 
  email = 'testuser@test.com', 
  password = 'Test1234!' // Match default password in create-test-user
} = {}) {
  console.log(chalk.blue('\n=== Checking Environment Variables ==='));
  
  // Use Anon Key for signing in
  const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  
  console.log('Required environment variables:');
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? chalk.green('✓ ' + process.env.SUPABASE_URL) : chalk.red('✗ missing')}`);
  console.log(`SUPABASE_KEY or SUPABASE_ANON_KEY: ${supabaseKey ? chalk.green('✓ [VALUE HIDDEN]') : chalk.red('✗ missing')}`);
  
  if (!process.env.SUPABASE_URL || !supabaseKey) {
    console.error(chalk.red('\nError: Missing required environment variables.'));
    console.error(chalk.yellow('Please make sure your .env file contains SUPABASE_URL and SUPABASE_KEY/SUPABASE_ANON_KEY.'));
    process.exit(1);
  }
  
  console.log(chalk.blue('\n=== Initializing Supabase Client ==='));
  
  // Initialize Supabase client with Anon Key
  const supabase = createClient(
    process.env.SUPABASE_URL,
    supabaseKey
  );
  
  console.log(chalk.cyan(`\nSigning in with email: ${email}`));
  
  try {
    // Get token
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error(chalk.red('\nError signing in:'), error.message);
      console.log(chalk.yellow('Make sure the user exists and the password is correct.'));
      console.log(chalk.yellow('You can create a test user with: npm run dev:user'));
      process.exit(1);
    }
    
    if (!data || !data.session || !data.session.access_token) {
      console.error(chalk.red('\nError: Sign in successful but no session token received.'));
      console.log('Received data:', data);
      process.exit(1);
    }
    
    console.log(chalk.green('\nAuthentication successful!'));
    
    // Print token
    console.log(chalk.cyan('\nAccess Token:'), data.session.access_token);
    console.log(chalk.cyan('\nAuthorization Header:'), `Bearer ${data.session.access_token}`);
    
    // Print curl example
    console.log(chalk.cyan('\nExample curl command (replace endpoint):'));
    console.log(chalk.yellow(`curl -X GET \\
  "http://localhost:3081/api/v1/personality/profile" \\
  -H "Authorization: Bearer ${data.session.access_token}"`));
    
    return data.session.access_token;
  } catch (err) {
    console.error(chalk.red('\nUnexpected error during authentication:'), err);
    process.exit(1);
  }
}

// Process command line arguments
const args = process.argv.slice(2);
const options = {};

// Parse arguments for custom email and password
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email' && args[i + 1]) {
    options.email = args[i + 1];
    i++;
  } else if (args[i] === '--password' && args[i + 1]) {
    options.password = args[i + 1];
    i++;
  }
}

// Run the function when script is executed directly
// When running via npm scripts, the main module check needs to be different
const isMainModule = process.argv[1].endsWith('get-token.js');

if (isMainModule) {
  console.log(chalk.blue('Running get-token script directly'));
  getToken(options).catch(error => {
    console.error(chalk.red('\nUnexpected error:'), error);
    process.exit(1);
  });
} else {
  console.log(chalk.yellow('get-token imported as a module'));
}

export default getToken; 