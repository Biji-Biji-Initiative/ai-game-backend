#!/usr/bin/env node
/**
 * Test Cleanup Script
 * 
 * This script helps clean up old, archived, and duplicate test files.
 * It identifies test files that should be archived or removed.
 * 
 * Usage:
 *   node scripts/clean-up-old-tests.js [options]
 * 
 * Examples:
 *   node scripts/clean-up-old-tests.js            # Analyze tests for cleanup
 *   node scripts/clean-up-old-tests.js --archive  # Archive old tests
 *   node scripts/clean-up-old-tests.js --delete   # Delete old tests (use with caution)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');

// Configuration
const shouldArchive = process.argv.includes('--archive');
const shouldDelete = process.argv.includes('--delete');
const dryRun = !shouldArchive && !shouldDelete;

// Directories to check for old tests
const OLD_DIRECTORIES = [
  'tests/legacy/**/*.js',
  'tests/archive/**/*.js',
  'tests/real-api/**/*.js',
  'tests/logs/**/*.js',
  'tests/old/**/*.js'
];

// Patterns to identify duplicate tests
const DUPLICATE_PATTERNS = [
  { pattern: /(\.direct|DirectAPI|direct-api)\.test\.js$/i, replacement: 'direct.test.js' },
  { pattern: /(\.integration|IntegrationTest|integration-test)\.test\.js$/i, replacement: 'integration.test.js' },
  { pattern: /(\.responses-api|ResponsesAPI|responses-api-test)\.test\.js$/i, replacement: 'responses-api.test.js' },
  { pattern: /(\.e2e|EndToEnd|end-to-end-test)\.test\.js$/i, replacement: 'e2e.test.js' }
];

// Archive directory
const ARCHIVE_DIR = 'tests/archive/cleanup';

// Find old tests
function findOldTests() {
  let oldTests = [];
  
  for (const pattern of OLD_DIRECTORIES) {
    const files = glob.sync(pattern);
    oldTests = oldTests.concat(files);
  }
  
  return oldTests;
}

// Find duplicate tests
function findDuplicateTests() {
  const allTests = glob.sync('tests/**/*.test.js');
  const duplicates = [];
  
  // Group tests by their logical name (removing variations)
  const testGroups = {};
  
  for (const test of allTests) {
    const fileName = path.basename(test);
    const dirName = path.dirname(test);
    
    // Skip already archived tests
    if (dirName.includes('archive') || dirName.includes('legacy')) {
      continue;
    }
    
    // Try to normalize the name
    let normalizedName = fileName;
    let matched = false;
    
    for (const { pattern, replacement } of DUPLICATE_PATTERNS) {
      if (pattern.test(fileName)) {
        normalizedName = fileName.replace(pattern, replacement);
        matched = true;
        break;
      }
    }
    
    // If no pattern matched, use as is
    if (!matched) {
      normalizedName = fileName;
    }
    
    // Group by normalized name
    if (!testGroups[normalizedName]) {
      testGroups[normalizedName] = [];
    }
    
    testGroups[normalizedName].push(test);
  }
  
  // Find groups with more than one test
  for (const [name, tests] of Object.entries(testGroups)) {
    if (tests.length > 1) {
      // Find the newest file
      let newest = tests[0];
      let newestStat = fs.statSync(newest);
      
      for (let i = 1; i < tests.length; i++) {
        const stat = fs.statSync(tests[i]);
        if (stat.mtime > newestStat.mtime) {
          newest = tests[i];
          newestStat = stat;
        }
      }
      
      // All other files are candidates for archiving
      for (const test of tests) {
        if (test !== newest) {
          duplicates.push({
            path: test,
            newest: newest,
            lastModified: fs.statSync(test).mtime
          });
        }
      }
    }
  }
  
  return duplicates;
}

// Archive a test file
function archiveTest(filePath) {
  const archivePath = path.join(ARCHIVE_DIR, path.basename(filePath));
  
  // Create archive directory if it doesn't exist
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
  
  // If the file already exists in the archive, add a suffix
  if (fs.existsSync(archivePath)) {
    const ext = path.extname(archivePath);
    const base = path.basename(archivePath, ext);
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    const newArchivePath = path.join(ARCHIVE_DIR, `${base}_${timestamp}${ext}`);
    fs.copyFileSync(filePath, newArchivePath);
    return newArchivePath;
  }
  
  // Copy to archive
  fs.copyFileSync(filePath, archivePath);
  return archivePath;
}

// Delete a test file
function deleteTest(filePath) {
  fs.unlinkSync(filePath);
}

// Main function
async function main() {
  console.log(chalk.blue('=== Test Cleanup Tool ==='));
  console.log(chalk.cyan(`Mode: ${dryRun ? 'Analyze' : shouldArchive ? 'Archive' : 'Delete'}`));
  console.log(chalk.cyan('---------------------------'));
  
  // Find old tests
  const oldTests = findOldTests();
  console.log(`Found ${oldTests.length} tests in old/archive directories.`);
  
  // Find duplicate tests
  const duplicateTests = findDuplicateTests();
  console.log(`Found ${duplicateTests.length} duplicate tests.`);
  
  // Process old tests
  if (oldTests.length > 0) {
    console.log(chalk.yellow('\nOld tests in archive directories:'));
    
    for (const test of oldTests) {
      console.log(`  ${test}`);
      
      if (shouldArchive) {
        console.log(chalk.green(`    Already in archive.`));
      } else if (shouldDelete) {
        try {
          deleteTest(test);
          console.log(chalk.red(`    Deleted!`));
        } catch (error) {
          console.error(chalk.red(`    Failed to delete: ${error.message}`));
        }
      }
    }
  }
  
  // Process duplicate tests
  if (duplicateTests.length > 0) {
    console.log(chalk.yellow('\nDuplicate tests:'));
    
    for (const test of duplicateTests) {
      console.log(`  ${test.path}`);
      console.log(`    Newer version: ${test.newest}`);
      console.log(`    Last modified: ${test.lastModified.toISOString()}`);
      
      if (shouldArchive) {
        try {
          const archivePath = archiveTest(test.path);
          console.log(chalk.green(`    Archived to: ${archivePath}`));
        } catch (error) {
          console.error(chalk.red(`    Failed to archive: ${error.message}`));
        }
      } else if (shouldDelete) {
        try {
          deleteTest(test.path);
          console.log(chalk.red(`    Deleted!`));
        } catch (error) {
          console.error(chalk.red(`    Failed to delete: ${error.message}`));
        }
      }
    }
  }
  
  console.log(chalk.cyan('\n---------------------------'));
  
  if (dryRun && (oldTests.length > 0 || duplicateTests.length > 0)) {
    console.log(chalk.green('Run with --archive to archive old and duplicate tests:'));
    console.log(chalk.green('  node scripts/clean-up-old-tests.js --archive'));
    console.log(chalk.red('\nOr run with --delete to permanently delete them (use with caution):'));
    console.log(chalk.red('  node scripts/clean-up-old-tests.js --delete'));
  }
}

main().catch(console.error); 