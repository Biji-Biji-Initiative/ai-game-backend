/**
 * Logger Import Update Script
 * 
 * This script updates all logger imports to use the correct destructuring pattern
 * instead of requiring the module directly.
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

// Root directory of the codebase
const rootDir = path.resolve(__dirname, '..');

// File extensions to process
const extensions = ['.js', '.jsx', '.ts', '.tsx'];

// Directories to exclude
const excludeDirs = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.deprecated',
  'scripts'
];

// Function to walk through the directory structure
async function walkDirs(dir) {
  let results = [];
  const entries = await readdir(dir);
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = await stat(fullPath);
    
    if (stats.isDirectory()) {
      if (!excludeDirs.includes(entry)) {
        const subResults = await walkDirs(fullPath);
        results = results.concat(subResults);
      }
    } else if (stats.isFile() && extensions.includes(path.extname(fullPath))) {
      results.push(fullPath);
    }
  }
  
  return results;
}

// Function to update logger imports in a file
async function updateLoggerImportsInFile(filePath) {
  try {
    let fileContent = await readFile(filePath, 'utf8');
    let updated = false;
    
    // Match patterns like: const logger = require('../path/to/logger');
    const loggerRegex = /const logger = require\(['"]([^'"]+)\/logger['"]\)(\.logger)?;/g;
    
    if (loggerRegex.test(fileContent)) {
      // Update to destructured import
      fileContent = fileContent.replace(loggerRegex, (match, path) => {
        return `const { logger } = require('${path}/logger');`;
      });
      updated = true;
    }
    
    if (updated) {
      await writeFile(filePath, fileContent, 'utf8');
      console.log(`Updated logger imports in ${filePath}`);
      return 1;
    }
    
    return 0;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
    return 0;
  }
}

// Main function
async function main() {
  try {
    console.log('Scanning files for logger imports...');
    const files = await walkDirs(rootDir);
    console.log(`Found ${files.length} files to check.`);
    
    let updatedCount = 0;
    
    for (const file of files) {
      updatedCount += await updateLoggerImportsInFile(file);
    }
    
    console.log(`\nUpdate complete. Modified ${updatedCount} files.`);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
main(); 