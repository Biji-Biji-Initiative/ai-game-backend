#!/usr/bin/env node
/**
 * Fix Source Import Paths
 * 
 * This script finds all source files in the src directory and fixes import paths
 * that incorrectly reference the tests directory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

// Convert __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Configuration
const TARGET_DIRS = [
  'src/**/*.js',
];

// Regular expression to find import paths
const REQUIRE_REGEX = /require\s*\(\s*['"](.+?)['"]\s*\)/g;
const IMPORT_REGEX = /from\s+['"](.+?)['"]/g;

/**
 * Fixes import paths in a file
 * @param {string} filePath - Path to the file
 * @returns {boolean} - True if file was modified
 */
async function fixImportPaths(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let modified = false;

    // Fix require statements
    content = content.replace(REQUIRE_REGEX, (match, importPath) => {
      if (importPath.includes('tests/') && importPath.startsWith('../../../')) {
        modified = true;
        return match.replace('../../../tests/', '../../tests/');
      }
      return match;
    });

    // Fix import statements (if the project uses ES modules)
    content = content.replace(IMPORT_REGEX, (match, importPath) => {
      if (importPath.includes('tests/') && importPath.startsWith('../../../')) {
        modified = true;
        return match.replace('../../../tests/', '../../tests/');
      }
      return match;
    });

    // Save file if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed imports in ${path.relative(rootDir, filePath)}`);
    }

    return modified;
  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Finding source files...');
  
  let modifiedCount = 0;
  let fileCount = 0;
  
  // Process each target directory
  for (const pattern of TARGET_DIRS) {
    const files = await glob(pattern, { cwd: rootDir });
    
    for (const file of files) {
      fileCount++;
      const filePath = path.join(rootDir, file);
      const wasModified = await fixImportPaths(filePath);
      if (wasModified) modifiedCount++;
    }
  }
  
  console.log(`\n✅ Done! Processed ${fileCount} files, fixed imports in ${modifiedCount} files.`);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
}); 