#!/usr/bin/env node

/**
 * Test Runner Script
 * 
 * An interactive script to help run tests in different categories.
 * Makes it easier to run specific test groups without remembering
 * all the npm commands.
 */

const readline = require('readline');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test categories
const TEST_CATEGORIES = [
  {
    name: 'All Tests',
    command: 'npm test',
    description: 'Run all tests'
  },
  {
    name: 'Domain Tests',
    command: 'npx mocha tests/domains/**/*.test.js',
    description: 'Run all domain-specific tests'
  },
  {
    name: 'Challenge Domain',
    command: 'npx mocha tests/domains/challenge/**/*.test.js',
    description: 'Run challenge domain tests'
  },
  {
    name: 'Focus Area Domain',
    command: 'npx mocha tests/domains/focusArea/**/*.test.js',
    description: 'Run focus area domain tests'
  },
  {
    name: 'Evaluation Domain',
    command: 'npx mocha tests/domains/evaluation/**/*.test.js',
    description: 'Run evaluation domain tests'
  },
  {
    name: 'Prompt Domain',
    command: 'npx mocha tests/domains/prompt/**/*.test.js',
    description: 'Run prompt domain tests'
  },
  {
    name: 'Integration Tests',
    command: 'npx mocha tests/integration/**/*.test.js',
    description: 'Run cross-domain integration tests'
  },
  {
    name: 'OpenAI-Supabase Flow',
    command: 'npm run test:integration:openai-supabase',
    description: 'Run integration test for OpenAI to Supabase flow (tests domain architecture with real APIs)'
  },
  {
    name: 'Real API Tests',
    command: 'npx mocha tests/real-api/**/*.test.js',
    description: 'Run tests with real APIs (requires API keys)'
  },
  {
    name: 'External Service Tests',
    command: 'npx mocha tests/external/**/*.test.js',
    description: 'Run tests for external service integration'
  },
  {
    name: 'OpenAI API Logs',
    command: 'npm run test:openai:logs',
    description: 'Run OpenAI API logging tests to capture request/response data'
  },
  {
    name: 'Supabase DB Logs',
    command: 'npm run test:supabase:logs',
    description: 'Run Supabase database logging tests to verify storage operations'
  },
  {
    name: 'Shared Component Tests',
    command: 'npx mocha tests/shared/**/*.test.js',
    description: 'Run tests for shared utilities and components'
  },
  {
    name: 'End-to-End Tests',
    command: 'npx mocha tests/e2e/**/*.test.js',
    description: 'Run end-to-end workflow tests'
  },
  {
    name: 'Check Test Structure',
    command: 'node scripts/test-structure-check.js',
    description: 'Analyze test directory structure'
  },
  {
    name: 'Legacy Tests',
    command: 'npx mocha tests/legacy/**/*.test.js',
    description: 'Run tests in the legacy directory (not recommended)'
  }
];

// Main menu
function showMainMenu() {
  console.log('\n--------- Test Runner ---------\n');
  console.log('Choose a test category to run:');
  
  TEST_CATEGORIES.forEach((category, index) => {
    console.log(`${index + 1}. ${category.name} - ${category.description}`);
  });
  
  console.log('\n0. Exit');
  
  rl.question('\nEnter your choice (number): ', (answer) => {
    const choice = parseInt(answer, 10);
    
    if (choice === 0) {
      rl.close();
      return;
    }
    
    if (choice > 0 && choice <= TEST_CATEGORIES.length) {
      const selected = TEST_CATEGORIES[choice - 1];
      
      console.log(`\nRunning ${selected.name}...\n`);
      
      try {
        execSync(selected.command, { stdio: 'inherit' });
        console.log(`\n${selected.name} completed.`);
      } catch (error) {
        console.log(`\n${selected.name} failed with code ${error.status}.`);
      }
      
      askToContinue();
    } else {
      console.log('Invalid choice. Please try again.');
      showMainMenu();
    }
  });
}

// Ask if the user wants to run more tests
function askToContinue() {
  rl.question('\nDo you want to run more tests? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      showMainMenu();
    } else {
      rl.close();
    }
  });
}

// Add the script to package.json if not already there
try {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (!packageJson.scripts['test:run']) {
    packageJson.scripts['test:run'] = 'node scripts/run-tests.js';
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('Added test:run script to package.json');
  }
} catch (error) {
  console.error('Error updating package.json:', error.message);
}

// Start the menu
showMainMenu(); 