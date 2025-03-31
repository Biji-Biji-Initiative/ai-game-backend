#!/usr/bin/env node

/**
 * Environment Variables Verification Script
 * 
 * This script checks for the presence of required environment variables
 * before starting the application with PM2. It's intended to be called
 * from the start.sh script.
 */

import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Load environment variables from .env file
const envFile = path.join(rootDir, '.env');
const envExists = fs.existsSync(envFile);

console.log(`${colors.blue}Checking environment variables in ${envFile}${colors.reset}`);

if (!envExists) {
  console.log(`${colors.yellow}No .env file found.${colors.reset}`);
  
  const envExample = path.join(rootDir, '.env.example');
  if (fs.existsSync(envExample)) {
    console.log(`${colors.yellow}Creating .env from .env.example...${colors.reset}`);
    fs.copyFileSync(envExample, envFile);
    console.log(`${colors.green}Created .env file. Please update with your actual values.${colors.reset}`);
  } else {
    console.log(`${colors.red}No .env.example file found. Creating empty .env file.${colors.reset}`);
    fs.writeFileSync(envFile, '# Environment Variables\n\n');
    console.log(`${colors.red}WARNING: Empty .env file created. App will likely fail to start properly.${colors.reset}`);
  }
}

// Load the variables
dotenv.config({ path: envFile });

// Define required variables for each environment
const requiredVars = {
  development: [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'SUPABASE_ANON_KEY',
    'OPENAI_API_KEY'
  ],
  production: [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'SUPABASE_ANON_KEY',
    'OPENAI_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ],
  testing: [
    'SUPABASE_URL',
    'SUPABASE_KEY'
  ]
};

// Get the current environment
const environment = process.env.NODE_ENV || 'development';
const varsToCheck = requiredVars[environment] || requiredVars.development;

console.log(`${colors.blue}Checking required variables for ${colors.bold}${environment}${colors.reset} environment`);

// Check for missing variables
const missing = [];
varsToCheck.forEach(varName => {
  if (!process.env[varName]) {
    missing.push(varName);
  }
});

// Report results
if (missing.length === 0) {
  console.log(`${colors.green}✓ All required environment variables are set${colors.reset}`);
  process.exit(0); // Success
} else {
  console.log(`${colors.red}✗ Missing required environment variables:${colors.reset}`);
  missing.forEach(varName => {
    console.log(`${colors.red}  - ${varName}${colors.reset}`);
  });
  
  if (environment === 'development') {
    console.log(`${colors.yellow}WARNING: Starting in development mode with missing variables.${colors.reset}`);
    console.log(`${colors.yellow}Some features may use mock implementations.${colors.reset}`);
    process.exit(0); // Allow to proceed in development
  } else {
    console.log(`${colors.red}ERROR: Cannot start in ${environment} mode with missing variables.${colors.reset}`);
    process.exit(1); // Fail in production/testing
  }
} 