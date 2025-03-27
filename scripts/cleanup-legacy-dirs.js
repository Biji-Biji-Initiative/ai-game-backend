#!/usr/bin/env node

/**
 * Cleanup Legacy Directories Script
 * 
 * This script removes empty legacy test directories and moves any
 * remaining files to the tests/legacy directory.
 */

const fs = require('fs');
const path = require('path');

// Root directory
const rootDir = path.resolve(__dirname, '..');

// Legacy directories to clean up or remove if empty
const LEGACY_DIRS = [
  'tests/challenges',
  'tests/focus-areas',
  'tests/integration/challenge',
  'tests/integration/prompt',
  'tests/integration/shared',
  'tests/integration/crossDomain',
  'tests/real-api/integration'
];

// Track stats
const stats = {
  removedDirs: 0,
  movedFiles: 0,
  skipped: 0,
  errors: 0
};

// Make sure the legacy directory exists
const legacyDir = path.join(rootDir, 'tests/legacy');
if (!fs.existsSync(legacyDir)) {
  fs.mkdirSync(legacyDir, { recursive: true });
  console.log(`Created legacy directory: ${legacyDir}`);
}

// Function to check if directory is empty
function isDirectoryEmpty(dir) {
  try {
    const files = fs.readdirSync(dir);
    return files.length === 0;
  } catch (error) {
    console.error(`Error checking if directory is empty: ${dir}`, error.message);
    return false;
  }
}

// Function to move files from a directory to the legacy directory
function moveFilesToLegacy(dir) {
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const sourcePath = path.join(dir, file.name);
      
      // Recursively process subdirectories
      if (file.isDirectory()) {
        moveFilesToLegacy(sourcePath);
        
        // Remove the directory if it's now empty
        if (isDirectoryEmpty(sourcePath)) {
          fs.rmdirSync(sourcePath);
          console.log(`Removed empty directory: ${sourcePath}`);
          stats.removedDirs++;
        }
        
        continue;
      }
      
      // Move file to legacy directory
      const targetPath = path.join(legacyDir, `${path.basename(dir)}_${file.name}`);
      fs.copyFileSync(sourcePath, targetPath);
      fs.unlinkSync(sourcePath);
      console.log(`Moved to legacy: ${sourcePath} -> ${targetPath}`);
      stats.movedFiles++;
    }
  } catch (error) {
    console.error(`Error processing directory: ${dir}`, error.message);
    stats.errors++;
  }
}

// Process each legacy directory
for (const relativeDir of LEGACY_DIRS) {
  const dir = path.join(rootDir, relativeDir);
  
  // Skip if the directory doesn't exist
  if (!fs.existsSync(dir)) {
    console.log(`Skipped: ${dir} (directory doesn't exist)`);
    stats.skipped++;
    continue;
  }
  
  // Check if the directory is empty
  if (isDirectoryEmpty(dir)) {
    // Remove the empty directory
    try {
      fs.rmdirSync(dir);
      console.log(`Removed empty directory: ${dir}`);
      stats.removedDirs++;
    } catch (error) {
      console.error(`Error removing directory: ${dir}`, error.message);
      stats.errors++;
    }
  } else {
    // Move files to legacy
    console.log(`Processing non-empty directory: ${dir}`);
    moveFilesToLegacy(dir);
    
    // Try to remove the directory if it's now empty
    if (isDirectoryEmpty(dir)) {
      try {
        fs.rmdirSync(dir);
        console.log(`Removed empty directory: ${dir}`);
        stats.removedDirs++;
      } catch (error) {
        console.error(`Error removing directory: ${dir}`, error.message);
        stats.errors++;
      }
    }
  }
}

// Check if tests/integration is now empty
const integrationDir = path.join(rootDir, 'tests/integration');
if (fs.existsSync(integrationDir) && isDirectoryEmpty(integrationDir)) {
  try {
    fs.rmdirSync(integrationDir);
    console.log(`Removed empty directory: ${integrationDir}`);
    stats.removedDirs++;
  } catch (error) {
    console.error(`Error removing directory: ${integrationDir}`, error.message);
    stats.errors++;
  }
}

// Print summary
console.log('\nLegacy Directory Cleanup Summary:');
console.log(`  Directories removed: ${stats.removedDirs}`);
console.log(`  Files moved to legacy: ${stats.movedFiles}`);
console.log(`  Directories skipped: ${stats.skipped}`);
console.log(`  Errors: ${stats.errors}`);

// Add the script to package.json if not already there
try {
  const packagePath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (!packageJson.scripts['test:cleanup-legacy']) {
    packageJson.scripts['test:cleanup-legacy'] = 'node scripts/cleanup-legacy-dirs.js';
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('\nAdded test:cleanup-legacy script to package.json');
  }
} catch (error) {
  console.error('Error updating package.json:', error.message);
}

console.log('\nNext steps:');
console.log('1. Run the tests with the new structure: npm run test:domains');
console.log('2. Consider moving any valuable tests from the legacy directory to appropriate domains');
console.log('3. Update test files to use in-memory repositories');
console.log('4. Remove the tests/legacy directory when no longer needed'); 