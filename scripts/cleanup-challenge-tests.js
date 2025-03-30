#!/usr/bin/env node

/**
 * Challenge Tests Cleanup Master Script
 * 
 * This script guides the user through the process of cleaning up challenge tests
 * by executing the various cleanup scripts in sequence.
 */

import { spawnSync } from 'child_process';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Create readline interface
const readline = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline.question
function ask(question) {
  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Execute command and return output
function runCommand(command, args = [], cwd = projectRoot) {
  console.log(`\nRunning: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true
  });
  
  if (result.error) {
    console.error(`Error executing command: ${result.error.message}`);
    return false;
  }
  
  return result.status === 0;
}

// Main function
async function main() {
  console.log('===============================================');
  console.log('🧹 Challenge Tests Cleanup Script');
  console.log('===============================================');
  console.log('\nThis script will help you clean up challenge tests in a step-by-step process.');
  console.log('Make sure you have your code backed up or in version control!');
  
  const proceed = await ask('\nDo you want to proceed? (y/n): ');
  if (proceed.toLowerCase() !== 'y') {
    console.log('Cleanup cancelled. Exiting.');
    readline.close();
    return;
  }
  
  // Step 1: Create a backup branch
  console.log('\n=== Step 1: Create a backup branch ===');
  console.log('This step will create a git branch to backup the current state.');
  
  const createBranch = await ask('Create a backup branch? (y/n): ');
  if (createBranch.toLowerCase() === 'y') {
    const branchName = await ask('Enter branch name (default: test-cleanup-backup): ') || 'test-cleanup-backup';
    runCommand('git', ['checkout', '-b', branchName]);
    runCommand('git', ['add', '.']);
    runCommand('git', ['commit', '-m', '"Backup before test cleanup"']);
    console.log(`Created backup branch: ${branchName}`);
  }
  
  // Step 2: Analyze test files
  console.log('\n=== Step 2: Analyze test files ===');
  console.log('This step will analyze the challenge test files to identify duplicates and issues.');
  
  const runAnalysis = await ask('Run test analysis? (y/n): ');
  if (runAnalysis.toLowerCase() === 'y') {
    runCommand('node', ['scripts/find-duplicate-tests.js']);
  }
  
  // Step 3: Delete legacy files
  console.log('\n=== Step 3: Delete legacy files ===');
  console.log('This step will identify and delete legacy test files.');
  
  const findLegacy = await ask('Find legacy files? (y/n): ');
  if (findLegacy.toLowerCase() === 'y') {
    runCommand('node', ['scripts/delete-legacy-tests.js', 'challenge']);
    
    const deleteLegacy = await ask('Delete identified legacy files? (y/n): ');
    if (deleteLegacy.toLowerCase() === 'y') {
      runCommand('node', ['scripts/delete-legacy-tests.js', 'challenge', '--delete']);
    }
  }
  
  // Step 4: Standardize file naming
  console.log('\n=== Step 4: Standardize file naming ===');
  console.log('This step will convert filenames to kebab-case for consistency.');
  
  const standardizeNames = await ask('Standardize file naming? (y/n): ');
  if (standardizeNames.toLowerCase() === 'y') {
    runCommand('node', ['scripts/standardize-test-filenames.js', 'challenge']);
  }
  
  // Step 5: Merge duplicate files
  console.log('\n=== Step 5: Merge duplicate files ===');
  console.log('This step will help you merge duplicate test files.');
  console.log('You will need to specify source and target files for each merge.');
  
  const mergeDuplicates = await ask('Do you want to merge duplicate files? (y/n): ');
  if (mergeDuplicates.toLowerCase() === 'y') {
    console.log('\nRecommended file merges (based on analysis):');
    console.log('1. Evaluation Service files:');
    console.log('   - tests/unit/challenge/services/challenge-evaluation-service.test.js (source)');
    console.log('   - tests/unit/challenge/services/ChallengeEvaluationService.test.js (target)');
    
    console.log('\n2. Repository files:');
    console.log('   - tests/domain/challenge/challengeRepository.test.js (source)');
    console.log('   - tests/domain/challenge/repositories/challenge-repository.test.js (target)');
    
    let continueMerging = true;
    while (continueMerging) {
      const sourceFile = await ask('\nEnter path to source file (file to merge from): ');
      const targetFile = await ask('Enter path to target file (file to merge into): ');
      
      runCommand('node', ['scripts/merge-duplicate-tests.js', sourceFile, targetFile]);
      
      const mergeMore = await ask('\nMerge more files? (y/n): ');
      continueMerging = mergeMore.toLowerCase() === 'y';
    }
  }
  
  // Step 6: Run tests to verify
  console.log('\n=== Step 6: Run tests to verify ===');
  console.log('This step will run tests to ensure everything still works.');
  
  const runTests = await ask('Run tests to verify changes? (y/n): ');
  if (runTests.toLowerCase() === 'y') {
    runCommand('npm', ['run', 'test:unit', '--', '--testMatch="**/tests/unit/challenge/**/*.test.js"']);
    runCommand('npm', ['run', 'test:domain', '--', '--testMatch="**/tests/domain/challenge/**/*.test.js"']);
  }
  
  // Finished
  console.log('\n===============================================');
  console.log('🎉 Challenge Tests Cleanup Completed');
  console.log('===============================================');
  console.log('\nNext steps:');
  console.log('1. Review the changes made');
  console.log('2. Fix any failing tests');
  console.log('3. Commit the changes');
  console.log('4. Apply the same process to other domains');
  
  readline.close();
}

main(); 