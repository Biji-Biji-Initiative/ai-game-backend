#!/usr/bin/env node

/**
 * Domain Test Runner
 * 
 * This script runs only domain tests that don't depend on external services like
 * Supabase or OpenAI. It focuses on tests that use in-memory repositories and mocks.
 * 
 * Usage: node scripts/run-domain-tests.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// ANSI color codes for output formatting
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Find all domain test files
 * @returns {Promise<string[]>} Array of test file paths
 */
async function findDomainTestFiles() {
  const testDir = path.join(__dirname, '../tests/domain');
  const testFiles = [];
  
  async function scanDirectory(directory) {
    try {
      const entries = await readdir(directory);
      
      for (const entry of entries) {
        const entryPath = path.join(directory, entry);
        const entryStat = await stat(entryPath);
        
        if (entryStat.isDirectory()) {
          // Recursively scan subdirectories
          await scanDirectory(entryPath);
        } else if (entryStat.isFile() && 
                  (entry.endsWith('.test.js') || entry.endsWith('.spec.js'))) {
          testFiles.push(entryPath);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${directory}:`, error.message);
    }
  }
  
  await scanDirectory(testDir);
  return testFiles;
}

/**
 * Run tests using Mocha
 * @param {string[]} testFiles - Array of test file paths
 */
function runTests(testFiles) {
  if (testFiles.length === 0) {
    console.log(`${COLORS.yellow}No domain tests found.${COLORS.reset}`);
    return;
  }
  
  console.log(`${COLORS.bright}${COLORS.green}Running ${testFiles.length} domain tests...${COLORS.reset}\n`);
  
  // Group test files by domain for better organization
  const testsByDomain = {};
  for (const file of testFiles) {
    const pathParts = file.split(path.sep);
    const domainIndex = pathParts.indexOf('domain') + 1;
    const domain = pathParts[domainIndex] || 'other';
    
    if (!testsByDomain[domain]) {
      testsByDomain[domain] = [];
    }
    testsByDomain[domain].push(file);
  }
  
  // Display test files grouped by domain
  for (const [domain, files] of Object.entries(testsByDomain)) {
    console.log(`${COLORS.cyan}${domain} tests (${files.length}):${COLORS.reset}`);
    for (const file of files) {
      console.log(`  - ${path.relative(__dirname, file)}`);
    }
    console.log('');
  }
  
  // Path to the mock setup file
  const setupFile = path.join(__dirname, '../tests/setup/mockSetup.js');
  
  // Build the Mocha command
  const mochaArgs = [
    'mocha',
    '--require', setupFile,
    ...testFiles,
    '--timeout', '10000'
  ];
  
  // Run Mocha with all the test files
  const mocha = spawn('npx', mochaArgs, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  });
  
  mocha.on('close', (code) => {
    if (code === 0) {
      console.log(`\n${COLORS.bright}${COLORS.green}✅ All tests passed successfully!${COLORS.reset}`);
    } else {
      console.log(`\n${COLORS.bright}${COLORS.red}❌ Some tests failed with exit code ${code}${COLORS.reset}`);
    }
  });
}

/**
 * Main function
 */
async function main() {
  try {
    // Make sure mock setup file exists
    const setupFile = path.join(__dirname, '../tests/setup/mockSetup.js');
    if (!fs.existsSync(setupFile)) {
      console.error(`${COLORS.red}Mock setup file not found: ${setupFile}${COLORS.reset}`);
      process.exit(1);
    }
    
    // Find domain tests
    const testFiles = await findDomainTestFiles();
    
    // Run the tests with mocks
    runTests(testFiles);
  } catch (error) {
    console.error(`${COLORS.red}Error:${COLORS.reset}`, error);
    process.exit(1);
  }
}

// Run the script
main(); 