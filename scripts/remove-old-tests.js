#!/usr/bin/env node

/**
 * Remove Old Test Files Script
 * 
 * This script removes old test files from the original locations
 * after they have been moved to the new domain-driven structure.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Root directory
const rootDir = path.resolve(__dirname, '..');

// Original test directories to clean up
const OLD_TEST_DIRS = [
  'tests/integration/challenge',
  'tests/integration/prompt',
  'tests/integration/shared',
  'tests/integration/crossDomain',
  'tests/real-api/integration'
];

// Files to exclude (don't delete these)
const EXCLUDE_FILES = [
  'setup.js',
  'README.md',
  '.gitkeep'
];

// Track stats
const stats = {
  removed: 0,
  skipped: 0,
  errors: 0
};

// Function to recursively find and remove test files
function cleanupDirectory(dir) {
  // Skip if directory doesn't exist
  if (!fs.existsSync(dir)) {
    console.log(`Directory doesn't exist, skipping: ${dir}`);
    return;
  }
  
  const dirPath = path.join(rootDir, dir);
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    
    if (file.isDirectory()) {
      // Recursively clean subdirectories
      cleanupDirectory(path.join(dir, file.name));
      
      // Try to remove the directory if it's empty
      try {
        const remainingFiles = fs.readdirSync(fullPath);
        if (remainingFiles.length === 0) {
          fs.rmdirSync(fullPath);
          console.log(`Removed empty directory: ${fullPath}`);
        }
      } catch (error) {
        console.error(`Error checking/removing directory ${fullPath}:`, error.message);
        stats.errors++;
      }
    } else if (file.isFile() && !EXCLUDE_FILES.includes(file.name)) {
      // Check if the file exists in our new domains structure
      const fileBaseName = file.name;
      const potentialNewLocations = [
        path.join(rootDir, 'tests/domains/challenge', fileBaseName),
        path.join(rootDir, 'tests/domains/prompt', fileBaseName),
        path.join(rootDir, 'tests/domains/evaluation', fileBaseName),
        path.join(rootDir, 'tests/domains/focusArea', fileBaseName),
        path.join(rootDir, 'tests/shared/common', fileBaseName),
        path.join(rootDir, 'tests/shared/utils', fileBaseName),
        path.join(rootDir, 'tests/integration', fileBaseName),
        path.join(rootDir, 'tests/e2e', fileBaseName)
      ];
      
      const existsInNewLocation = potentialNewLocations.some(location => 
        fs.existsSync(location)
      );
      
      if (existsInNewLocation) {
        try {
          // Remove the file from the old location
          fs.unlinkSync(fullPath);
          console.log(`Removed: ${fullPath}`);
          stats.removed++;
        } catch (error) {
          console.error(`Error removing ${fullPath}:`, error.message);
          stats.errors++;
        }
      } else {
        console.log(`Skipped: ${fullPath} (not found in new structure)`);
        stats.skipped++;
      }
    } else {
      console.log(`Skipped: ${fullPath} (in exclusion list)`);
      stats.skipped++;
    }
  }
}

// Process each old test directory
OLD_TEST_DIRS.forEach(cleanupDirectory);

// Cleanup test files in the BDD directory if they're unused
const bddDir = path.join(rootDir, 'bdd');
if (fs.existsSync(bddDir)) {
  console.log('\nBDD directory will be handled later during DDD refactoring.');
}

// Print summary
console.log('\nCleanup Summary:');
console.log(`  Removed files: ${stats.removed}`);
console.log(`  Skipped files: ${stats.skipped}`);
console.log(`  Errors: ${stats.errors}`);

// Show next steps
console.log('\nNext steps:');
console.log('1. Update references to common test setup files');
console.log('2. Create a common test setup in tests/helpers directory');
console.log('3. Fix import paths in the domain tests');
console.log('4. Add more domain-specific test cases following our new structure'); 