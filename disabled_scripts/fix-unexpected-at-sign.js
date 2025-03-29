#!/usr/bin/env node

/**
 * Script to fix "Unexpected character '@'" syntax errors
 * These errors typically occur in JSDoc comments with incorrect format
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Config
const DRY_RUN = false; // Set to true to just see what would be fixed

/**
 * Main function
 */
async function main() {
  console.log('Starting fix for unexpected @ character errors...');

  // Find all JavaScript files
  const files = await glob('src/**/*.js');
  console.log(`Found ${files.length} JavaScript files to process`);

  let totalFilesChanged = 0;
  let totalLinesFixed = 0;

  // Process each file
  for (const file of files) {
    const result = processFile(file);
    if (result.changed) {
      totalFilesChanged++;
      totalLinesFixed += result.linesFixed;
    }
  }

  console.log('\nSummary:');
  console.log(`Files changed: ${totalFilesChanged}`);
  console.log(`Lines fixed: ${totalLinesFixed}`);

  if (DRY_RUN) {
    console.log('\nThis was a dry run. No files were modified.');
  }
}

/**
 * Process a single file to fix syntax errors related to @ character
 * @param {string} filePath - Path to the file
 * @returns {Object} - Statistics about changes made
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let newLines = [];
    let inJSDoc = false;
    let linesFixed = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check if we're entering a JSDoc block
      if (trimmed.startsWith('/**')) {
        inJSDoc = true;
        newLines.push(line);
        continue;
      }
      
      // Check if we're exiting a JSDoc block
      if (inJSDoc && trimmed.endsWith('*/')) {
        inJSDoc = false;
        newLines.push(line);
        continue;
      }
      
      // Inside JSDoc, fix any malformed tag lines
      if (inJSDoc && trimmed.includes('@')) {
        // Fix common issues with JSDoc tags
        // Problem: @ character not at the beginning of the line or after *
        if (!trimmed.startsWith('* @') && trimmed.includes('@')) {
          const parts = line.split('@');
          const prefix = parts[0];
          // Add space after * if needed
          const fixedLine = prefix.trim().endsWith('*') ? 
            `${prefix.trim()} @${parts[1]}` : 
            `${prefix} * @${parts[1]}`;
          
          newLines.push(fixedLine);
          linesFixed++;
          continue;
        }
      }
      
      // Regular line, no changes needed
      newLines.push(line);
    }
    
    // Check if we made any changes
    const newContent = newLines.join('\n');
    if (content !== newContent && linesFixed > 0) {
      console.log(`Fixed ${linesFixed} lines in ${path.basename(filePath)}`);
      
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
      }
      
      return { changed: true, linesFixed };
    }
    
    return { changed: false, linesFixed: 0 };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { changed: false, linesFixed: 0 };
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 