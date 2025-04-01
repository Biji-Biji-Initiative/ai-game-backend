#!/usr/bin/env node

/**
 * Cleanup JSDoc Comments Script
 * 
 * This script removes redundant JSDoc comments from JavaScript files,
 * particularly those that just say '/ ** Method methodName * /' after 
 * proper JSDoc blocks.
 * 
 * Usage: node scripts/cleanup-jsdoc.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

// The pattern to match redundant method JSDoc comments
const REDUNDANT_JSDOC_PATTERN = /\/\*\*\s*\n\s*\*\s*Method\s+\w+\s*\n\s*\*\/\s*\n/g;
const EMPTY_JSDOC_PATTERN = /\/\*\*\s*\n\s*\*\s*\n\s*\*\/\s*\n/g;

// Start directory
const startDir = path.resolve(process.cwd(), 'src');

// Counter for statistics
let processedFiles = 0;
let modifiedFiles = 0;
let removedComments = 0;

/**
 * Process a JavaScript file to remove redundant JSDoc comments
 * @param {string} filePath - Path to the file
 */
async function processFile(filePath) {
  // Only process JavaScript files
  if (!filePath.endsWith('.js')) {
    return;
  }

  processedFiles++;
  
  try {
    // Read the file content
    const content = await readFile(filePath, 'utf8');
    
    // Look for redundant method JSDoc comments
    const newContent = content
      .replace(REDUNDANT_JSDOC_PATTERN, (match) => {
        removedComments++;
        return '';
      })
      .replace(EMPTY_JSDOC_PATTERN, (match) => {
        removedComments++;
        return '';
      });
    
    // If the content was modified, write it back
    if (newContent !== content) {
      modifiedFiles++;
      await writeFile(filePath, newContent, 'utf8');
      console.log(`Cleaned up JSDoc comments in: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

/**
 * Recursively process directories to find and clean JS files
 * @param {string} dir - Directory to process
 */
async function processDirectory(dir) {
  try {
    const items = await readdir(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const itemStat = await stat(itemPath);
      
      if (itemStat.isDirectory()) {
        // Skip node_modules and other irrelevant directories
        if (item !== 'node_modules' && item !== '.git' && !item.startsWith('.')) {
          await processDirectory(itemPath);
        }
      } else if (itemStat.isFile()) {
        await processFile(itemPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dir}:`, error);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting JSDoc cleanup...');
  console.log(`Processing files in: ${startDir}`);
  
  try {
    await processDirectory(startDir);
    
    console.log('\nJSDoc cleanup complete!');
    console.log(`Files processed: ${processedFiles}`);
    console.log(`Files modified: ${modifiedFiles}`);
    console.log(`Comments removed: ${removedComments}\n`);
  } catch (error) {
    console.error('Error running cleanup script:', error);
    process.exit(1);
  }
}

main(); 