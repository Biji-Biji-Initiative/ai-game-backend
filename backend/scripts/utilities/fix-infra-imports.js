#!/usr/bin/env node

/**
 * Fix duplicate 'infra' paths in imports
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the source directory
const SRC_DIR = path.join(__dirname, 'src');

// Find all JS files
const jsFiles = glob.sync('**/*.js', { cwd: SRC_DIR });

let totalFixed = 0;

// Process each file
for (const file of jsFiles) {
  const filePath = path.join(SRC_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix duplicate infra paths
  const newContent = content.replace(/from\s+['"]([^'"]*\/infra\/infra\/[^'"]*)['"]/g, (match, importPath) => {
    const fixedPath = importPath.replace('/infra/infra/', '/infra/');
    console.log(`In file ${file}: Fixed ${importPath} -> ${fixedPath}`);
    totalFixed++;
    return match.replace(importPath, fixedPath);
  });
  
  // Write changes if any were made
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
}

console.log(`\nTotal fixed: ${totalFixed} duplicate infra paths`); 