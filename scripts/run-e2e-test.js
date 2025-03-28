#!/usr/bin/env node

/**
 * Run E2E Focus Area Test
 * 
 * This script properly loads environment variables from .env.test and then runs
 * the focus area E2E test with real API connections.
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { spawn } = require('child_process');

// Load environment variables from .env.test
const envPath = path.resolve(__dirname, '../.env.test');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  
  // Set each variable in the environment
  for (const key in envConfig) {
    process.env[key] = envConfig[key];
  }
} else {
  console.error('.env.test file not found!');
  process.exit(1);
}

// Verify key environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY || !process.env.OPENAI_API_KEY) {
  console.error('Required environment variables are missing:');
  console.error(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set' : 'Missing'}`);
  console.error(`SUPABASE_KEY: ${process.env.SUPABASE_KEY ? 'Set' : 'Missing'}`);
  console.error(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set' : 'Missing'}`);
  process.exit(1);
}

// Set API URL
process.env.API_URL = process.env.API_URL || 'http://localhost:3000/api';
process.env.NODE_ENV = 'test';

console.log('Environment variables loaded successfully:');
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set' : 'Missing'}`);
console.log(`SUPABASE_KEY: ${process.env.SUPABASE_KEY ? 'Set' : 'Missing'}`);
console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set' : 'Missing'}`);
console.log(`API_URL: ${process.env.API_URL}`);

// Run the focus area tests
console.log('\nRunning Focus Area tests with real connections...\n');

// Determine which test to run
const testFile = process.argv[2] || 'tests/external/openai/focusArea.external.test.js';

// Run the test with the loaded environment
const mochaArgs = [
  testFile,
  '--timeout', '60000'
];

const mocha = spawn('npx', ['mocha', ...mochaArgs], {
  stdio: 'inherit',
  env: process.env
});

mocha.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Tests completed successfully!');
  } else {
    console.error(`\n❌ Tests failed with exit code ${code}`);
  }
  process.exit(code);
}); 