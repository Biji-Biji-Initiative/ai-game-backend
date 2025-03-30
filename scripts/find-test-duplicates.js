#!/usr/bin/env node

/**
 * Script to find duplicate test files across the test directory
 * This script identifies potential duplicates based on:
 * 1. Similar filenames
 * 2. Similar content (high overlap)
 * 3. Tests in multiple/incorrect locations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { globSync } from 'glob';

// Get the directory of the current file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Test directories to scan
const testDirectories = [
  'tests/domain',
  'tests/integration',
  'tests/external',
  'tests/e2e',
  'tests/api',
  'tests/unit',
  'tests/shared',
  'tests/infrastructure'
];

// Function to find all test files
function findAllTestFiles() {
  const allTestFiles = [];
  
  for (const dir of testDirectories) {
    const fullDir = path.join(projectRoot, dir);
    if (!fs.existsSync(fullDir)) continue;
    
    try {
      const files = globSync(`${dir}/**/*.test.js`, { cwd: projectRoot });
      allTestFiles.push(...files);
    } catch (error) {
      console.error(`Error scanning ${dir}:`, error.message);
    }
  }
  
  return allTestFiles;
}

// Function to calculate a hash of file content
function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(path.join(projectRoot, filePath), 'utf8');
    // Create a normalized version of the content by removing comments and whitespace
    const normalizedContent = content
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Remove comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    return {
      hash: crypto.createHash('md5').update(normalizedContent).digest('hex'),
      content: normalizedContent
    };
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return { hash: '', content: '' };
  }
}

// Function to find similar test names
function findSimilarFileNames(files) {
  const filesByBaseName = {};
  
  files.forEach(file => {
    const fileName = path.basename(file);
    // Group by filename without directory
    if (!filesByBaseName[fileName]) {
      filesByBaseName[fileName] = [];
    }
    filesByBaseName[fileName].push(file);
  });
  
  // Filter to only include files with the same name in multiple locations
  return Object.entries(filesByBaseName)
    .filter(([_, files]) => files.length > 1)
    .reduce((acc, [name, files]) => {
      acc[name] = files;
      return acc;
    }, {});
}

// Function to find files with similar content
function findSimilarContent(files) {
  const fileHashes = {};
  const similarContentGroups = {};
  
  // Calculate file hashes
  files.forEach(file => {
    const { hash, content } = getFileHash(file);
    if (!hash) return;
    
    if (!fileHashes[hash]) {
      fileHashes[hash] = [];
    }
    fileHashes[hash].push({ file, contentLength: content.length });
  });
  
  // Find files with the same hash
  Object.entries(fileHashes)
    .filter(([_, files]) => files.length > 1)
    .forEach(([hash, files]) => {
      similarContentGroups[hash] = files.map(f => f.file);
    });
  
  return similarContentGroups;
}

// Function to check for tests in incorrect locations
function findTestsInWrongLocations(files) {
  const incorrectLocations = {
    domain: [],
    integration: [],
    external: [],
    e2e: [],
    unit: []
  };
  
  const patterns = {
    domain: [/integration/i, /e2e/i, /external/i, /\.api\./i],
    integration: [/\.e2e\./i, /\.external\./i],
    external: [/\.integration\./i, /\.e2e\./i],
    e2e: [/\.integration\./i],
    unit: [/\.integration\./i, /\.e2e\./i, /\.external\./i]
  };
  
  files.forEach(file => {
    const content = fs.readFileSync(path.join(projectRoot, file), 'utf8');
    const lowerFile = file.toLowerCase();
    
    // Check file location against patterns
    for (const [category, categoryPatterns] of Object.entries(patterns)) {
      if (lowerFile.includes(`/tests/${category}/`)) {
        const hasIncorrectPattern = categoryPatterns.some(pattern => 
          pattern.test(lowerFile) || pattern.test(content)
        );
        
        if (hasIncorrectPattern) {
          incorrectLocations[category].push(file);
        }
      }
    }
  });
  
  return incorrectLocations;
}

// Main function to analyze tests
function analyzeTests() {
  console.log('Analyzing test files for duplicates and issues...');
  const allTestFiles = findAllTestFiles();
  console.log(`Found ${allTestFiles.length} test files across the test directories.\n`);
  
  // Find similar file names
  const similarFileNames = findSimilarFileNames(allTestFiles);
  if (Object.keys(similarFileNames).length > 0) {
    console.log('Files with the same name in multiple locations:');
    for (const [fileName, files] of Object.entries(similarFileNames)) {
      console.log(`\n  ${fileName}:`);
      files.forEach(file => console.log(`    - ${file}`));
    }
  } else {
    console.log('No files with identical names found in different locations.');
  }
  
  // Find files with similar content
  const similarContent = findSimilarContent(allTestFiles);
  if (Object.keys(similarContent).length > 0) {
    console.log('\nFiles with potentially duplicate content:');
    let groupNum = 1;
    for (const [hash, files] of Object.entries(similarContent)) {
      console.log(`\n  Duplicate Group ${groupNum++}:`);
      files.forEach(file => console.log(`    - ${file}`));
    }
  } else {
    console.log('\nNo files with duplicate content found.');
  }
  
  // Find tests in incorrect locations
  const incorrectLocations = findTestsInWrongLocations(allTestFiles);
  let hasIncorrectLocations = false;
  
  console.log('\nTests that may be in incorrect locations:');
  for (const [category, files] of Object.entries(incorrectLocations)) {
    if (files.length > 0) {
      hasIncorrectLocations = true;
      console.log(`\n  Tests in ${category} directory with incorrect patterns:`);
      files.forEach(file => console.log(`    - ${file}`));
    }
  }
  
  if (!hasIncorrectLocations) {
    console.log('  No tests found in incorrect locations.');
  }
  
  console.log('\nAnalysis complete. Use this information to guide test cleanup efforts.');
}

analyzeTests(); 