/**
 * Find duplicate test coverage in challenge domain
 * 
 * This script identifies tests with similar descriptions across multiple files,
 * helping locate potential duplications in test coverage.
 * 
 * Usage:
 *   node scripts/find-duplicate-tests.js
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// Get project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Find all challenge tests
const challengeTests = globSync('tests/**/*challenge*/**/*.test.js', { cwd: projectRoot });
console.log(`Found ${challengeTests.length} challenge test files`);

// Map to store test titles by their description
const testsByDescription = new Map();
// Track files by their test count
const fileTestCount = new Map();
// Track duplicate file patterns (e.g. kebab vs camel case)
const similarFileNames = new Map();

// Process each file
for (const file of challengeTests) {
  const content = readFileSync(resolve(projectRoot, file), 'utf-8');
  let testCount = 0;
  
  // Extract test descriptions (text inside it() calls)
  const testRegex = /it\(\s*['"`](.*?)['"`]/g;
  let match;
  
  while ((match = testRegex.exec(content)) !== null) {
    const testDescription = match[1].toLowerCase();
    testCount++;
    
    if (!testsByDescription.has(testDescription)) {
      testsByDescription.set(testDescription, []);
    }
    
    testsByDescription.get(testDescription).push(file);
  }
  
  // Track how many tests in each file
  fileTestCount.set(file, testCount);
  
  // Identify similar filenames (kebab-case vs camelCase)
  const baseName = file.split('/').pop();
  const normalizedName = baseName
    .replace(/-/g, '')     // Remove hyphens
    .replace(/\./g, '')    // Remove dots
    .toLowerCase();        // Convert to lowercase
  
  if (!similarFileNames.has(normalizedName)) {
    similarFileNames.set(normalizedName, []);
  }
  
  similarFileNames.get(normalizedName).push(file);
}

// Find duplicates
console.log("\n=== POTENTIAL DUPLICATE TESTS ===");
let duplicateTestCount = 0;
for (const [description, files] of testsByDescription.entries()) {
  if (files.length > 1) {
    console.log(`\n"${description}" appears in ${files.length} files:`);
    files.forEach(file => console.log(`  - ${file}`));
    duplicateTestCount++;
  }
}
console.log(`\nFound ${duplicateTestCount} potentially duplicate test descriptions`);

// Find similar filenames
console.log("\n=== SIMILAR FILENAMES ===");
let similarFileCount = 0;
for (const [normalizedName, files] of similarFileNames.entries()) {
  if (files.length > 1) {
    console.log(`\nSimilar filenames found:`);
    files.forEach(file => console.log(`  - ${file} (${fileTestCount.get(file)} tests)`));
    similarFileCount++;
  }
}
console.log(`\nFound ${similarFileCount} groups of similar filenames`);

// Analyze by test category
console.log("\n=== TESTS BY CATEGORY ===");
const categories = {
  unit: challengeTests.filter(f => f.includes('/unit/')),
  domain: challengeTests.filter(f => f.includes('/domain/')),
  integration: challengeTests.filter(f => f.includes('/integration/')),
  e2e: challengeTests.filter(f => f.includes('/e2e/')),
  external: challengeTests.filter(f => f.includes('/external/'))
};

for (const [category, files] of Object.entries(categories)) {
  console.log(`\n${category.toUpperCase()} TESTS: ${files.length} files`);
  
  // Calculate total tests in this category
  const totalTests = files.reduce((sum, file) => sum + (fileTestCount.get(file) || 0), 0);
  console.log(`Total test cases: ${totalTests}`);
  
  // Show legacy tests
  const legacyTests = files.filter(f => f.includes('-legacy') || f.includes('_legacy'));
  if (legacyTests.length > 0) {
    console.log(`Legacy test files: ${legacyTests.length}`);
    legacyTests.forEach(file => console.log(`  - ${file}`));
  }
}

// Find test files with very few tests (potential candidates for consolidation)
console.log("\n=== SMALL TEST FILES ===");
const smallFiles = Array.from(fileTestCount.entries())
  .filter(([file, count]) => count <= 2)
  .sort((a, b) => a[1] - b[1]);

console.log(`Files with 1-2 tests: ${smallFiles.length}`);
smallFiles.forEach(([file, count]) => {
  console.log(`  - ${file} (${count} tests)`);
}); 