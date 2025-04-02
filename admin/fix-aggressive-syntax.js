#!/usr/bin/env node

/**
 * Aggressive Syntax Fixer Script
 * 
 * This script fixes the specific ": anyName:" syntax error
 */

import fs from 'fs';
import path from 'path';
import * as glob from 'glob';

function fixSyntaxErrorsInFile(filePath) {
  console.log(`Fixing syntax errors in ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const fileName = path.basename(filePath);
  
  // Fix the specific malformed parameter syntax
  content = content.replace(/(\w+): any(\w+): /g, '$1: ');
  
  // Only write if we made changes
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Fixed syntax error pattern in ${fileName}`);
    return 1; // Return 1 if changes were made
  } else {
    console.log(`  No specific syntax errors found in ${fileName}`);
    return 0; // Return 0 if no changes were made
  }
}

function main() {
  const tsFiles = glob.sync('js/**/*.ts');
  
  console.log(`Found ${tsFiles.length} TypeScript files to process`);
  
  let totalFixes = 0;
  
  // Process each file
  for (const filePath of tsFiles) {
    totalFixes += fixSyntaxErrorsInFile(filePath);
  }
  
  console.log(`Syntax fixing complete! Applied fixes in ${totalFixes} files.`);
}

main(); 