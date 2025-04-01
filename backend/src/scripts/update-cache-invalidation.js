/**
 * Cache Invalidation Update Script
 * 
 * This script helps update repositories to use the standardized cache invalidation
 * pattern implemented in PERF-1.
 * 
 * It scans repository files, identifies methods that need updating, and adds
 * proper cache invalidation options to withTransaction calls.
 * 
 * Usage:
 * node src/scripts/update-cache-invalidation.js
 * 
 * You can also specify directories to scan:
 * node src/scripts/update-cache-invalidation.js --dir=src/core/user/repositories
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default directories to scan for repositories
const DEFAULT_DIRS = [
  path.join(__dirname, '../../src/core/user/repositories'),
  path.join(__dirname, '../../src/core/challenge/repositories'),
  path.join(__dirname, '../../src/core/evaluation/repositories'),
  path.join(__dirname, '../../src/core/personality/repositories'),
  path.join(__dirname, '../../src/core/focus-area/repositories'),
  path.join(__dirname, '../../src/core/progress/repositories'),
];

// Regex patterns to identify repository methods and transaction calls
const REPOSITORY_PATTERN = /class\s+(\w+Repository)\s+extends\s+BaseRepository/g;
const WITH_TRANSACTION_PATTERN = /return\s+this\.withTransaction\(\s*async\s*\(\s*\w+\s*\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\{([^}]*)\}\s*\)/g;

/**
 * Scan a file for repository classes and withTransaction calls
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if file was updated
 */
function updateFile(filePath) {
  // Read file content
  let content = fs.readFileSync(filePath, 'utf8');
  let updatedContent = content;
  let updated = false;
  
  // Check if file contains a repository class
  const repositoryMatch = content.match(REPOSITORY_PATTERN);
  if (!repositoryMatch) {
    return false;
  }
  
  console.log(`\nAnalyzing ${path.basename(filePath)}...`);
  
  // Find withTransaction calls
  let withTransactionMatch;
  while ((withTransactionMatch = WITH_TRANSACTION_PATTERN.exec(content)) !== null) {
    const fullMatch = withTransactionMatch[0];
    const optionsStr = withTransactionMatch[1];
    
    // Check if cache invalidation options are already present
    if (optionsStr.includes('invalidateCache')) {
      continue;
    }
    
    // Prepare the updated options
    let updatedOptions = optionsStr.trim();
    
    // Check if we need to add a comma
    if (updatedOptions && !updatedOptions.endsWith(',')) {
      updatedOptions += ',';
    }
    
    // Add cache invalidation options
    updatedOptions += `
  invalidateCache: true, // Enable cache invalidation
  cacheInvalidator: this.cacheInvalidator // Use repository's invalidator`;
    
    // Replace the options in the full match
    const updatedMatch = fullMatch.replace(optionsStr, updatedOptions);
    updatedContent = updatedContent.replace(fullMatch, updatedMatch);
    updated = true;
    
    console.log('  Updated withTransaction call with cache invalidation options');
  }
  
  // Save updated content if changes were made
  if (updated) {
    fs.writeFileSync(filePath, updatedContent);
    console.log(`  ✓ Updated ${path.basename(filePath)}`);
  } else {
    console.log(`  ✓ No changes needed in ${path.basename(filePath)}`);
  }
  
  return updated;
}

/**
 * Scan a directory for repository files and update them
 * @param {string} dirPath - Directory path
 * @returns {number} Number of files updated
 */
function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Directory not found: ${dirPath}`);
    return 0;
  }
  
  console.log(`Scanning directory: ${dirPath}`);
  let updatedFiles = 0;
  
  // Get all files in the directory
  const files = fs.readdirSync(dirPath);
  
  // Process each file
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      // Recursively scan subdirectories
      updatedFiles += scanDirectory(filePath);
    } else if (stats.isFile() && (file.endsWith('.js') || file.endsWith('.mjs'))) {
      // Update JavaScript files
      if (updateFile(filePath)) {
        updatedFiles++;
      }
    }
  }
  
  return updatedFiles;
}

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { dirs: [] };
  
  for (const arg of args) {
    if (arg.startsWith('--dir=')) {
      result.dirs.push(arg.substring(6));
    }
  }
  
  // Use default directories if none specified
  if (result.dirs.length === 0) {
    result.dirs = DEFAULT_DIRS;
  }
  
  return result;
}

/**
 * Main function
 */
function main() {
  console.log('Cache Invalidation Update Script');
  console.log('================================');
  
  const args = parseArgs();
  let totalUpdated = 0;
  
  // Scan directories
  for (const dir of args.dirs) {
    totalUpdated += scanDirectory(dir);
  }
  
  console.log('\nSummary:');
  console.log(`Scanned ${args.dirs.length} directories`);
  console.log(`Updated ${totalUpdated} repository files`);
  console.log('\nDone!');
}

// Run the script
main(); 