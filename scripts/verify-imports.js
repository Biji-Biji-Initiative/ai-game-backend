#!/usr/bin/env node

/**
 * Script to verify that no relative imports within the src directory remain
 * This helps confirm that the conversion process was complete
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

// Get the directory of the current file
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const srcDir = join(__dirname, '..', 'src');

console.log('Checking for remaining relative imports in src/...');

// Search for remaining relative imports
try {
  // The grep pattern looks for import statements or require calls with ./ or ../ patterns
  const cmd = `grep -r "from [\\\'\\\"]\\.\\.\\/" ${srcDir} --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"`;
  console.log(`Running: ${cmd}`);
  
  try {
    const relativePaths = execSync(
      cmd,
      { encoding: 'utf-8' }
    );
    
    if (relativePaths.trim()) {
      console.log('\nFound remaining relative imports with "../":');
      console.log(relativePaths);
    } else {
      console.log('No remaining "../" imports found.');
    }
  } catch (error) {
    // grep returns exit code 1 when no matches are found
    if (error.status === 1 && !error.stderr) {
      console.log('No remaining "../" imports found.');
    } else {
      console.error('Error checking ../ imports:', error.message);
    }
  }
  
  // Also check for ./ imports
  const dotSlashCmd = `grep -r "from [\\\'\\\"]\\.\/" ${srcDir} --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"`;
  console.log(`\nRunning: ${dotSlashCmd}`);
  
  try {
    const dotSlashPaths = execSync(
      dotSlashCmd,
      { encoding: 'utf-8' }
    );
    
    if (dotSlashPaths.trim()) {
      console.log('\nFound remaining relative imports with "./":');
      console.log(dotSlashPaths);
    } else {
      console.log('No remaining "./" imports found.');
    }
  } catch (error) {
    // grep returns exit code 1 when no matches are found
    if (error.status === 1 && !error.stderr) {
      console.log('No remaining "./" imports found.');
    } else {
      console.error('Error checking ./ imports:', error.message);
    }
  }
  
  // Check for double-slash patterns 
  const doubleSlashCmd = `grep -r "from [\\\'\\\"]\\.\\/\\/" ${srcDir} --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"`;
  console.log(`\nRunning: ${doubleSlashCmd}`);
  
  try {
    const doubleSlashPaths = execSync(
      doubleSlashCmd,
      { encoding: 'utf-8' }
    );
    
    if (doubleSlashPaths.trim()) {
      console.log('\nFound remaining double-slash imports ".//" (these are problematic):');
      console.log(doubleSlashPaths);
    } else {
      console.log('No remaining ".//" imports found.');
    }
  } catch (error) {
    // grep returns exit code 1 when no matches are found
    if (error.status === 1 && !error.stderr) {
      console.log('No remaining ".//" imports found.');
    } else {
      console.error('Error checking .// imports:', error.message);
    }
  }
  
  console.log('\n=== VERIFICATION COMPLETE ===');
  
} catch (error) {
  console.error('Error during verification:', error.message);
  process.exit(1);
} 