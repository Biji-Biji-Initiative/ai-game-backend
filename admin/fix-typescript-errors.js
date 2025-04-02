#!/usr/bin/env node

/**
 * TypeScript Error Fixer Script
 * 
 * This script removes problematic type annotations
 */

import fs from 'fs';
import path from 'path';
import * as glob from 'glob';

function fixTypescriptErrorsInFile(filePath) {
  console.log(`Fixing TypeScript errors in ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  let appliedFixes = 0;
  
  // These patterns match and remove the ": any" additions that have broken code
  const patternToFixMap = [
    {
      pattern: /(\w+): any(\.|,|\(|\)|\[|\s|$)/g,
      replacement: '$1$2',
      description: 'Remove added any type annotations'
    },
    {
      pattern: /\((\w+) as any\)/g, 
      replacement: '($1)',
      description: 'Remove unnecessary any casts'
    },
    {
      pattern: /function \w+\(([^)]*): any([^)]*)\)/g,
      replacement: 'function $1($2)',
      description: 'Fix function parameters'
    }
  ];
  
  // Apply each fix
  for (const fix of patternToFixMap) {
    const originalContent = content;
    content = content.replace(fix.pattern, fix.replacement);
    
    if (content !== originalContent) {
      appliedFixes++;
      console.log(`  Applied fix: ${fix.description}`);
    }
  }
  
  // Only write if we made changes
  if (appliedFixes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Applied ${appliedFixes} fixes to ${fileName}`);
  } else {
    console.log(`  No fixes needed for ${fileName}`);
  }
  
  return appliedFixes;
}

function main() {
  const tsFiles = glob.sync('js/**/*.ts');
  
  console.log(`Found ${tsFiles.length} TypeScript files to process`);
  
  let totalFixes = 0;
  
  // Process each file
  for (const filePath of tsFiles) {
    totalFixes += fixTypescriptErrorsInFile(filePath);
  }
  
  console.log(`TypeScript error fixing complete! Applied ${totalFixes} fixes total.`);
}

main(); 