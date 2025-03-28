#!/usr/bin/env node

/**
 * Test Runner Script
 * 
 * A unified CLI tool for running tests with proper environment configuration
 * and better output formatting.
 * 
 * Usage:
 *   node scripts/run-tests.js [options] [test-pattern]
 * 
 * Examples:
 *   node scripts/run-tests.js                     # Run all tests
 *   node scripts/run-tests.js --domain            # Run domain tests
 *   node scripts/run-tests.js --integration       # Run integration tests
 *   node scripts/run-tests.js --external          # Run external API tests
 *   node scripts/run-tests.js --focus=challenge   # Run tests for the challenge feature
 *   node scripts/run-tests.js tests/domain/user   # Run specific test directory
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// Parse command line arguments
const args = process.argv.slice(2);
let testPattern = 'tests/**/*.test.js';
let testCategory = 'all';
let focusArea = null;
let skipOpenAI = false;
let skipSupabase = false;

// Process arguments
args.forEach(arg => {
  if (arg === '--domain') {
    testPattern = 'tests/domain/**/*.test.js';
    testCategory = 'domain';
  } else if (arg === '--integration') {
    testPattern = 'tests/integration/**/*.test.js';
    testCategory = 'integration';
  } else if (arg === '--external') {
    testPattern = 'tests/external/**/*.test.js';
    testCategory = 'external';
  } else if (arg === '--e2e') {
    testPattern = 'tests/e2e/**/*.test.js';
    testCategory = 'e2e';
  } else if (arg === '--unit') {
    testPattern = 'tests/unit/**/*.test.js';
    testCategory = 'unit';
  } else if (arg === '--application') {
    testPattern = 'tests/application/**/*.test.js';
    testCategory = 'application';
  } else if (arg === '--skip-openai') {
    skipOpenAI = true;
  } else if (arg === '--skip-supabase') {
    skipSupabase = true;
  } else if (arg.startsWith('--focus=')) {
    focusArea = arg.split('=')[1];
    
    // Define test pattern based on focus area
    switch (focusArea) {
      case 'challenge':
        testPattern = '{tests/domain/challenge/**/*.test.js,tests/integration/challenge/**/*.test.js,tests/external/openai/direct/challengeGeneration.direct.test.js}';
        break;
      case 'focusArea':
        testPattern = '{tests/domain/focusArea/**/*.test.js,tests/integration/focusArea/**/*.test.js}';
        break;
      case 'evaluation':
        testPattern = '{tests/domain/evaluation/**/*.test.js,tests/integration/evaluation/**/*.test.js}';
        break;
      case 'user':
        testPattern = '{tests/domain/user/**/*.test.js,tests/integration/user/**/*.test.js}';
        break;
      default:
        // Try to match pattern to test files
        testPattern = `**/*${focusArea}*/**/*.test.js`;
    }
  } else if (!arg.startsWith('--') && !arg.startsWith('-')) {
    // If it's a path-like argument, use it directly
    testPattern = arg;
    if (!testPattern.includes('*') && !testPattern.endsWith('.js')) {
      // If it's a directory, add the wildcard pattern
      testPattern = path.join(testPattern, '**/*.test.js');
    }
  }
});

console.log(chalk.blue('=== Responses API Test Runner ==='));
console.log(chalk.cyan(`Category: ${testCategory.toUpperCase()}`));
if (focusArea) {
  console.log(chalk.cyan(`Focus: ${focusArea}`));
}
console.log(chalk.cyan(`Pattern: ${testPattern}`));
console.log(chalk.cyan('-------------------------------'));

// Environment validation
const envFile = path.resolve(process.cwd(), '.env.test');
const hasEnvFile = fs.existsSync(envFile);

if (!hasEnvFile) {
  console.log(chalk.yellow('⚠️  Warning: No .env.test file found!'));
  console.log(chalk.yellow('    Some tests requiring API credentials may be skipped.'));
  console.log(chalk.yellow('    Consider copying .env.test.example to .env.test and updating credentials.'));
  console.log('');
}

// Create the Mocha command
const mochaArgs = ['--require', './tests/loadEnv.js', testPattern, '--recursive'];

// Check if we need to skip certain tests
if (skipOpenAI) {
  process.env.SKIP_OPENAI_TESTS = 'true';
  console.log(chalk.yellow('OpenAI tests will be skipped'));
}

if (skipSupabase) {
  process.env.SKIP_SUPABASE_TESTS = 'true';
  console.log(chalk.yellow('Supabase tests will be skipped'));
}

// Actually run the tests
console.log(chalk.green('Running tests...\n'));

const mochaProcess = spawn('npx', ['mocha', ...mochaArgs], {
  stdio: 'inherit',
  env: process.env
});

mochaProcess.on('close', (code) => {
  if (code === 0) {
    console.log(chalk.green('\n✅ All tests passed!'));
  } else {
    console.log(chalk.red(`\n❌ Tests failed with exit code ${code}`));
    process.exit(code);
  }
}); 