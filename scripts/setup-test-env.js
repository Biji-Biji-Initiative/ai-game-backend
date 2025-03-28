/**
 * Test Environment Setup Script
 * 
 * Helps developers set up their test environment by:
 * 1. Creating test.env from template if it doesn't exist
 * 2. Validating environment variables
 * 3. Testing connections to external services
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const chalk = require('chalk');

const copyFile = promisify(fs.copyFile);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function setupTestEnv() {
  console.log(chalk.blue('\nSetting up test environment...\n'));
  
  const testEnvPath = path.join(__dirname, '..', 'tests', 'config', 'test.env');
  const testEnvExamplePath = path.join(__dirname, '..', 'tests', 'config', 'test.env.example');
  
  // Create test.env if it doesn't exist
  if (!fs.existsSync(testEnvPath)) {
    if (!fs.existsSync(testEnvExamplePath)) {
      console.log(chalk.yellow('Creating test.env template...'));
      
      // Copy our template content
      await writeFile(testEnvExamplePath, `# Test Environment Configuration

# API URLs
API_URL=http://localhost:3000/api
TEST_API_URL=http://localhost:3000/api

# Supabase Configuration
SUPABASE_URL=https://dvmfpddmnzaxjmxxpupk.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bWZwZGRtbnpheGpteHhwdXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NDA3MTAsImV4cCI6MjA1ODIxNjcxMH0.99b38YXJbbNC8kjRpqQq96k0zaB5qwQ2vvcFdxHPH9Y
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bWZwZGRtbnpheGpteHhwdXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NDA3MTAsImV4cCI6MjA1ODIxNjcxMH0.99b38YXJbbNC8kjRpqQq96k0zaB5qwQ2vvcFdxHPH9Y
SUPABASE_JWT_SECRET=your_test_jwt_secret

# OpenAI Configuration
OPENAI_API_KEY=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

# Test Configuration
TEST_LOG_LEVEL=error
TEST_TIMEOUT=15000
NODE_ENV=test

# Test User Defaults
TEST_USER_PASSWORD=Test1234!
TEST_USER_ROLE=user`);
    }
    
    await copyFile(testEnvExamplePath, testEnvPath);
    console.log(chalk.green('Created test.env from template'));
  }
  
  // Load and validate environment
  console.log(chalk.blue('\nValidating environment variables...'));
  
  const testEnv = require('../tests/helpers/setupTestEnv');
  const env = testEnv.init();
  
  console.log(chalk.green('✓ Environment variables validated'));
  
  // Test Supabase connection
  console.log(chalk.blue('\nTesting Supabase connection...'));
  
  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      throw error;
    }
    
    console.log(chalk.green('✓ Supabase connection successful'));
  } catch (error) {
    console.log(chalk.red('✗ Supabase connection failed:'), error.message);
    console.log(chalk.yellow('Please check your Supabase credentials in test.env'));
  }
  
  // Test OpenAI Responses API connection
  console.log(chalk.blue('\nTesting OpenAI Responses API connection...'));
  
  try {
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY
    });
    
    // Test a simple response using the Responses API
    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: 'Test connection',
      instructions: 'Respond with "Connection successful" if you receive this message.'
    });
    
    if (response && response.output_text) {
      console.log(chalk.green('✓ OpenAI Responses API connection successful'));
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log(chalk.red('✗ OpenAI Responses API connection failed:'), error.message);
    console.log(chalk.yellow('Please check your OpenAI API key in test.env'));
  }
  
  console.log(chalk.blue('\nSetup complete!\n'));
  console.log('To run tests:');
  console.log('1. Make sure your test.env file has valid credentials');
  console.log('2. Run specific test suites with:');
  console.log('   npm run test:api:user');
  console.log('   npm run test:api:personality');
  console.log('   npm run test:api:cross-domain');
  console.log('\nOr run all API tests with:');
  console.log('   npm run test:api\n');
}

// Run setup
setupTestEnv().catch(console.error); 