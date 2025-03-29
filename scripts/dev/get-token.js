#!/usr/bin/env node
/**
 * Get User Token
 * 
 * This script gets an authentication token for a user by signing in with email/password.
 * Useful for testing APIs that require authentication.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const chalk = require('chalk');

// Try to load environment variables from project root
const rootDir = path.join(__dirname, '../..');
const envPath = process.env.NODE_ENV === 'test' 
  ? path.join(rootDir, '.env.test')
  : path.join(rootDir, '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(chalk.green(`Loaded environment from ${path.basename(envPath)}`));
} else {
  console.warn(chalk.yellow(`Warning: Environment file ${path.basename(envPath)} not found`));
  dotenv.config(); // Try to load from default .env in root
}

let createClient;
try {
  ({ createClient } = require('@supabase/supabase-js'));
} catch (error) {
  console.error(chalk.red('Error: @supabase/supabase-js package not found. Please run npm install first.'));
  process.exit(1);
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
  console.log(chalk.blue('=== Getting Authentication Token ==='));
  
  // Use Anon Key for signing in
  const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  
  console.log('Checking environment variables:');
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? chalk.green('✓') : chalk.red('✗ missing')}`);
  console.log(`SUPABASE_KEY or SUPABASE_ANON_KEY: ${supabaseKey ? chalk.green('✓') : chalk.red('✗ missing')}`);
  
  if (!process.env.SUPABASE_URL || !supabaseKey) {
    console.error(chalk.red('\nError: Missing required environment variables.'));
    console.error(chalk.yellow('Please make sure your .env file contains SUPABASE_URL and SUPABASE_KEY/SUPABASE_ANON_KEY.'));
    process.exit(1);
  }
  
  // Initialize Supabase client with Anon Key
  const supabase = createClient(
    process.env.SUPABASE_URL,
    supabaseKey
  );
  
  console.log(chalk.cyan(`\nSigning in with email: ${email}`));
  
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
  "${process.env.SUPABASE_URL.replace('/auth/v1', '')}/rest/v1/users?limit=1" \\
  -H "apikey: ${supabaseKey}" \\
  -H "Authorization: Bearer ${data.session.access_token}"`));
  
  return data.session.access_token;
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
if (require.main === module) {
  getToken(options).catch(error => {
    console.error(chalk.red('\nUnexpected error:'), error);
    process.exit(1);
  });
}

module.exports = getToken; 