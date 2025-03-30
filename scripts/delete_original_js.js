#!/usr/bin/env node

/**
 * Script to delete original JavaScript files that have been copied to the scripts folder.
 * This script should only be run after running move_js_to_scripts.js
 * 
 * Usage: node scripts/delete_original_js.js
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Create a readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Main function
async function deleteOriginalJsFiles() {
  try {
    // Check if the log file exists
    const logFilePath = path.join('scripts', 'moved_js_files.log');
    if (!fs.existsSync(logFilePath)) {
      console.error('❌ Error: Log file not found. Please run move_js_to_scripts.js first.');
      rl.close();
      return;
    }

    // Read the log file
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.startsWith('✅'));
    
    // Extract source file paths
    const sourceFiles = logLines.map(line => {
      const match = line.match(/✅\s+(.*?)\s+->/);
      return match ? match[1] : null;
    }).filter(Boolean);

    console.log(`Found ${sourceFiles.length} JavaScript files that were copied to scripts/utilities.`);
    
    // Ask for confirmation before deleting
    const answer = await new Promise(resolve => {
      rl.question(`Are you sure you want to delete the original ${sourceFiles.length} JavaScript files? (yes/no): `, resolve);
    });

    if (answer.toLowerCase() !== 'yes') {
      console.log('Operation canceled. No files were deleted.');
      rl.close();
      return;
    }

    // Create a deletion log file
    const deletionLogPath = path.join('scripts', 'deleted_js_files.log');
    fs.writeFileSync(deletionLogPath, `Original JavaScript files deleted on ${new Date().toISOString()}\n\n`, 'utf8');

    // Delete each source file
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const filePath of sourceFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          fs.appendFileSync(deletionLogPath, `✅ Deleted: ${filePath}\n`, 'utf8');
          console.log(`✅ Deleted: ${filePath}`);
          deletedCount++;
        } else {
          fs.appendFileSync(deletionLogPath, `⚠️ File not found: ${filePath}\n`, 'utf8');
          console.log(`⚠️ File not found: ${filePath}`);
        }
      } catch (err) {
        errorCount++;
        fs.appendFileSync(deletionLogPath, `❌ Error deleting ${filePath}: ${err.message}\n`, 'utf8');
        console.error(`❌ Error deleting ${filePath}: ${err.message}`);
      }
    }

    console.log(`\nDeletion complete: ${deletedCount} files deleted, ${errorCount} errors.`);
    console.log(`Log file created at: ${deletionLogPath}`);
    
    rl.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
  }
}

// Run the main function
deleteOriginalJsFiles(); 