#!/usr/bin/env node
/**
 * Fix Source Imports Script
 * 
 * This script fixes import paths for src modules in test files.
 * Many tests reference modules from the src directory with incorrect paths
 * after being relocated.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');

// Configuration
const shouldFix = process.argv.includes('--fix');
const filePattern = process.argv.find(arg => !arg.startsWith('-') && arg !== process.argv[0] && arg !== process.argv[1]) || 'tests/**/*.test.js';

// Common path patterns that need fixing
const pathPatterns = [
  { 
    // Incorrect src paths like '../../src/core/challenge/models/Challenge'
    pattern: /require\(['"](\.\.\/)+src\/(.+?)['"]\)/g, 
    getReplacements: (filepath, match, prefix, srcPath) => {
      return `require('../../src/${srcPath}')`;
    }
  },
  { 
    // Another pattern for src paths
    pattern: /require\(['"]\.\.\/src\/(.+?)['"]\)/g, 
    getReplacements: (filepath, match, srcPath) => {
      return `require('../../src/${srcPath}')`;
    }
  },
  { 
    // Pattern for paths like require('src/...')
    pattern: /require\(['"]src\/(.+?)['"]\)/g, 
    getReplacements: (filepath, match, srcPath) => {
      return `require('../../src/${srcPath}')`;
    }
  }
];

// Scan and fix paths in a file
function fixPathsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let pathsFound = [];
  
  for (const { pattern, getReplacements } of pathPatterns) {
    const patternStr = pattern.toString();
    
    // Check if pattern matches in the content
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      pathsFound.push(patternStr);
      
      if (shouldFix) {
        content = content.replace(pattern, (match, prefix, srcPath) => {
          return getReplacements(filePath, match, prefix, srcPath);
        });
      }
    }
  }
  
  if (pathsFound.length > 0) {
    if (shouldFix && content !== originalContent) {
      fs.writeFileSync(filePath, content);
      return { fixed: true, paths: pathsFound };
    }
    return { fixed: false, paths: pathsFound };
  }
  
  return { fixed: false, paths: [] };
}

// Main function
async function main() {
  console.log(chalk.blue('=== Fix Source Imports Tool ==='));
  console.log(chalk.cyan(`Mode: ${shouldFix ? 'Fix' : 'Analyze'}`));
  console.log(chalk.cyan(`Pattern: ${filePattern}`));
  console.log(chalk.cyan('-------------------------------'));
  
  // Find all test files
  const files = glob.sync(filePattern);
  console.log(`Found ${files.length} test files to analyze.`);
  
  let totalPathsFound = 0;
  let totalFilesFixed = 0;
  let filesToFix = [];
  
  // Process each file
  for (const file of files) {
    const { fixed, paths } = fixPathsInFile(file);
    
    if (paths.length > 0) {
      totalPathsFound += paths.length;
      
      if (fixed) {
        totalFilesFixed++;
        console.log(chalk.green(`✓ Fixed paths in ${file}`));
      } else {
        filesToFix.push({ file, paths });
        console.log(chalk.yellow(`! Found paths to fix in ${file}: ${paths.join(', ')}`));
      }
    }
  }
  
  console.log(chalk.cyan('\n-------------------------------'));
  console.log(`Total paths found: ${totalPathsFound}`);
  
  if (shouldFix) {
    console.log(`Total files fixed: ${totalFilesFixed}`);
  } else if (totalPathsFound > 0) {
    console.log(chalk.green('\nRun with --fix to fix these paths:'));
    console.log(chalk.green(`node scripts/fix-source-imports.js --fix ${filePattern}`));
  }
}

main().catch(console.error); 