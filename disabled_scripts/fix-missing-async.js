#!/usr/bin/env node

/**
 * Script to fix "Cannot use keyword 'await' outside an async function" errors
 * This script adds the 'async' keyword to functions that use await but aren't declared as async.
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
  console.log('Starting fix for missing async keywords...');

  // Find all JavaScript files
  const files = await glob('src/**/*.js');
  console.log(`Found ${files.length} JavaScript files to process`);

  let totalFilesChanged = 0;
  let totalFunctionsFixed = 0;

  // Process each file
  for (const file of files) {
    const result = processFile(file);
    if (result.changed) {
      totalFilesChanged++;
      totalFunctionsFixed += result.functionsFixed;
    }
  }

  console.log('\nSummary:');
  console.log(`Files changed: ${totalFilesChanged}`);
  console.log(`Functions fixed: ${totalFunctionsFixed}`);

  if (DRY_RUN) {
    console.log('\nThis was a dry run. No files were modified.');
  }
}

/**
 * Process a single file to fix missing async keywords
 * @param {string} filePath - Path to the file
 * @returns {Object} - Statistics about changes made
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Common function patterns that might be missing async keyword
    const functionPatterns = [
      // function functionName() { ... await ... }
      {
        pattern: /function\s+(\w+)\s*\([^)]*\)\s*\{(?:[^{}]*|\{[^{}]*\})*\bawait\b/g,
        replacement: 'async function $1('
      },
      // const functionName = function() { ... await ... }
      {
        pattern: /(const|let|var)\s+(\w+)\s*=\s*function\s*\([^)]*\)\s*\{(?:[^{}]*|\{[^{}]*\})*\bawait\b/g,
        replacement: '$1 $2 = async function('
      },
      // () => { ... await ... }
      {
        pattern: /(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\{(?:[^{}]*|\{[^{}]*\})*\bawait\b/g,
        replacement: '$1 = async ($2) =>'
      },
      // methodName() { ... await ... }
      {
        pattern: /(\w+)\s*\([^)]*\)\s*\{(?:[^{}]*|\{[^{}]*\})*\bawait\b/g,
        replacement: 'async $1('
      }
    ];
    
    let newContent = content;
    let functionsFixed = 0;
    
    // Apply each pattern
    for (const { pattern, replacement } of functionPatterns) {
      // Count matches before replacement
      const matches = newContent.match(pattern) || [];
      functionsFixed += matches.length;
      
      // Apply replacement
      newContent = newContent.replace(pattern, (match) => {
        // Make sure we're not duplicating 'async'
        if (match.includes('async ')) {
          return match;
        }
        
        // Replace the first occurrence of the function declaration with async version
        return match.replace(pattern, replacement);
      });
    }
    
    // Check if we made any changes
    if (content !== newContent && functionsFixed > 0) {
      console.log(`Fixed ${functionsFixed} functions in ${path.basename(filePath)}`);
      
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
      }
      
      return { changed: true, functionsFixed };
    }
    
    return { changed: false, functionsFixed: 0 };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { changed: false, functionsFixed: 0 };
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 