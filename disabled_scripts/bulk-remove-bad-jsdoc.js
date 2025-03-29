#!/usr/bin/env node

/**
 * Script to remove incorrect JSDoc comments in bulk
 * This script will scan all JavaScript files and remove JSDoc comments 
 * that are applied to method calls, if statements, and other non-function code
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Config
const DRY_RUN = false; // Set to true to just see what would be removed

/**
 * Main function
 */
async function main() {
  console.log('Starting bulk removal of incorrect JSDoc comments...');

  // Find all JavaScript files
  const files = await glob('src/**/*.js');
  console.log(`Found ${files.length} JavaScript files to process`);

  let totalFilesChanged = 0;
  let totalCommentsRemoved = 0;

  // Process each file
  for (const file of files) {
    const result = processFile(file);
    if (result.changed) {
      totalFilesChanged++;
      totalCommentsRemoved += result.commentsRemoved;
    }
  }

  console.log('\nSummary:');
  console.log(`Files changed: ${totalFilesChanged}`);
  console.log(`Comments removed: ${totalCommentsRemoved}`);

  if (DRY_RUN) {
    console.log('\nThis was a dry run. No files were modified.');
  }
}

/**
 * Process a single file to remove incorrect JSDoc comments
 * @param {string} filePath - Path to the file
 * @returns {Object} - Statistics about changes made
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const newLines = [];
    let inJSDoc = false;
    let jsDocLines = [];
    let commentsRemoved = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Start of a JSDoc block
      if (line.startsWith('/**')) {
        inJSDoc = true;
        jsDocLines = [lines[i]];
        continue;
      }
      
      // Collecting JSDoc lines
      if (inJSDoc) {
        jsDocLines.push(lines[i]);
        
        // End of JSDoc block
        if (line.endsWith('*/')) {
          inJSDoc = false;
          
          // Look at what follows this JSDoc block
          const nextLineIndex = i + 1;
          let isValidTarget = false;
          
          if (nextLineIndex < lines.length) {
            const nextLine = lines[nextLineIndex].trim();
            
            // Valid targets for JSDoc comments
            isValidTarget = 
              // Class declarations
              nextLine.startsWith('class ') || 
              // Function declarations
              nextLine.startsWith('function ') || 
              nextLine.startsWith('async function ') ||
              // Arrow functions with explicit name (const foo = ...)
              nextLine.match(/^(const|let|var)\s+\w+\s*=\s*(\([^)]*\)\s*=>|function|async function)/) ||
              // Class methods
              nextLine.match(/^(async\s+)?[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)\s*\{/) ||
              // Constructor
              nextLine.startsWith('constructor');
          }
          
          if (isValidTarget) {
            // This is a valid JSDoc target, add all the collected lines
            newLines.push(...jsDocLines);
          } else {
            // This is not a valid target, skip the JSDoc block
            commentsRemoved++;
          }
          
          jsDocLines = [];
          continue;
        }
      } else {
        // Normal line (not in JSDoc block)
        newLines.push(lines[i]);
      }
    }
    
    // Check if we made any changes
    const newContent = newLines.join('\n');
    if (content !== newContent && commentsRemoved > 0) {
      console.log(`Removing ${commentsRemoved} comments from ${path.basename(filePath)}`);
      
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
      }
      
      return { changed: true, commentsRemoved };
    }
    
    return { changed: false, commentsRemoved: 0 };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { changed: false, commentsRemoved: 0 };
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 