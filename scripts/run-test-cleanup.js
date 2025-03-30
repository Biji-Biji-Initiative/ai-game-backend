#!/usr/bin/env node

/**
 * Script to run the entire test cleanup process
 * This is a wrapper that runs the analysis and cleanup scripts in sequence
 */

import { execSync } from 'child_process';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt the user for confirmation
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

// Function to run a command and display its output
function runCommand(command, showOutput = true) {
  console.log(`\nRunning: ${command}\n`);
  try {
    if (showOutput) {
      execSync(command, { cwd: projectRoot, stdio: 'inherit' });
    } else {
      execSync(command, { cwd: projectRoot });
    }
    return true;
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log('===================================================');
  console.log('       TEST CLEANUP AUTOMATION WIZARD');
  console.log('===================================================');
  console.log('\nThis script will guide you through the process of cleaning up your test files.');
  console.log('It will run the analysis first, then prompt you before performing the cleanup.');
  
  // Step 1: Run the analysis
  console.log('\n--- STEP 1: ANALYSIS ---');
  const analysisSuccess = runCommand('node scripts/test-analysis.js');
  
  if (!analysisSuccess) {
    console.error('\nAnalysis failed. Please check the errors above and try again.');
    process.exit(1);
  }
  
  // Ask if user wants to proceed
  const proceed = await prompt('\nThe analysis is complete. Would you like to proceed with the cleanup? (y/n): ');
  
  if (proceed !== 'y' && proceed !== 'yes') {
    console.log('\nCleanup aborted. You can run the cleanup script later using:');
    console.log('  node scripts/aggressive-test-cleanup.js');
    rl.close();
    return;
  }
  
  // Step 2: Run the cleanup
  console.log('\n--- STEP 2: CLEANUP ---');
  console.log('\nWARNING: This will modify your test files!');
  console.log('A backup will be created in the tests-backup directory.');
  
  const confirm = await prompt('Are you sure you want to proceed? (y/n): ');
  
  if (confirm !== 'y' && confirm !== 'yes') {
    console.log('\nCleanup aborted.');
    rl.close();
    return;
  }
  
  const cleanupSuccess = runCommand('node scripts/aggressive-test-cleanup.js');
  
  if (!cleanupSuccess) {
    console.error('\nCleanup failed. Please check the errors above.');
    console.log('You can try running the import fixer to resolve issues:');
    console.log('  node scripts/fix-test-imports.js');
    rl.close();
    return;
  }
  
  // Step 3: Run tests to verify
  console.log('\n--- STEP 3: VERIFICATION ---');
  
  const runTests = await prompt('\nWould you like to run tests to verify that everything is working? (y/n): ');
  
  if (runTests === 'y' || runTests === 'yes') {
    console.log('\nRunning tests...');
    runCommand('npm test');
  }
  
  console.log('\n===================================================');
  console.log('       TEST CLEANUP COMPLETE');
  console.log('===================================================');
  
  console.log('\nNext steps:');
  console.log('1. Review the changes made to ensure nothing important was removed');
  console.log('2. Fix any failing tests if necessary');
  console.log('3. Commit the changes to your repository');
  
  rl.close();
}

// Run the main function
main().catch(error => {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
}); 