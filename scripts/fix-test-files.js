#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

/**
 * This script removes unnecessary global directive comments from test files
 * since we've added these globals to the ESLint configuration
 */
async function main() {
  // Find all test files with various patterns
  const testFiles = await glob([
    'tests/**/*.test.js',
    'tests/**/*.workflow.test.js',
    'tests/**/*.external.test.js',
    'tests/**/test*.js',
    'tests/**/*Integration.test.js'
  ]);
  
  let fixedCount = 0;
  
  for (const file of testFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Look for specific global directive comments
      const globalPattern = /\/\*\s*global\s+(describe|it|beforeEach|afterEach|before|after|setTimeout|process|console|require).*?\*\//gs;
      
      if (globalPattern.test(content)) {
        // Replace the global directive
        const updatedContent = content.replace(globalPattern, '');
        
        // Write the file back
        fs.writeFileSync(file, updatedContent, 'utf8');
        fixedCount++;
        
        console.log(`Fixed global directives in: ${file}`);
      }
    } catch (error) {
      console.error(`Error processing file ${file}:`, error.message);
    }
  }
  
  console.log(`\nCompleted: Fixed ${fixedCount} files`);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 