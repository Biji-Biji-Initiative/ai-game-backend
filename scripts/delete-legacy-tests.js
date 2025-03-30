/**
 * Delete Legacy Test Files
 * 
 * This script identifies and deletes legacy test files.
 * Legacy files are identified by:
 * 1. Having '-legacy' or '_legacy' in their filename
 * 2. Having 0 tests (empty test files)
 * 
 * The script will create a backup before deleting.
 */

import { readFileSync, copyFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, basename, join } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// Get project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Get target domain from command line (default to challenge)
const targetDomain = process.argv[2] || 'challenge';
console.log(`Finding legacy test files for domain: ${targetDomain}`);

// Create backup directory if it doesn't exist
const backupDir = resolve(projectRoot, 'backups', 'legacy-tests');
if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
  console.log(`Created backup directory: ${backupDir}`);
}

// Find all test files for the target domain
const testFiles = globSync(`tests/**/*${targetDomain}*/**/*.test.js`, { cwd: projectRoot });
console.log(`Found ${testFiles.length} test files`);

// Find legacy files by name
const legacyByName = testFiles.filter(file => 
  file.includes('-legacy') || 
  file.includes('_legacy')
);

console.log(`Found ${legacyByName.length} legacy files by name`);

// Find files with zero tests
const zeroTestFiles = [];

for (const file of testFiles) {
  const filePath = resolve(projectRoot, file);
  const content = readFileSync(filePath, 'utf-8');
  
  // Count test cases (it blocks)
  const testRegex = /\s*(it|test)\(['"`]/g;
  const matches = content.match(testRegex);
  const testCount = matches ? matches.length : 0;
  
  if (testCount === 0) {
    zeroTestFiles.push(file);
  }
}

console.log(`Found ${zeroTestFiles.length} files with 0 tests`);

// Combine and deduplicate
const legacyFiles = [...new Set([...legacyByName, ...zeroTestFiles])];
console.log(`Total legacy files to delete: ${legacyFiles.length}`);

// Exit if no files to delete
if (legacyFiles.length === 0) {
  console.log('No legacy files found. Exiting.');
  process.exit(0);
}

// Check if we should actually delete
const shouldDelete = process.argv.includes('--delete');

// Print files that will be deleted
console.log('\nFiles to delete:');
legacyFiles.forEach(file => console.log(`  - ${file}`));

// Check if we should actually delete
if (!shouldDelete) {
  console.log('\nFiles not deleted. Run with --delete flag to actually delete files:');
  console.log(`node scripts/delete-legacy-tests.js ${targetDomain} --delete`);
  process.exit(0);
}

// Create backups and delete files
console.log('\nCreating backups and deleting files...');
let deletedCount = 0;

for (const file of legacyFiles) {
  const filePath = resolve(projectRoot, file);
  const backupPath = join(backupDir, basename(file));
  
  try {
    // Create backup
    copyFileSync(filePath, backupPath);
    console.log(`✅ Backed up: ${file} to ${backupPath}`);
    
    // Delete file
    unlinkSync(filePath);
    console.log(`🗑️ Deleted: ${file}`);
    deletedCount++;
  } catch (error) {
    console.error(`❌ Error processing ${file}: ${error.message}`);
  }
}

console.log(`\nDeleted ${deletedCount} files`);
console.log(`Backups created in: ${backupDir}`);
console.log('\nIf you need to restore a file, copy it back from the backup directory.'); 