/**
 * Standardize Test Filenames
 * 
 * This script renames test files to follow kebab-case convention.
 * It helps standardize naming patterns across the test suite.
 */

import { readdirSync, renameSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, basename, join } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// Get project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Function to convert to kebab-case
function toKebabCase(str) {
  return str
    // Handle PascalCase
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    // Handle camelCase
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    // Remove dots, underscores, and ensure all lowercase
    .replace(/[._]/g, '-')
    .toLowerCase();
}

// Get target directory from command line (default to challenge)
const targetDomain = process.argv[2] || 'challenge';
console.log(`Standardizing filenames for domain: ${targetDomain}`);

// Find all test files for the target domain
const testFiles = globSync(`tests/**/*${targetDomain}*/**/*.test.js`, { cwd: projectRoot });
console.log(`Found ${testFiles.length} test files`);

// Track how many files were renamed
let renamedCount = 0;
let skippedCount = 0;

// Process each file
for (const file of testFiles) {
  const filePath = resolve(projectRoot, file);
  const fileDir = dirname(filePath);
  const fileName = basename(filePath);
  
  // Convert the filename to kebab-case
  const kebabFileName = toKebabCase(fileName);
  
  // Skip if already in kebab-case
  if (kebabFileName === fileName) {
    console.log(`✓ Already standardized: ${file}`);
    skippedCount++;
    continue;
  }
  
  // Create the new path
  const newPath = join(fileDir, kebabFileName);
  
  // Check if the destination file already exists
  if (existsSync(newPath)) {
    console.log(`⚠️ Cannot rename: ${file} → ${kebabFileName} (destination file already exists)`);
    skippedCount++;
    continue;
  }
  
  try {
    // Rename the file
    renameSync(filePath, newPath);
    console.log(`✅ Renamed: ${file} → ${kebabFileName}`);
    renamedCount++;
  } catch (error) {
    console.error(`❌ Error renaming ${file}: ${error.message}`);
    skippedCount++;
  }
}

console.log(`\nStandardization complete!`);
console.log(`Renamed: ${renamedCount} files`);
console.log(`Skipped: ${skippedCount} files`);
console.log(`\nNext steps:`);
console.log(`1. Update imports in any files that referenced the renamed files`);
console.log(`2. Update test scripts that might reference specific file paths`);
console.log(`3. Run tests to ensure everything still works`);
console.log(`\nRun this script for other domains by specifying a domain name:`);
console.log(`node scripts/standardize-test-filenames.js user`); 