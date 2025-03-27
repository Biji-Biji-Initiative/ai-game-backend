/**
 * Run All Integration Tests
 * 
 * This script runs all integration tests in sequence and logs the results.
 * It provides a clean way to run all tests and see which ones pass and fail.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Ensure Supabase key is available in environment
if (process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_KEY) {
  process.env.SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  console.log('Using SUPABASE_ANON_KEY as SUPABASE_KEY');
}

// Define all integration tests to run
const integrationTests = [
  {
    name: 'Challenge Domain Flow',
    script: 'test:integration:openai-supabase',
    description: 'Tests challenge creation, storage and retrieval'
  },
  {
    name: 'Focus Area Domain Flow',
    script: 'test:integration:focus-area',
    description: 'Tests focus area creation, storage and retrieval'
  },
  {
    name: 'Evaluation Domain Flow',
    script: 'test:integration:evaluation',
    description: 'Tests evaluation creation, storage and retrieval'
  },
  {
    name: 'Prompt Domain Flow',
    script: 'test:integration:prompt',
    description: 'Tests prompt template creation, storage and retrieval'
  },
  {
    name: 'User Domain Flow',
    script: 'test:integration:user',
    description: 'Tests user creation, update, focus area setting and retrieval'
  },
  {
    name: 'Challenge-Evaluation Cross-Domain Flow',
    script: 'test:integration:challenge-evaluation',
    description: 'Tests challenge creation, response evaluation and link verification'
  }
];

// Create results directory if it doesn't exist
const resultsDir = path.join(__dirname, '../test-results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Log file for this run
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(resultsDir, `integration-tests-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Helper to log to both console and file
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

// Function to run a test and return a promise
function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n\n${'-'.repeat(80)}`);
    console.log(`RUNNING TEST: ${test.name}`);
    console.log(`DESCRIPTION: ${test.description}`);
    console.log(`${'-'.repeat(80)}\n`);

    const testProcess = spawn('npm', ['run', test.script], { 
      stdio: 'inherit',
      shell: true
    });

    testProcess.on('close', (code) => {
      const result = {
        name: test.name,
        passed: code === 0,
        exitCode: code
      };

      if (result.passed) {
        console.log(`\n✅ TEST PASSED: ${test.name}\n`);
      } else {
        console.log(`\n❌ TEST FAILED: ${test.name} (Exit code: ${code})\n`);
      }

      resolve(result);
    });
  });
}

// Run all tests in sequence
async function runAllTests() {
  console.log('\n🧪 STARTING INTEGRATION TEST SUITE');
  console.log('================================\n');

  const results = [];
  const startTime = Date.now();

  for (const test of integrationTests) {
    const result = await runTest(test);
    results.push(result);
  }

  const duration = (Date.now() - startTime) / 1000;

  // Log summary
  console.log('\n\n📋 TEST SUMMARY');
  console.log('=============\n');
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  });

  const passedCount = results.filter(r => r.passed).length;
  
  console.log(`\n${passedCount}/${results.length} tests passed`);
  console.log(`Total time: ${duration.toFixed(2)} seconds\n`);
  
  // Close log file
  logStream.end();

  // Exit with code 1 if any test failed
  if (passedCount < results.length) {
    process.exit(1);
  }
}

runAllTests(); 