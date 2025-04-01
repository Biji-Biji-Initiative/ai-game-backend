#!/usr/bin/env node

/**
 * Script to convert relative imports to @ imports
 * Runs jscodeshift with the proper settings
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Path to the transform script
const transformPath = join(__dirname, 'transforms', 'convert-to-at-imports.js');

// Main source directory to process
const srcDir = join(__dirname, '..', 'src');

// Run jscodeshift
try {
  console.log('Converting relative imports to @ imports...');
  console.log(`Transform script: ${transformPath}`);
  console.log(`Source directory: ${srcDir}`);
  
  // Quote paths to handle spaces
  const quotedTransformPath = `"${transformPath}"`;
  const quotedSrcDir = `"${srcDir}"`;
  
  // Updated to include ts and tsx extensions
  const command = `npx jscodeshift -t ${quotedTransformPath} ${quotedSrcDir} --extensions=js,jsx,ts,tsx --parser=babel --verbose=2`;
  
  console.log(`\nRunning command: ${command}\n`);
  execSync(command, { stdio: 'inherit' });
  
  console.log('\nConversion complete!');
  console.log('Remember to update your import statements in test files if needed.');
  console.log('Use "npm run imports:verify" to check for any remaining relative imports.');
} catch (error) {
  console.error('Error during conversion:', error.message);
  process.exit(1);
} 