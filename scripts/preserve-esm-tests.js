#!/usr/bin/env node

/**
 * Script to identify and preserve only ESM tests, removing CommonJS tests
 * We want to keep tests using import/export syntax and remove tests using require/module.exports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// Get the directory of the current file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// File counters
const stats = {
  total: 0,
  esm: 0,
  commonjs: 0,
  removed: 0,
  empty: 0
};

// Patterns to identify module types
const esmPatterns = [
  /import\s+.*\s+from\s+['"].*['"]/,  // import x from 'y'
  /export\s+(default|const|let|var|function|class)/,  // export default, export const, etc.
  /export\s+\{.*\}/  // export { x }
];

const commonjsPatterns = [
  /\brequire\s*\(/,  // require()
  /module\.exports/,  // module.exports
  /exports\.[a-zA-Z]/  // exports.x
];

/**
 * Check if a file is using ESM or CommonJS
 * @param {string} filePath - Path to the file
 * @returns {Object} - Object with isESM, isCommonJS, isEmpty flags
 */
function checkModuleType(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for ESM patterns
    const hasESM = esmPatterns.some(pattern => pattern.test(content));
    
    // Check for CommonJS patterns
    const hasCommonJS = commonjsPatterns.some(pattern => pattern.test(content));
    
    // Check if file is empty or has no substantial code
    const isEmpty = content.trim().length < 50;
    
    return {
      isESM: hasESM,
      isCommonJS: hasCommonJS,
      isEmpty,
      content
    };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return {
      isESM: false,
      isCommonJS: false,
      isEmpty: true,
      content: ''
    };
  }
}

/**
 * Process all test files
 */
function processTestFiles() {
  // Get all test files
  const testFiles = globSync('tests/**/*.test.js', { cwd: projectRoot });
  stats.total = testFiles.length;
  
  console.log(`Found ${testFiles.length} test files.`);
  
  // Create backup directory
  const backupDir = path.join(projectRoot, 'tests-backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  // Create a unique timestamp for the backup
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
  const backupPath = path.join(backupDir, `commonjs-tests-${timestamp}`);
  fs.mkdirSync(backupPath, { recursive: true });
  
  console.log(`Created backup directory: ${backupPath}`);
  
  // Track files to remove
  const toRemove = [];
  const esmFiles = [];
  const commonjsFiles = [];
  const emptyFiles = [];
  
  // Process each file
  for (const file of testFiles) {
    const fullPath = path.join(projectRoot, file);
    const { isESM, isCommonJS, isEmpty } = checkModuleType(fullPath);
    
    if (isEmpty) {
      stats.empty++;
      emptyFiles.push(file);
      toRemove.push(file);
    } else if (isESM && !isCommonJS) {
      stats.esm++;
      esmFiles.push(file);
      // Keep ESM files
    } else if (isCommonJS) {
      stats.commonjs++;
      commonjsFiles.push(file);
      toRemove.push(file);
    } else {
      // If it doesn't match any pattern, assume it's CommonJS
      stats.commonjs++;
      commonjsFiles.push(file);
      toRemove.push(file);
    }
  }
  
  // Write lists of files to logs
  const logsDir = path.join(projectRoot, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }
  
  fs.writeFileSync(path.join(logsDir, 'esm-tests.json'), JSON.stringify(esmFiles, null, 2));
  fs.writeFileSync(path.join(logsDir, 'commonjs-tests.json'), JSON.stringify(commonjsFiles, null, 2));
  fs.writeFileSync(path.join(logsDir, 'empty-tests.json'), JSON.stringify(emptyFiles, null, 2));
  
  // Remove CommonJS and empty files
  for (const file of toRemove) {
    const fullPath = path.join(projectRoot, file);
    
    try {
      // Create backup directory structure
      const backupFilePath = path.join(backupPath, file);
      const backupFileDir = path.dirname(backupFilePath);
      
      if (!fs.existsSync(backupFileDir)) {
        fs.mkdirSync(backupFileDir, { recursive: true });
      }
      
      // Copy to backup
      fs.copyFileSync(fullPath, backupFilePath);
      
      // Remove file
      fs.unlinkSync(fullPath);
      stats.removed++;
      
      console.log(`Removed: ${file}`);
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }
  
  // Clean up empty directories
  console.log('\nCleaning up empty directories...');
  cleanEmptyDirectories();
  
  // Print summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total test files: ${stats.total}`);
  console.log(`ESM files (kept): ${stats.esm}`);
  console.log(`CommonJS files (removed): ${stats.commonjs}`);
  console.log(`Empty files (removed): ${stats.empty}`);
  console.log(`Total files removed: ${stats.removed}`);
  
  console.log('\nFiles details saved to:');
  console.log(`- logs/esm-tests.json`);
  console.log(`- logs/commonjs-tests.json`);
  console.log(`- logs/empty-tests.json`);
  
  console.log(`\nRemoved files backed up to: ${backupPath}`);
}

/**
 * Clean up empty directories
 */
function cleanEmptyDirectories() {
  let removedDirCount = 0;
  
  function scanForEmpty(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    // Process subdirectories first
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      if (fs.statSync(fullPath).isDirectory()) {
        scanForEmpty(fullPath);
      }
    }
    
    // Check if current directory is now empty
    const currentItems = fs.readdirSync(dir);
    if (currentItems.length === 0) {
      console.log(`  Removing empty directory: ${dir}`);
      fs.rmdirSync(dir);
      removedDirCount++;
    }
  }
  
  try {
    scanForEmpty(path.join(projectRoot, 'tests'));
  } catch (error) {
    console.error('Error cleaning empty directories:', error.message);
  }
  
  console.log(`  Removed ${removedDirCount} empty directories.`);
}

// Run the script
processTestFiles(); 