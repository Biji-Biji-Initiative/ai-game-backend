#!/usr/bin/env node

/**
 * Script to find all .md files in the repository and move them to the /docs folder
 * while preserving their original directory structure.
 * 
 * Usage: node scripts/move_markdown_to_docs.js
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
function moveMarkdownToDocs() {
  try {
    // Find all markdown files, excluding node_modules and docs directory
    const command = 'find . -name "*.md" -not -path "./node_modules/*" -not -path "./docs/*" -not -path "*/node_modules/*"';
    const output = execSync(command).toString();
    const markdownFiles = output.split('\n').filter(Boolean);

    console.log(`Found ${markdownFiles.length} markdown files to move.`);

    // Create log file to keep track of moved files
    const logFilePath = path.join('docs', 'moved_files.log');
    ensureDirectoryExists('docs');
    fs.writeFileSync(logFilePath, `Markdown files moved on ${new Date().toISOString()}\n\n`, 'utf8');

    // Process each file
    markdownFiles.forEach(filePath => {
      try {
        // Get relative path without leading './'
        const relativePath = filePath.startsWith('./') ? filePath.slice(2) : filePath;
        
        // Construct destination path
        const destPath = path.join('docs', relativePath);
        
        // Create destination directory
        const destDir = path.dirname(destPath);
        ensureDirectoryExists(destDir);
        
        // Copy the file (instead of moving)
        fs.copyFileSync(filePath, destPath);
        
        // Log the operation
        fs.appendFileSync(logFilePath, `✅ ${filePath} -> ${destPath}\n`, 'utf8');
        console.log(`✅ Copied: ${filePath} -> ${destPath}`);
      } catch (err) {
        console.error(`❌ Error processing ${filePath}:`, err.message);
        fs.appendFileSync(logFilePath, `❌ Error: ${filePath} - ${err.message}\n`, 'utf8');
      }
    });

    console.log('\nMarkdown files have been copied to the docs directory.');
    console.log('Check the log file for details: docs/moved_files.log');
    console.log('\nTo complete the migration:');
    console.log('1. Review the copied files in the docs directory');
    console.log('2. Update any cross-references between documents');
    console.log('3. Delete original files if needed (this script only copies them)');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the main function
moveMarkdownToDocs(); 