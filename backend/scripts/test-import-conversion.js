#!/usr/bin/env node

/**
 * Script to test the import conversion on a single file
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

// Get the directory of the current file
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Path to the transform script
const transformPath = join(__dirname, 'transforms', 'convert-to-at-imports.js');

// Test file - using the currently open file
const testFile = join(__dirname, '..', 'src', 'core', 'common', 'valueObjects', 'index.js');

// Create a backup of the file
const backupFile = testFile + '.backup';
fs.copyFileSync(testFile, backupFile);

console.log(`Created backup at: ${backupFile}`);

// Run jscodeshift
try {
  console.log('Testing import conversion on a single file...');
  console.log(`Transform script: ${transformPath}`);
  console.log(`Test file: ${testFile}`);
  
  // Quote paths to handle spaces
  const quotedTransformPath = `"${transformPath}"`;
  const quotedTestFile = `"${testFile}"`;
  
  const command = `npx jscodeshift -t ${quotedTransformPath} ${quotedTestFile} --parser=babel --verbose=2`;
  
  console.log(`\nRunning command: ${command}\n`);
  execSync(command, { stdio: 'inherit' });
  
  console.log('\nTest conversion complete!');
  console.log('Check the file to see if imports were converted correctly.');
  console.log(`You can restore the original file from: ${backupFile}`);
} catch (error) {
  console.error('Error during test conversion:', error.message);
  
  // Restore the backup
  fs.copyFileSync(backupFile, testFile);
  console.log('Restored original file due to error.');
  
  process.exit(1);
} 