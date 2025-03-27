#!/usr/bin/env node

/**
 * Update Environment Variables Script
 * 
 * This script updates the .env file with the correct Supabase credentials
 * and other environment variables needed for tests to run properly.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to .env file
const envPath = path.join(__dirname, '..', '.env');

// Check if .env file exists
const envExists = fs.existsSync(envPath);

// Working Supabase credentials from our tests
const supabaseUrl = 'https://dvmfpddmnzaxjmxxpupk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bWZwZGRtbnpheGpteHhwdXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NDA3MTAsImV4cCI6MjA1ODIxNjcxMH0.99b38YXJbbNC8kjRpqQq96k0zaB5qwQ2vvcFdxHPH9Y';

// Function to read current .env file
function readEnvFile() {
  if (!envExists) {
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return envVars;
}

// Function to write updated .env file
function writeEnvFile(envVars) {
  const content = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
    
  fs.writeFileSync(envPath, content + '\n');
  console.log(`✅ Successfully updated ${envPath}`);
}

// Main function
async function main() {
  console.log('📝 Updating environment variables for tests...');
  
  // Read current .env
  const envVars = readEnvFile();
  
  // Check if OPENAI_API_KEY is set
  if (!envVars.OPENAI_API_KEY) {
    console.log('⚠️ OPENAI_API_KEY not found in .env');
    const useExisting = await askQuestion('Do you want to update your .env file with an OPENAI_API_KEY? (y/n): ');
    
    if (useExisting.toLowerCase() === 'y') {
      const apiKey = await askQuestion('Please enter your OpenAI API Key: ');
      if (apiKey.trim()) {
        envVars.OPENAI_API_KEY = apiKey.trim();
        console.log('✅ OPENAI_API_KEY will be added');
      }
    }
  } else {
    console.log('✅ OPENAI_API_KEY already exists in .env');
  }
  
  // Update Supabase credentials
  const updateSupabaseUrl = await askQuestion(`Update SUPABASE_URL to "${supabaseUrl}"? (y/n): `);
  if (updateSupabaseUrl.toLowerCase() === 'y') {
    envVars.SUPABASE_URL = supabaseUrl;
    console.log('✅ SUPABASE_URL will be updated');
  }
  
  const updateSupabaseKey = await askQuestion(`Update SUPABASE_KEY to use the working test key? (y/n): `);
  if (updateSupabaseKey.toLowerCase() === 'y') {
    envVars.SUPABASE_KEY = supabaseKey;
    console.log('✅ SUPABASE_KEY will be updated');
  }

  // Add test user info
  const addTestUser = await askQuestion('Do you want to add test user environment variables? (y/n): ');
  if (addTestUser.toLowerCase() === 'y') {
    envVars.TEST_USER_EMAIL = 'permanent-test-user@example.com';
    envVars.TEST_USER_FOCUS_AREA = 'reasoning';
    envVars.TEST_USER_FORMAT_TYPE = 'text';
    console.log('✅ Test user variables will be added');
  }
  
  // Save changes
  const confirmSave = await askQuestion('Save changes to .env file? (y/n): ');
  if (confirmSave.toLowerCase() === 'y') {
    writeEnvFile(envVars);
    console.log('');
    console.log('🎉 Environment variables updated successfully!');
    console.log('📋 You can now run the integration tests:');
    console.log('');
    console.log('   npm run test:integration:openai-supabase');
    console.log('');
  } else {
    console.log('❌ Changes discarded');
  }
  
  rl.close();
}

// Helper function to ask questions
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

// Run the script
main().catch(error => {
  console.error('Error:', error.message);
  rl.close();
  process.exit(1);
}); 