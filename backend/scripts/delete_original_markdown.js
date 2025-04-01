#!/usr/bin/env node

/**
 * Script to delete original markdown files that have been copied to the /docs folder.
 * This script should only be run after running move_markdown_to_docs.js
 * 
 * Usage: node scripts/delete_original_markdown.js
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
async function deleteOriginalMarkdownFiles() {
  try {
    // Check if the log file exists
    const logFilePath = path.join('docs', 'moved_files.log');
    if (!fs.existsSync(logFilePath)) {
      console.error('❌ Error: Log file not found. Please run move_markdown_to_docs.js first.');
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

    console.log(`Found ${sourceFiles.length} markdown files that were copied to docs.`);
    
    // Ask for confirmation before deleting
    const answer = await new Promise(resolve => {
      rl.question(`Are you sure you want to delete the original ${sourceFiles.length} markdown files? (yes/no): `, resolve);
    });

    if (answer.toLowerCase() !== 'yes') {
      console.log('Operation canceled. No files were deleted.');
      rl.close();
      return;
    }

    // Create a deletion log file
    const deletionLogPath = path.join('docs', 'deleted_files.log');
    fs.writeFileSync(deletionLogPath, `Original markdown files deleted on ${new Date().toISOString()}\n\n`, 'utf8');

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
deleteOriginalMarkdownFiles(); 