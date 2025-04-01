#!/usr/bin/env node

/**
 * Script to move JavaScript files from the root directory to the scripts folder
 * and update any critical references.
 * 
 * Usage: node scripts/move_js_to_scripts.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Function to ensure a directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Main function
function moveJsToScripts() {
  try {
    // Find all JavaScript files in the root directory
    const command = 'find . -maxdepth 1 -name "*.js" -o -name "*.cjs"';
    const output = execSync(command).toString();
    const jsFiles = output.split('\n').filter(Boolean)
      // Exclude important files like index.js and configuration files
      .filter(file => !file.includes('/index.js') && 
                      !file.includes('/.eslintrc.js') && 
                      !file.includes('/eslint.config.js'));

    console.log(`Found ${jsFiles.length} JavaScript files to move.`);

    // Create log file to keep track of moved files
    const logFilePath = path.join('scripts', 'moved_js_files.log');
    ensureDirectoryExists('scripts');
    fs.writeFileSync(logFilePath, `JavaScript files moved on ${new Date().toISOString()}\n\n`, 'utf8');

    // Create a directory for the moved utility scripts
    const utilsDir = path.join('scripts', 'utilities');
    ensureDirectoryExists(utilsDir);

    // Process each file
    jsFiles.forEach(filePath => {
      try {
        // Get filename
        const fileName = path.basename(filePath);
        
        // Construct destination path
        const destPath = path.join('scripts', 'utilities', fileName);
        
        // Copy the file
        fs.copyFileSync(filePath, destPath);
        
        // Log the operation
        fs.appendFileSync(logFilePath, `✅ ${filePath} -> ${destPath}\n`, 'utf8');
        console.log(`✅ Copied: ${filePath} -> ${destPath}`);
      } catch (err) {
        console.error(`❌ Error processing ${filePath}:`, err.message);
        fs.appendFileSync(logFilePath, `❌ Error: ${filePath} - ${err.message}\n`, 'utf8');
      }
    });

    console.log('\nJavaScript files have been copied to the scripts/utilities directory.');
    console.log('Check the log file for details: scripts/moved_js_files.log');
    console.log('\nTo complete the migration:');
    console.log('1. Review the copied files in the scripts/utilities directory');
    console.log('2. Update any references to these files in your codebase');
    console.log('3. Delete original files using scripts/delete_original_js.js');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the main function
moveJsToScripts(); 