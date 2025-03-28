#!/usr/bin/env node
/**
 * Fix Test Paths Script
 * 
 * This script helps fix import paths in test files after reorganization.
 * When tests are moved to different folders, the relative paths need to be updated.
 * 
 * Usage:
 *   node scripts/fix-test-paths.js [--fix] [glob-pattern]
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
    pattern: /require\(['"]\.\.\/loadEnv['"]\)/g, 
    getReplacements: (filepath) => {
      const relativePath = path.relative(path.dirname(filepath), path.resolve('tests')).replace(/\\/g, '/');
      return `require('${relativePath}/loadEnv')`;
    }
  },
  { 
    pattern: /require\(['"]\.\.\/\.\.\/loadEnv['"]\)/g, 
    getReplacements: (filepath) => {
      const relativePath = path.relative(path.dirname(filepath), path.resolve('tests')).replace(/\\/g, '/');
      return `require('${relativePath}/loadEnv')`;
    }
  },
  {
    pattern: /require\(['"]\.\.\/\.\.\/tests\/helpers\/testHelpers['"]\)/g,
    getReplacements: (filepath) => {
      const relativePath = path.relative(path.dirname(filepath), path.resolve('tests/helpers')).replace(/\\/g, '/');
      return `require('${relativePath}/testHelpers')`;
    }
  },
  {
    pattern: /require\(['"]\.\.\/\.\.\/\.\.\/helpers\/testHelpers['"]\)/g,
    getReplacements: (filepath) => {
      const relativePath = path.relative(path.dirname(filepath), path.resolve('tests/helpers')).replace(/\\/g, '/');
      return `require('${relativePath}/testHelpers')`;
    }
  },
  {
    pattern: /require\(['"]\.\.\/helpers\/apiTestHelper['"]\)/g,
    getReplacements: (filepath) => {
      const relativePath = path.relative(path.dirname(filepath), path.resolve('tests/helpers')).replace(/\\/g, '/');
      return `require('${relativePath}/apiTestHelper')`;
    }
  },
  {
    pattern: /require\(['"]\.\.\/helpers\/(\w+)['"]\)/g,
    getReplacements: (filepath, match, helperName) => {
      const relativePath = path.relative(path.dirname(filepath), path.resolve('tests/helpers')).replace(/\\/g, '/');
      return `require('${relativePath}/${helperName}')`;
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
        if (patternStr.includes('(\\w+)')) {
          // For patterns with capture groups
          content = content.replace(pattern, (match, ...args) => {
            const capturedGroups = args.slice(0, -2); // Remove offset and string from args
            return getReplacements(filePath, match, ...capturedGroups);
          });
        } else {
          // For simple patterns
          const replacement = getReplacements(filePath);
          content = content.replace(pattern, replacement);
        }
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
  console.log(chalk.blue('=== Fix Test Paths Tool ==='));
  console.log(chalk.cyan(`Mode: ${shouldFix ? 'Fix' : 'Analyze'}`));
  console.log(chalk.cyan(`Pattern: ${filePattern}`));
  console.log(chalk.cyan('---------------------------'));
  
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
  
  console.log(chalk.cyan('\n---------------------------'));
  console.log(`Total paths found: ${totalPathsFound}`);
  
  if (shouldFix) {
    console.log(`Total files fixed: ${totalFilesFixed}`);
  } else if (totalPathsFound > 0) {
    console.log(chalk.green('\nRun with --fix to fix these paths:'));
    console.log(chalk.green(`node scripts/fix-test-paths.js --fix ${filePattern}`));
  }
}

main().catch(console.error); 