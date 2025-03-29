#!/usr/bin/env node

/**
 * Script to fix incorrect JSDoc comments that were mistakenly added to if statements, method calls, etc.
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Configuration
const DRY_RUN = false; // Set to true to see changes without applying them

/**
 * Main function to run the script
 */
async function main() {
  try {
    // Find all JavaScript files in the project
    const files = await glob('src/**/*.js');
    
    console.log(`Found ${files.length} JavaScript files to process`);
    
    // Track stats
    const stats = {
      fixedFiles: 0,
      commentsRemoved: 0
    };

    // Process each file
    for (const file of files) {
      const result = processFile(file);
      
      if (result.changed) {
        stats.fixedFiles++;
        stats.commentsRemoved += result.commentsRemoved;
      }
    }

    console.log('\nSummary:');
    console.log(`Files fixed: ${stats.fixedFiles}`);
    console.log(`Comments removed: ${stats.commentsRemoved}`);
    
    if (DRY_RUN) {
      console.log('\nThis was a dry run. No changes were written to disk.');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

/**
 * Process a single file to fix incorrect JSDoc comments
 * @param {string} filePath - Path to the JavaScript file
 * @returns {Object} Stats about fixes applied
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const newLines = [];
    let commentsRemoved = 0;
    let skipLines = 0;
    
    // These are patterns for situations where JSDoc should NOT be applied
    const incorrectJsDocTargets = [
      // if statements
      /^\s*if\s*\(/,
      // Function/method calls that are not declarations
      /^\s*\w+\.\w+\(/,
      // Promise then/catch chains
      /^\s*\.then\(/,
      /^\s*\.catch\(/,
      // Array methods
      /^\s*\w+\.push\(/,
      /^\s*\w+\.map\(/,
      /^\s*\w+\.filter\(/,
      /^\s*\w+\.reduce\(/,
      /^\s*\w+\.forEach\(/,
      // Error constructor calls
      /^\s*throw new \w+Error\(/,
      // Conditionals
      /^\s*\} else if \(/,
      /^\s*\} else \{/,
      // Method calls with await
      /^\s*await \w+\.\w+\(/
    ];
    
    for (let i = 0; i < lines.length; i++) {
      // Skip lines if needed (when removing a JSDoc block)
      if (skipLines > 0) {
        skipLines--;
        continue;
      }
      
      const line = lines[i];
      
      // Check if current line starts a JSDoc block
      if (line.trim().startsWith('/**')) {
        // Look ahead to see if the next non-empty lines contain invalid JSDoc targets
        let j = i + 1;
        let foundEnd = false;
        let jsDocEndIndex = -1;
        let targetLine = '';
        
        // Find the end of JSDoc block
        while (j < lines.length && !foundEnd) {
          if (lines[j].trim().endsWith('*/')) {
            foundEnd = true;
            jsDocEndIndex = j;
          }
          j++;
        }
        
        // If we found the end of the JSDoc block, look at the next non-empty line
        if (foundEnd) {
          j = jsDocEndIndex + 1;
          // Skip empty lines
          while (j < lines.length && lines[j].trim() === '') {
            j++;
          }
          
          // If we found a non-empty line and it's not the end of the file
          if (j < lines.length) {
            targetLine = lines[j].trim();
            
            // Check if the target line matches any of the patterns where JSDoc should not be applied
            const isIncorrectTarget = incorrectJsDocTargets.some(pattern => pattern.test(targetLine));
            
            // Check for "method" JSDoc comment targeting if statements or method calls
            const hasMethodInDescription = lines
              .slice(i, jsDocEndIndex + 1)
              .some(line => 
                line.includes('* if method') || 
                line.includes('* method') || 
                line.includes('* then method') || 
                line.includes('* catch method') ||
                line.includes('* debug method') ||
                line.includes('* info method') ||
                line.includes('* error method')
              );
            
            if (isIncorrectTarget || hasMethodInDescription) {
              // Remove the JSDoc block by setting skipLines
              skipLines = jsDocEndIndex - i;
              commentsRemoved++;
              continue;
            }
          }
        }
      }
      
      // Add the current line to the new content
      newLines.push(line);
    }
    
    const newContent = newLines.join('\n');
    
    // Only write the file if changes were made
    if (content !== newContent) {
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
      }
      console.log(`Fixed ${commentsRemoved} incorrect JSDoc comments in ${path.basename(filePath)}`);
      return { changed: true, commentsRemoved };
    }
    
    return { changed: false, commentsRemoved: 0 };
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return { changed: false, commentsRemoved: 0 };
  }
}

main(); 