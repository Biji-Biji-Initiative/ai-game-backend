#!/usr/bin/env node
'use strict';

/**
 * Master script to run all fixers in the right order
 */

const { execSync } = require('child_process');
const chalk = require('chalk');

console.log(chalk.blue('=== Running all code fixers ==='));

try {
  // Step 1: Remove incorrect JSDoc comments
  console.log(chalk.yellow('\n1. Removing incorrect JSDoc comments...'));
  execSync('npm run fix:bulk-jsdoc', { stdio: 'inherit' });
  
  // Step 2: Fix missing async keywords
  console.log(chalk.yellow('\n2. Adding missing async keywords...'));
  execSync('npm run fix:missing-async', { stdio: 'inherit' });
  
  // Step 3: Fix AppError references
  console.log(chalk.yellow('\n3. Fixing AppError references...'));
  execSync('npm run fix:app-error', { stdio: 'inherit' });
  
  // Step 4: Fix JSDoc @ character issues
  console.log(chalk.yellow('\n4. Fixing JSDoc @ character issues...'));
  execSync('npm run fix:at-sign', { stdio: 'inherit' });
  
  // Step 5: Run ESLint's autofix
  console.log(chalk.yellow('\n5. Running ESLint autofix...'));
  execSync('npm run lint:fix', { stdio: 'inherit' });
  
  console.log(chalk.green('\nAll fixers completed successfully!'));
  console.log(chalk.blue('\nRemaining errors may need manual attention.'));
  
} catch (error) {
  console.error(chalk.red('Error running fixers:'), error.message);
  process.exit(1);
} 