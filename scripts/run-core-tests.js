#!/usr/bin/env node

/**
 * Run Core Domain Tests
 * 
 * This script runs only the core domain tests that don't require external dependencies
 * like Supabase or OpenAI. It focuses on testing business logic with mocked dependencies.
 * 
 * Usage: node scripts/run-core-tests.js
 */

const { spawn } = require('child_process');
const path = require('path');

// List of test suites to run
const TEST_SUITES = [
  // Domain model tests
  'tests/domain/**/models/*.test.js',
  // Domain services with mocks
  'tests/domain/prompt/builders/*.test.js',
  'tests/domain/challenge/validators/*.test.js',
  'tests/domain/shared/*.test.js',
];

// Colors for console output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Run a test suite with Mocha
 * @param {string} pattern - Test pattern to run
 * @returns {Promise<boolean>} True if tests passed
 */
function runTestSuite(pattern) {
  return new Promise((resolve) => {
    console.log(`${COLORS.cyan}Running tests: ${COLORS.bright}${pattern}${COLORS.reset}`);
    
    const args = [
      '--require', './tests/helpers/globalSetup.js',
      pattern,
      '--color'
    ];
    
    const mochaProcess = spawn('npx', ['mocha', ...args], {
      stdio: 'inherit',
      shell: true
    });
    
    mochaProcess.on('close', (code) => {
      const passed = code === 0;
      if (passed) {
        console.log(`${COLORS.green}✓ Tests passed: ${pattern}${COLORS.reset}\n`);
      } else {
        console.log(`${COLORS.red}✗ Tests failed: ${pattern}${COLORS.reset}\n`);
      }
      resolve(passed);
    });
  });
}

/**
 * Main function to run all test suites
 */
async function main() {
  console.log(`\n${COLORS.bright}${COLORS.blue}Running Core Domain Tests${COLORS.reset}\n`);
  console.log(`${COLORS.dim}These tests run without external dependencies and focus on core business logic.${COLORS.reset}\n`);
  
  const results = [];
  
  for (const testSuite of TEST_SUITES) {
    const passed = await runTestSuite(testSuite);
    results.push({ pattern: testSuite, passed });
  }
  
  // Print summary
  console.log(`\n${COLORS.bright}${COLORS.blue}Test Summary${COLORS.reset}\n`);
  
  let passedCount = 0;
  let failedCount = 0;
  
  for (const result of results) {
    if (result.passed) {
      console.log(`${COLORS.green}✓ ${result.pattern}${COLORS.reset}`);
      passedCount++;
    } else {
      console.log(`${COLORS.red}✗ ${result.pattern}${COLORS.reset}`);
      failedCount++;
    }
  }
  
  console.log(`\n${COLORS.bright}Results: ${passedCount} passed, ${failedCount} failed${COLORS.reset}\n`);
  
  // Exit with non-zero code if any tests failed
  process.exit(failedCount > 0 ? 1 : 0);
}

// Run the script
main().catch(error => {
  console.error(`${COLORS.red}❌ Error: ${error.message}${COLORS.reset}`);
  process.exit(1);
}); 