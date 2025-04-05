#!/usr/bin/env node
/**
 * Central Test Runner
 * 
 * This script provides a centralized way to run different categories of tests
 * with consistent configuration and environment setup.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration ---
const TEST_CATEGORIES = {
  all: { 
    pattern: 'tests/**/*.test.js', 
    env: '.env.test', 
    needsEnv: false, 
    setup: 'tests/config/envLoader.js',
    description: 'All tests in the test directory'
  },
  domain: { 
    pattern: 'tests/domain/**/*.test.js', 
    env: '.env.test', 
    needsEnv: false, 
    setup: 'tests/config/envLoader.js',
    description: 'Domain tests (business logic)'
  },
  integration: { 
    pattern: 'tests/integration/**/*.test.js', 
    env: '.env.test', 
    needsEnv: true, 
    setup: 'tests/config/envLoader.js',
    description: 'Integration tests (multiple components working together)'
  },
  external: { 
    pattern: 'tests/external/**/*.test.js', 
    env: '.env.test', 
    needsEnv: true, 
    setup: 'tests/config/envLoader.js',
    description: 'External tests (Supabase, OpenAI)'
  },
  e2e: { 
    pattern: 'tests/e2e/**/*.test.js', 
    env: '.env.test', 
    needsEnv: true, 
    setup: 'tests/config/envLoader.js',
    description: 'End-to-end tests'
  },
  unit: { 
    pattern: 'tests/unit/**/*.test.js', 
    env: '.env.test', 
    needsEnv: false, 
    setup: 'tests/config/envLoader.js',
    description: 'Unit tests (individual components)'
  },
  application: { 
    pattern: 'tests/application/**/*.test.js', 
    env: '.env.test', 
    needsEnv: false, 
    setup: 'tests/config/envLoader.js',
    description: 'Application tests (services, controllers)'
  },
};

const DEFAULT_CATEGORY = 'all';
const DEFAULT_TIMEOUT = 15000; // 15 seconds
const EXTERNAL_TIMEOUT = 60000; // 60 seconds for external tests
// --- End Configuration ---

/**
 * Displays the usage help message
 */
function displayHelp() {
  console.log(chalk.blue.bold('=== AI Fight Club Test Runner ==='));
  console.log('\nUsage: node scripts/run-tests.js [category] [options]');
  console.log('\nCategories:');
  
  Object.keys(TEST_CATEGORIES).forEach(category => {
    console.log(`  ${chalk.cyan(category.padEnd(12))} ${TEST_CATEGORIES[category].description}`);
  });
  
  console.log('\nOptions:');
  console.log(`  ${chalk.yellow('--watch, -w')}       Run tests in watch mode`);
  console.log(`  ${chalk.yellow('--skip-openai')}     Skip OpenAI-dependent tests`);
  console.log(`  ${chalk.yellow('--skip-supabase')}   Skip Supabase-dependent tests`);
  console.log(`  ${chalk.yellow('--focus=<pattern>')} Focus on tests matching pattern`);
  console.log(`  ${chalk.yellow('--timeout=<ms>')}    Set test timeout in milliseconds`);
  console.log(`  ${chalk.yellow('--help, -h')}        Display this help message\n`);
  
  console.log('Examples:');
  console.log('  node scripts/run-tests.js domain');
  console.log('  node scripts/run-tests.js integration --skip-openai');
  console.log('  node scripts/run-tests.js --focus=challenge --watch');
}

// --- Argument Parsing ---
const args = process.argv.slice(2);
let category = DEFAULT_CATEGORY;
let specificPattern = null;
let watchMode = false;
let skipOpenAI = false;
let skipSupabase = false;
let timeout = null;
let showHelp = false;

args.forEach(arg => {
  if (arg === '--watch' || arg === '-w') {
    watchMode = true;
  } else if (arg === '--skip-openai') {
    skipOpenAI = true;
  } else if (arg === '--skip-supabase') {
    skipSupabase = true;
  } else if (arg === '--help' || arg === '-h') {
    showHelp = true;
  } else if (arg.startsWith('--timeout=')) {
    timeout = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--focus=')) {
    specificPattern = arg.split('=')[1];
  } else if (TEST_CATEGORIES[arg]) {
    category = arg;
  } else if (!arg.startsWith('--')) {
    // Assume it's a specific file/pattern if not a known category
    specificPattern = arg;
  }
});

// Show help and exit if requested
if (showHelp) {
  displayHelp();
  process.exit(0);
}

const selectedCategory = TEST_CATEGORIES[category];
let finalPattern;

if (specificPattern) {
  // If focusing on a specific pattern
  if (specificPattern.includes('/') || specificPattern.endsWith('.js')) {
    // If it looks like a file path, use it directly
    finalPattern = specificPattern;
  } else {
    // Otherwise, use it as a filter within the selected category
    finalPattern = selectedCategory.pattern.replace('**/*.test.js', `**/*${specificPattern}*/**/*.test.js`);
  }
} else {
  finalPattern = selectedCategory.pattern;
}

const customTimeout = timeout || ((category === 'external' || category === 'e2e') ? EXTERNAL_TIMEOUT : DEFAULT_TIMEOUT);
// --- End Argument Parsing ---

// --- Environment Setup ---
console.log(chalk.blue.bold('=== AI Fight Club Test Runner ==='));
console.log(chalk.cyan(`Selected category: ${category.toUpperCase()}`));
console.log(chalk.cyan(`Test pattern: ${finalPattern}`));

const rootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(rootDir, selectedCategory.env);

if (!fs.existsSync(envPath) && selectedCategory.needsEnv) {
  console.error(chalk.red(`✗ Environment file not found: ${envPath}`));
  console.error(chalk.red('  Run `node scripts/setup/setup-env.js` first.'));
  process.exit(1);
}

// Load env file
try {
  dotenv.config({ path: envPath });
} catch (error) {
  console.warn(chalk.yellow(`Warning: Error loading environment from ${envPath}: ${error.message}`));
}

// Check essential credentials if needed
if (selectedCategory.needsEnv) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn(chalk.yellow('⚠️ Supabase credentials missing. Supabase-dependent tests may fail or be skipped.'));
  }
  if (!openaiKey) {
    console.warn(chalk.yellow('⚠️ OpenAI API key missing. OpenAI-dependent tests may fail or be skipped.'));
  }
}

// Set SKIP environment variables if flags are passed
if (skipOpenAI) {
  process.env.SKIP_OPENAI_TESTS = 'true';
  console.log(chalk.yellow('⚠️ OpenAI tests will be skipped due to --skip-openai flag'));
}
if (skipSupabase) {
  process.env.SKIP_SUPABASE_TESTS = 'true';
  console.log(chalk.yellow('⚠️ Supabase tests will be skipped due to --skip-supabase flag'));
}
// --- End Environment Setup ---

// --- Mocha Execution ---
const mochaArgs = [
  'mocha',
  ...(selectedCategory.setup ? ['--require', selectedCategory.setup] : []),
  finalPattern,
  '--recursive',
  '--timeout', customTimeout.toString(),
  '--colors', // Enable colors
  ...(watchMode ? ['--watch'] : []),
];

console.log(chalk.green(`\n🚀 Running tests (Timeout: ${customTimeout / 1000}s)...`));
console.log(chalk.dim(`   Command: npx ${mochaArgs.join(' ')}`));

const mochaProcess = spawn('npx', mochaArgs, {
  stdio: 'inherit',
  env: process.env, // Pass current environment variables
  shell: true // Use shell to handle glob patterns correctly
});

mochaProcess.on('close', code => {
  console.log(chalk.cyan('\n-------------------------------'));
  if (code === 0) {
    console.log(chalk.green.bold('✅ All tests passed!'));
  } else {
    console.error(chalk.red.bold(`❌ Tests failed with exit code ${code}`));
  }
  process.exit(code); // Exit with the same code as Mocha
});

mochaProcess.on('error', err => {
  console.error(chalk.red('Failed to start Mocha process:'), err);
  process.exit(1);
});

/**
 * Run a specific test or category of tests
 * @param {string} category - Test category (unit, domain, integration, etc.)
 * @param {Object} options - Test options
 * @param {string} options.focus - Optional focus pattern for specific tests
 * @param {boolean} options.updateSnapshots - Whether to update snapshots
 * @returns {Promise<number>} Process exit code
 */
async function runTests(category, options = {}) {
  const { focus, updateSnapshots } = options;
  const testCategories = {
    unit: {
      pattern: 'tests/unit',
      timeout: 5000,
      require: 'tests/loadEnv.js'
    },
    domain: {
      pattern: 'tests/domain',
      timeout: 15000,
      require: 'tests/loadEnv.js'
    },
    integration: {
      pattern: 'tests/integration',
      timeout: 30000,
      require: 'tests/loadEnv.js'
    },
    external: {
      pattern: 'tests/external',
      timeout: 60000,
      require: 'tests/loadEnv.js'
    },
    e2e: {
      pattern: 'tests/e2e',
      timeout: 60000,
      require: 'tests/loadEnv.js'
    },
    all: {
      pattern: 'tests',
      timeout: 60000,
      require: 'tests/loadEnv.js'
    }
  };
} 