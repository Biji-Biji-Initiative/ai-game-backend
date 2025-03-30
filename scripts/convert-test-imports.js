#!/usr/bin/env node

/**
 * Script to convert test imports from relative paths to @ imports
 * Runs jscodeshift with the proper settings
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

// Get the directory of the current file
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Path to the transform script
const transformPath = join(__dirname, 'transforms', 'convert-test-imports.js');

// Tests directory to process
const testsDir = join(__dirname, '..', 'tests');

// Create a backup of the tests directory
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const backupDir = join(__dirname, '..', `tests-backup-${timestamp}`);

console.log(`Creating backup of tests directory: ${backupDir}`);
fs.mkdirSync(backupDir, { recursive: true });

// Use rsync to copy files (preserves structure and permissions)
execSync(`rsync -a "${testsDir}/" "${backupDir}/"`, { stdio: 'inherit' });
console.log(`Backup created at: ${backupDir}`);

// Run jscodeshift
try {
  console.log('Converting test imports to @ imports...');
  console.log(`Transform script: ${transformPath}`);
  console.log(`Tests directory: ${testsDir}`);
  
  // Quote paths to handle spaces
  const quotedTransformPath = `"${transformPath}"`;
  const quotedTestsDir = `"${testsDir}"`;
  
  const command = `npx jscodeshift -t ${quotedTransformPath} ${quotedTestsDir} --extensions=js --parser=babel --verbose=2`;
  
  console.log(`\nRunning command: ${command}\n`);
  execSync(command, { stdio: 'inherit' });
  
  console.log('\nConversion complete!');
  
  // Create a restore script
  const restoreScriptPath = join(__dirname, '..', 'restore-tests.sh');
  const restoreScript = `#!/bin/bash
echo "Restoring tests directory from backup: ${backupDir}"
rsync -a "${backupDir}/" "${testsDir}/"
echo "Restore complete!"
`;
  
  fs.writeFileSync(restoreScriptPath, restoreScript);
  fs.chmodSync(restoreScriptPath, 0o755); // Make executable
  
  console.log(`\nA restore script has been created at: ${restoreScriptPath}`);
} catch (error) {
  console.error('Error during conversion:', error.message);
  console.log('Restoring from backup...');
  execSync(`rsync -a "${backupDir}/" "${testsDir}/"`, { stdio: 'inherit' });
  console.log('Restore complete!');
  process.exit(1);
} 