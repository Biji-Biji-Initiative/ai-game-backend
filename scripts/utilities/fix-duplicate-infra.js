#!/usr/bin/env node

/**
 * More direct fix for duplicate 'infra' in import paths
 */

import fs from 'fs';
import { glob } from 'glob';

const files = glob.sync('src/**/*.js');
const problematicPattern = /import\s+.*from\s+['"].*\/infra\/infra\//;
const fixedFiles = [];

console.log(`Checking ${files.length} files for duplicate 'infra' in imports...`);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // First look for any imports with /infra/infra/ pattern
  if (content.includes('/infra/infra/')) {
    console.log(`Found potential issue in: ${file}`);
    
    // More exhaustive inspection of the file contents
    let lines = content.split('\n');
    let modified = false;
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if the line contains an import with the problematic pattern
      if (line.includes('import') && line.includes('/infra/infra/')) {
        console.log(`  Original: ${line}`);
        // Replace /infra/infra/ with /infra/
        lines[i] = line.replace(/\/infra\/infra\//g, '/infra/');
        console.log(`  Fixed:    ${lines[i]}`);
        modified = true;
      }
    }
    
    // If we made changes, write the file back
    if (modified) {
      fs.writeFileSync(file, lines.join('\n'));
      fixedFiles.push(file);
    }
  }
});

console.log(`\nFixed ${fixedFiles.length} files with duplicate 'infra' in import paths.`);
if (fixedFiles.length > 0) {
  console.log("Fixed files:");
  fixedFiles.forEach(file => console.log(` - ${file}`));
} 