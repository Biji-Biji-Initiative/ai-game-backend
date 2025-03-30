#!/usr/bin/env node

/**
 * Server Verification Script
 * 
 * This script verifies that the application is running correctly by testing
 * various endpoints and features across any environment.
 */

import 'dotenv/config';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const START_SERVER = args.includes('--start-server');
const ENVIRONMENT = args.includes('--production') ? 'production' 
                  : args.includes('--testing') ? 'testing' 
                  : 'development';

// Set port based on environment
let PORT;
switch (ENVIRONMENT) {
  case 'production':
    PORT = process.env.PROD_PORT || 9000;
    break;
  case 'testing':
    PORT = process.env.TEST_PORT || 3002;
    break;
  default:
    PORT = process.env.DEV_PORT || 3000;
}

const BASE_URL = `http://localhost:${PORT}`;

// ANSI color codes for output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

/**
 * Logs a formatted message
 * @param {string} message - Message to log
 * @param {string} type - Message type (info, success, error, warning)
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  let color = colors.reset;
  
  switch (type) {
    case 'success':
      color = colors.green;
      break;
    case 'error':
      color = colors.red;
      break;
    case 'warning':
      color = colors.yellow;
      break;
    case 'info':
    default:
      color = colors.blue;
      break;
  }
  
  console.log(`${colors.bright}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`);
}

/**
 * Starts the server in the specified environment
 */
async function startServer() {
  log(`Starting server in ${ENVIRONMENT} mode on port ${PORT}...`);
  
  // Start the server as a separate process
  const serverProcess = spawn('node', ['src/index.js'], {
    env: { 
      ...process.env, 
      NODE_ENV: ENVIRONMENT, 
      PORT: PORT.toString() 
    },
    detached: true,
    stdio: 'inherit'
  });
  
  // Wait for server to start
  log('Waiting for server to start...', 'info');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  return serverProcess;
}

/**
 * Tests that the server is running
 * @returns {Promise<boolean>} True if server is running
 */
async function testServerRunning() {
  try {
    log('Testing if server is running...', 'info');
    const response = await fetch(`${BASE_URL}/api/v1/api-tester/health`);
    
    if (response.status === 200) {
      const data = await response.json();
      log('Server is running!', 'success');
      log(`Server response: ${JSON.stringify(data)}`, 'info');
      return true;
    } else {
      log(`Server responded with status: ${response.status}`, 'error');
      return false;
    }
  } catch (error) {
    log(`Failed to connect to server: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Tests various API endpoints
 * @returns {Promise<boolean>} True if all tests pass
 */
async function testEndpoints() {
  log('Testing API endpoints...', 'info');
  
  try {
    // Test a few key endpoints
    const endpoints = [
      { url: '/api/v1/challenges', name: 'Challenges' },
      { url: '/api/v1/progress/stats', name: 'Progress Stats' },
      { url: '/api/v1/auth/status', name: 'Auth Status' }
    ];
    
    let allPassed = true;
    
    for (const endpoint of endpoints) {
      log(`Testing ${endpoint.name} endpoint...`, 'info');
      const response = await fetch(`${BASE_URL}${endpoint.url}`);
      
      // Most endpoints will return 401 when not authenticated, which is expected
      if (response.status === 200 || response.status === 401) {
        log(`${endpoint.name} endpoint is accessible!`, 'success');
      } else {
        log(`${endpoint.name} endpoint returned status: ${response.status}`, 'error');
        allPassed = false;
      }
    }
    
    return allPassed;
  } catch (error) {
    log(`Error testing endpoints: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Runs all verification tests
 */
async function runVerification() {
  let serverProcess;
  
  try {
    log(`=== ${ENVIRONMENT.toUpperCase()} MODE VERIFICATION ===`, 'info');
    
    if (START_SERVER) {
      serverProcess = await startServer();
    }
    
    // Test server is running
    const serverRunning = await testServerRunning();
    if (!serverRunning) {
      log('Server test failed, aborting remaining tests', 'error');
      return false;
    }
    
    // Test API endpoints
    const endpointsPass = await testEndpoints();
    log(`API endpoints test: ${endpointsPass ? 'PASSED' : 'FAILED'}`, 
      endpointsPass ? 'success' : 'error');
    
    // Overall results
    const allPassed = serverRunning && endpointsPass;
    log(`\n=== VERIFICATION ${allPassed ? 'PASSED' : 'FAILED'} ===`, 
      allPassed ? 'success' : 'error');
    
    return allPassed;
  } catch (error) {
    log(`Verification error: ${error.message}`, 'error');
    return false;
  } finally {
    if (serverProcess && serverProcess.pid) {
      // Clean up server process if we started it
      log('Cleaning up server process...', 'info');
      process.kill(-serverProcess.pid);
    }
  }
}

// Run the verification
runVerification().then(passed => {
  process.exit(passed ? 0 : 1);
}); 