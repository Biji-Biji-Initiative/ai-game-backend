#!/usr/bin/env node

/**
 * Normalize import paths in ES Module conversion
 * This script will:
 * 1. Add .js extensions to imports
 * 2. Remove duplicate core/core segments
 * 3. Fix import paths for logging
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
  let hasChanges = false;
  let fixCount = 0;

  // Fix import paths
  const newContent = content.replace(/import\s+(?:(?:{[^}]*})|(?:\*\s+as\s+[^;]*)|\S+)\s+from\s+['"]([^'"]+)['"]/g, (match, importPath) => {
    let newPath = importPath;
    
    // 1. Add .js extension to relative imports if missing
    if ((importPath.startsWith('./') || importPath.startsWith('../') || importPath.startsWith('/')) && 
        !importPath.endsWith('.js') && !importPath.endsWith('.json')) {
      newPath = `${importPath}.js`;
      hasChanges = true;
      fixCount++;
    }
    
    // 2. Fix duplicate core segments
    if (importPath.includes('/core/core/')) {
      newPath = newPath.replace('/core/core/', '/core/');
      hasChanges = true;
      fixCount++;
    }
    
    // 3. Fix double .js extension
    if (newPath.endsWith('.js.js')) {
      newPath = newPath.replace('.js.js', '.js');
      hasChanges = true;
      fixCount++;
    }
    
    // 4. Fix incorrect logging path
    if (importPath.includes('/logging/logger') && !importPath.includes('/infra/logging/logger')) {
      newPath = newPath.replace('/logging/logger', '/infra/logging/logger');
      if (!newPath.endsWith('.js')) newPath += '.js';
      hasChanges = true;
      fixCount++;
    }
    
    // Fix infra/infra duplication
    if (newPath.includes('/infra/infra/')) {
      newPath = newPath.replace('/infra/infra/', '/infra/');
      hasChanges = true;
      fixCount++;
    }
    
    // Replace the import path
    return match.replace(importPath, newPath);
  });
  
  // Write changes to file if necessary
  if (hasChanges) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Fixed ${fixCount} import(s) in ${file}`);
    totalFixed += fixCount;
  }
}

console.log(`\nTotal fixed: ${totalFixed} imports`); 