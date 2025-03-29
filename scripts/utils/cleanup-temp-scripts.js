#!/usr/bin/env node
/**
 * Cleanup Temporary Scripts
 * 
 * This utility script moves files from the temp_script directory to the archive directory
 * and cleans up any redundant dev-scripts that have been moved to the dev directory.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const rootDir = path.join(__dirname, '../..');
const tempScriptDir = path.join(rootDir, 'scripts/temp_script');
const devScriptsDir = path.join(rootDir, 'scripts/dev-scripts');
const archiveDir = path.join(rootDir, 'scripts/archive');

console.log(chalk.blue('=== Cleanup Temporary Scripts ==='));

// Ensure archive directory exists
if (!fs.existsSync(archiveDir)) {
  console.log(chalk.yellow(`Creating archive directory: ${path.relative(rootDir, archiveDir)}`));
  fs.mkdirSync(archiveDir, { recursive: true });
}

// Move temp_script files to archive
if (fs.existsSync(tempScriptDir)) {
  console.log(chalk.cyan(`Moving files from ${path.relative(rootDir, tempScriptDir)} to ${path.relative(rootDir, archiveDir)}`));
  
  const tempFiles = fs.readdirSync(tempScriptDir);
  for (const file of tempFiles) {
    const srcPath = path.join(tempScriptDir, file);
    const destPath = path.join(archiveDir, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      continue; // Skip directories for simplicity
    }
    
    try {
      // Copy file to archive
      fs.copyFileSync(srcPath, destPath);
      console.log(chalk.green(`✓ Moved: ${file}`));
      
      // Remove original
      fs.unlinkSync(srcPath);
    } catch (error) {
      console.error(chalk.red(`✗ Failed to move ${file}:`), error.message);
    }
  }
  
  // Check if temp_script directory is now empty
  const remainingFiles = fs.readdirSync(tempScriptDir);
  if (remainingFiles.length === 0) {
    try {
      fs.rmdirSync(tempScriptDir);
      console.log(chalk.green(`✓ Removed empty directory: ${path.relative(rootDir, tempScriptDir)}`));
    } catch (error) {
      console.error(chalk.red(`✗ Failed to remove directory ${path.relative(rootDir, tempScriptDir)}:`), error.message);
    }
  } else {
    console.log(chalk.yellow(`Directory not empty, cannot remove: ${path.relative(rootDir, tempScriptDir)}`));
    console.log(chalk.yellow(`Remaining items: ${remainingFiles.length}`));
  }
} else {
  console.log(chalk.yellow(`Directory not found: ${path.relative(rootDir, tempScriptDir)}`));
}

// Handle dev-scripts directory
if (fs.existsSync(devScriptsDir)) {
  console.log(chalk.cyan(`\nChecking ${path.relative(rootDir, devScriptsDir)} for cleanup`));
  
  const devFiles = fs.readdirSync(devScriptsDir);
  for (const file of devFiles) {
    const srcPath = path.join(devScriptsDir, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      // For directories, we'd need to handle recursively - skip for now
      console.log(chalk.yellow(`Skipping directory: ${file}`));
      continue;
    }
    
    // Check if this file exists in the dev directory
    const devPath = path.join(rootDir, 'scripts/dev', file);
    if (fs.existsSync(devPath)) {
      // File has been moved, archive the old one
      const archivePath = path.join(archiveDir, file);
      try {
        fs.copyFileSync(srcPath, archivePath);
        fs.unlinkSync(srcPath);
        console.log(chalk.green(`✓ Archived duplicate: ${file}`));
      } catch (error) {
        console.error(chalk.red(`✗ Failed to archive ${file}:`), error.message);
      }
    }
  }
} else {
  console.log(chalk.yellow(`Directory not found: ${path.relative(rootDir, devScriptsDir)}`));
}

console.log(chalk.cyan('\n-------------------------------'));
console.log(chalk.green.bold('✅ Cleanup completed!'));
console.log(chalk.yellow('Note: This script does not remove directories recursively.'));
console.log(chalk.yellow('     To fully remove dev-scripts, you may need to manually delete subdirectories.')); 