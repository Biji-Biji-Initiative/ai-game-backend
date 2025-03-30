/**
 * Find Error Assertions in Tests
 * 
 * This script scans test files for error assertions that might need to be updated
 * to use domain-specific errors instead of generic Error.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the project root
const projectRoot = resolve(__dirname, '..');

console.log('🔍 Finding error assertions in test files...');

// Find all JavaScript test files
const testFiles = globSync('tests/**/*.js', { cwd: projectRoot });

// Patterns to look for
const patterns = [
  // expect().to.throw()
  { 
    pattern: /expect\([^)]+\).to.throw\([^)]*Error[^)]*\)/g, 
    description: 'expect().to.throw() with Error' 
  },
  // expect().to.be.an('error')
  { 
    pattern: /expect\([^)]+\).to.be.an\(['"]error['"]\)/g, 
    description: 'expect().to.be.an("error")' 
  },
  // throw new Error()
  { 
    pattern: /throw new Error\(/g, 
    description: 'throw new Error()' 
  },
  // instanceof Error
  { 
    pattern: /instanceof Error/g, 
    description: 'instanceof Error check' 
  },
  // catch without specific error type
  { 
    pattern: /catch\s*\(\s*(?:err|error|e)\s*\)/g, 
    description: 'catch without specific error type' 
  }
];

// Results storage
const results = [];

// Process each file
for (const file of testFiles) {
  const filePath = resolve(projectRoot, file);
  const content = readFileSync(filePath, 'utf-8');
  
  const fileResults = [];
  
  // Check each pattern
  for (const { pattern, description } of patterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      // Get line numbers for matches
      const lines = content.split('\n');
      const matchLines = [];
      
      for (let i = 0; i < lines.length; i++) {
        for (const match of matches) {
          if (lines[i].includes(match)) {
            matchLines.push({ line: i + 1, content: lines[i].trim() });
            break;
          }
        }
      }
      
      if (matchLines.length > 0) {
        fileResults.push({
          description,
          count: matches.length,
          lines: matchLines
        });
      }
    }
  }
  
  if (fileResults.length > 0) {
    results.push({
      file,
      matches: fileResults
    });
  }
}

// Print results
console.log('\n-------------------------------------------------');
console.log('Test Files with Generic Error Assertions');
console.log('-------------------------------------------------');

results.forEach(({ file, matches }) => {
  console.log(`\n📝 ${file}`);
  matches.forEach(({ description, count, lines }) => {
    console.log(`  - ${description}: ${count} matches`);
    lines.forEach(({ line, content }) => {
      console.log(`    Line ${line}: ${content.length > 100 ? content.substring(0, 100) + '...' : content}`);
    });
  });
});

console.log('\n\n✅ Done! Found test files with error assertions that might need to be updated.');
console.log(`Total files that may need updates: ${results.length}`);

// Generate a summary of domain-specific errors available in the codebase
console.log('\n-------------------------------------------------');
console.log('Domain-Specific Errors Available in Codebase');
console.log('-------------------------------------------------');

const errorFiles = globSync('src/core/**/errors/**/*.js', { cwd: projectRoot });
const availableErrors = [];

errorFiles.forEach(file => {
  try {
    const content = readFileSync(resolve(projectRoot, file), 'utf-8');
    const errorClasses = content.match(/class\s+(\w+Error)\s+extends/g);
    
    if (errorClasses && errorClasses.length > 0) {
      const domain = file.split('/')[2]; // Extract domain from path
      
      errorClasses.forEach(errorClass => {
        const errorName = errorClass.match(/class\s+(\w+Error)/)[1];
        availableErrors.push({ domain, errorName, file });
      });
    }
  } catch (err) {
    console.error(`Error processing file ${file}:`, err);
  }
});

// Group by domain
const errorsByDomain = availableErrors.reduce((acc, { domain, errorName, file }) => {
  if (!acc[domain]) {
    acc[domain] = [];
  }
  acc[domain].push({ errorName, file });
  return acc;
}, {});

// Print domain-specific errors
Object.entries(errorsByDomain).forEach(([domain, errors]) => {
  console.log(`\n🔷 ${domain} Domain Errors:`);
  errors.forEach(({ errorName, file }) => {
    console.log(`  - ${errorName} (${file})`);
  });
}); 