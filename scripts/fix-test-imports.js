#!/usr/bin/env node

/**
 * Fix Test Import Paths
 * 
 * This script automatically fixes import paths in test files,
 * replacing '../../../src/' and '../../../../src/' with the correct paths
 * relative to the file location.
 * 
 * Usage: node scripts/fix-test-imports.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Path to tests directory
const TESTS_DIR = path.join(__dirname, '../tests');

// Path patterns to fix
const PATH_PATTERNS = [
  { 
    pattern: /require\(['"]\.\.\/\.\.\/\.\.\/src\//g, 
    computeReplacement: (filePath) => {
      // Compute the correct relative path based on the file's location
      const pathFromTestDir = path.relative(TESTS_DIR, filePath);
      const depth = pathFromTestDir.split(path.sep).length;
      const dots = '../'.repeat(depth);
      return `require('${dots}src/`;
    }
  },
  { 
    pattern: /require\(['"]\.\.\/\.\.\/\.\.\/\.\.\/src\//g, 
    computeReplacement: (filePath) => {
      // Compute the correct relative path based on the file's location
      const pathFromTestDir = path.relative(TESTS_DIR, filePath);
      const depth = pathFromTestDir.split(path.sep).length;
      const dots = '../'.repeat(depth);
      return `require('${dots}src/`;
    }
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/src\//g,
    computeReplacement: (filePath) => {
      // Compute the correct relative path based on the file's location
      const pathFromTestDir = path.relative(TESTS_DIR, filePath);
      const depth = pathFromTestDir.split(path.sep).length;
      const dots = '../'.repeat(depth);
      return `from '${dots}src/`;
    }
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/src\//g,
    computeReplacement: (filePath) => {
      // Compute the correct relative path based on the file's location
      const pathFromTestDir = path.relative(TESTS_DIR, filePath);
      const depth = pathFromTestDir.split(path.sep).length;
      const dots = '../'.repeat(depth);
      return `from '${dots}src/`;
    }
  }
];

/**
 * Processes a single file, replacing incorrect import paths
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} - Whether the file was modified
 */
async function processFile(filePath) {
  try {
    // Read the file
    const content = await readFile(filePath, 'utf8');
    let newContent = content;
    let modified = false;

    // Apply each pattern replacement
    for (const { pattern, computeReplacement } of PATH_PATTERNS) {
      if (pattern.test(newContent)) {
        const replacement = computeReplacement(filePath);
        newContent = newContent.replace(pattern, replacement);
        modified = true;
      }
    }

    // Write the file if it was modified
    if (modified) {
      await writeFile(filePath, newContent, 'utf8');
      console.log(`✓ Fixed import paths in: ${path.relative(__dirname, filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Recursively processes files in a directory
 * @param {string} directory - Directory to process
 * @returns {Promise<number>} - Number of files modified
 */
async function processDirectory(directory) {
  let modifiedCount = 0;

  try {
    const entries = await readdir(directory);

    for (const entry of entries) {
      const entryPath = path.join(directory, entry);
      const entryStat = await stat(entryPath);

      if (entryStat.isDirectory()) {
        modifiedCount += await processDirectory(entryPath);
      } else if (entry.endsWith('.js') || entry.endsWith('.ts')) {
        if (await processFile(entryPath)) {
          modifiedCount++;
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${directory}:`, error.message);
  }

  return modifiedCount;
}

/**
 * Main function
 */
async function main() {
  console.log('Fixing import paths in test files...');
  const modifiedCount = await processDirectory(TESTS_DIR);
  console.log(`\nDone! Modified ${modifiedCount} files.`);
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 