#!/usr/bin/env node
/**
 * Create Test User
 * 
 * This script creates a test user in the Supabase auth system and the users table.
 * It's useful for development and testing purposes.
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

console.log(chalk.blue('=== Create Test User Script ==='));
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
 * Creates a test user in Supabase
 * @param {Object} options - User creation options
 * @param {string} options.email - User email
 * @param {string} options.password - User password
 * @param {string} options.fullName - User's full name
 * @param {string} options.focusArea - User's focus area
 * @returns {Promise<string|null>} The user's access token or null on failure
 */
async function createTestUser({ 
  email = 'testuser@test.com', 
  password = 'Test1234!',
  fullName = 'Test User',
  focusArea = 'Testing'
} = {}) {
  console.log(chalk.blue('\n=== Creating Test User ==='));
  
  console.log('Checking environment variables:');
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? chalk.green('✓ ' + process.env.SUPABASE_URL) : chalk.red('✗ missing')}`);
  console.log(
    `SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? chalk.green('✓ [VALUE HIDDEN]') : chalk.red('✗ missing')}`
  );
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(chalk.red('\nError: Missing required environment variables.'));
    console.error(chalk.yellow('Please make sure your .env file contains SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'));
    process.exit(1);
  }
  
  console.log(chalk.blue('\n=== Initializing Supabase Client ==='));
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  console.log(chalk.cyan(`\nAttempting to create/verify test user: ${email}`));
  
  try {
    // Check if user already exists in auth using admin.listUsers instead
    const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error(chalk.red('Error listing users:'), listError.message);
      process.exit(1);
    }
    
    const existingAuthUser = usersList?.users?.find(user => user.email === email);
    
    let userId;
    let userJustCreated = false;
    
    if (existingAuthUser) {
      console.log(chalk.yellow(`Auth user ${email} already exists.`));
      userId = existingAuthUser.id;
    } else {
      // Create the auth user
      console.log('Creating auth user...');
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: { full_name: fullName }
      });
      
      if (createError) {
        console.error(chalk.red('Error creating auth user:'), createError.message);
        process.exit(1);
      }
      userId = createData.user.id;
      userJustCreated = true;
      console.log(chalk.green('Auth user created successfully!'), `ID: ${userId}`);
    }
    
    // Check/Create user record in the 'users' table
    const { data: existingDbUser, error: dbCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    if (dbCheckError) {
      console.error(chalk.red('Error checking users table:'), dbCheckError.message);
      process.exit(1);
    }
    
    if (existingDbUser) {
      console.log(chalk.yellow(`User profile already exists in 'users' table for ID: ${userId}.`));
    } else {
      console.log('Creating user profile in \'users\' table...');
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId, // Ensure we use the Auth ID
          email,
          full_name: fullName,
          professional_title: 'Software Engineer',
          location: 'San Francisco',
          country: 'USA',
          focus_area: focusArea,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error(chalk.red('Error creating user profile:'), insertError.message);
        // Clean up auth user if profile creation fails
        if (userJustCreated) { 
          console.log(chalk.yellow('Cleaning up auth user since profile creation failed'));
          await supabase.auth.admin.deleteUser(userId); 
        }
        process.exit(1);
      }
      console.log(chalk.green('User profile created successfully.'));
    }
    
    // Log in as the test user to get a token (use non-admin client for this)
    console.log('Signing in to get access token...');
    const supabaseUserClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY); // Use Anon key for sign-in
    const { data: authData, error: authError } = await supabaseUserClient.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError) {
      console.error(chalk.red('Error signing in:'), authError.message);
      console.log(chalk.yellow('Ensure the password matches. If the user existed, the password might be different.'));
      process.exit(1);
    }
    
    console.log(chalk.green('\nUser created and authenticated successfully!'));
    console.log(chalk.cyan('\nAccess Token:'), authData.session.access_token);
    
    // Print curl example for immediate testing
    console.log(chalk.cyan('\nExample curl command to test authentication:'));
    console.log(chalk.yellow(`curl -X GET \\
    "http://localhost:3081/api/v1/personality/profile" \\
    -H "Authorization: Bearer ${authData.session.access_token}"`));
    
    return authData.session.access_token;
  } catch (error) {
    console.error(chalk.red('\nUnexpected error in createTestUser:'), error);
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
  } else if (args[i] === '--name' && args[i + 1]) {
    options.fullName = args[i + 1];
    i++;
  } else if (args[i] === '--focus' && args[i + 1]) {
    options.focusArea = args[i + 1];
    i++;
  }
}

// Run the function when script is executed directly
// When running via npm scripts, the main module check needs to be different
const isMainModule = process.argv[1].endsWith('create-test-user.js');

if (isMainModule) {
  console.log(chalk.blue('Running create-test-user script directly'));
  createTestUser(options).catch(error => {
    console.error(chalk.red('\nUnexpected error:'), error);
    process.exit(1);
  });
} else {
  console.log(chalk.yellow('create-test-user imported as a module'));
}

export default createTestUser; 