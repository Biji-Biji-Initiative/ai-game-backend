#!/usr/bin/env node

/**
 * Jest to Chai Test Converter
 * 
 * This script converts Jest-style tests to Chai-style assertions.
 * It converts common patterns like:
 * - expect(x).toBe(y) -> expect(x).to.equal(y)
 * - expect(x).toEqual(y) -> expect(x).to.deep.equal(y)
 * - etc.
 * 
 * It also replaces jest.mock with sinon equivalents where possible.
 * 
 * Usage: node scripts/convert-jest-to-chai.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Test directories to scan
const TEST_DIRECTORIES = [
  path.join(__dirname, '../tests/domain'),
  path.join(__dirname, '../tests/integration'),
  path.join(__dirname, '../tests/api'),
  path.join(__dirname, '../tests/e2e'),
  path.join(__dirname, '../tests/external'),
  path.join(__dirname, '../tests/unit')
];

// Patterns to convert
const JEST_TO_CHAI_PATTERNS = [
  // Basic assertions
  { from: /expect\(([^)]+)\)\.toBe\(([^)]+)\)/g, to: 'expect($1).to.equal($2)' },
  { from: /expect\(([^)]+)\)\.toEqual\(([^)]+)\)/g, to: 'expect($1).to.deep.equal($2)' },
  { from: /expect\(([^)]+)\)\.toStrictEqual\(([^)]+)\)/g, to: 'expect($1).to.deep.equal($2)' },
  { from: /expect\(([^)]+)\)\.not\.toBe\(([^)]+)\)/g, to: 'expect($1).to.not.equal($2)' },
  { from: /expect\(([^)]+)\)\.not\.toEqual\(([^)]+)\)/g, to: 'expect($1).to.not.deep.equal($2)' },
  
  // Truthiness
  { from: /expect\(([^)]+)\)\.toBeTruthy\(\)/g, to: 'expect($1).to.be.ok' },
  { from: /expect\(([^)]+)\)\.toBeFalsy\(\)/g, to: 'expect($1).to.not.be.ok' },
  { from: /expect\(([^)]+)\)\.toBeNull\(\)/g, to: 'expect($1).to.be.null' },
  { from: /expect\(([^)]+)\)\.not\.toBeNull\(\)/g, to: 'expect($1).to.not.be.null' },
  { from: /expect\(([^)]+)\)\.toBeUndefined\(\)/g, to: 'expect($1).to.be.undefined' },
  { from: /expect\(([^)]+)\)\.toBeDefined\(\)/g, to: 'expect($1).to.not.be.undefined' },
  
  // Numbers
  { from: /expect\(([^)]+)\)\.toBeGreaterThan\(([^)]+)\)/g, to: 'expect($1).to.be.above($2)' },
  { from: /expect\(([^)]+)\)\.toBeGreaterThanOrEqual\(([^)]+)\)/g, to: 'expect($1).to.be.at.least($2)' },
  { from: /expect\(([^)]+)\)\.toBeLessThan\(([^)]+)\)/g, to: 'expect($1).to.be.below($2)' },
  { from: /expect\(([^)]+)\)\.toBeLessThanOrEqual\(([^)]+)\)/g, to: 'expect($1).to.be.at.most($2)' },
  
  // Strings
  { from: /expect\(([^)]+)\)\.toMatch\(([^)]+)\)/g, to: 'expect($1).to.match($2)' },
  { from: /expect\(([^)]+)\)\.not\.toMatch\(([^)]+)\)/g, to: 'expect($1).to.not.match($2)' },
  { from: /expect\(([^)]+)\)\.toContain\(([^)]+)\)/g, to: 'expect($1).to.include($2)' },
  { from: /expect\(([^)]+)\)\.not\.toContain\(([^)]+)\)/g, to: 'expect($1).to.not.include($2)' },
  
  // Objects
  { from: /expect\(([^)]+)\)\.toHaveProperty\((['"][^)]+['"])\)/g, to: 'expect($1).to.have.property($2)' },
  { from: /expect\(([^)]+)\)\.toHaveProperty\((['"][^)]+['"]),\s*([^)]+)\)/g, to: 'expect($1).to.have.property($2, $3)' },
  
  // Arrays
  { from: /expect\(([^)]+)\)\.toHaveLength\(([^)]+)\)/g, to: 'expect($1).to.have.lengthOf($2)' },
  
  // Functions
  { from: /expect\(([^)]+)\)\.toThrow\(\)/g, to: 'expect($1).to.throw()' },
  { from: /expect\(([^)]+)\)\.toThrow\((['"][^)]+['"])\)/g, to: 'expect($1).to.throw($2)' },
  { from: /expect\(([^)]+)\)\.toThrow\(([^)'"]+)\)/g, to: 'expect($1).to.throw($2)' },
  { from: /expect\(([^)]+)\)\.not\.toThrow\(\)/g, to: 'expect($1).to.not.throw()' },
  
  // Promises
  { from: /await expect\(([^)]+)\)\.resolves\.([^;]+)/g, to: 'expect(await $1).$2' },
  { from: /await expect\(([^)]+)\)\.rejects\.toThrow\(([^)]*)\)/g, to: 'await expect($1).to.be.rejectedWith($2)' },
  { from: /await expect\(([^)]+)\)\.rejects\.toThrow\(\)/g, to: 'await expect($1).to.be.rejected' },
  
  // Function mocks
  { from: /jest\.fn\(\)/g, to: 'sinon.stub()' },
  { from: /jest\.fn\(\(\) => ([^)]+)\)/g, to: 'sinon.stub().returns($1)' },
  { from: /jest\.spyOn\(([^,]+),\s*(['"][^)]+['"])\)/g, to: 'sinon.spy($1, $2)' },
  { from: /jest\.mock\((['"][^)]+['"])\)/g, to: '// Converted from jest.mock - use sinon.stub instead\n// Removed: jest.mock($1)' },
  
  // Function mock assertions
  { from: /expect\(([^)]+)\)\.toHaveBeenCalled\(\)/g, to: 'expect($1.called).to.be.true' },
  { from: /expect\(([^)]+)\)\.not\.toHaveBeenCalled\(\)/g, to: 'expect($1.called).to.be.false' },
  { from: /expect\(([^)]+)\)\.toHaveBeenCalledTimes\(([^)]+)\)/g, to: 'expect($1.callCount).to.equal($2)' },
  { from: /expect\(([^)]+)\)\.toHaveBeenCalledWith\(([^)]+)\)/g, to: 'expect($1.calledWith($2)).to.be.true' },
  
  // Test syntax
  { from: /test\((['"][^)'"]+['"])/g, to: 'it($1' },
  { from: /test\.only\((['"][^)'"]+['"])/g, to: 'it.only($1' },
  { from: /test\.skip\((['"][^)'"]+['"])/g, to: 'it.skip($1' },
  
  // Imports - add Chai if not present
  { from: /(const\s+\{\s*)(expect)(\s*\}\s*=\s*require\(['"]jest['"]|expect[\);])/g, to: '$1$2$3\nconst { expect: chaiExpect } = require(\'chai\');\nconst expect = chaiExpect;' },
  { from: /require\(['"]sinon['"]\)/g, to: 'require(\'sinon\')' },
  { from: /const\s+([^=]+)\s*=\s*require\(['"]jest['"]\)/g, to: 'const $1 = require(\'sinon\')' }
];

/**
 * Check if a file contains Jest-style tests
 * @param {string} content - File content
 * @returns {boolean} True if file contains Jest-style tests
 */
function containsJestTests(content) {
  const jestPatterns = [
    /expect\([^)]+\)\.toBe\(/,
    /expect\([^)]+\)\.toEqual\(/,
    /expect\([^)]+\)\.toMatch\(/,
    /expect\([^)]+\)\.toContain\(/,
    /expect\([^)]+\)\.toThrow\(/,
    /expect\([^)]+\)\.toHaveBeenCalled\(/,
    /jest\.fn\(/,
    /jest\.mock\(/,
    /jest\.spyOn\(/
  ];
  
  return jestPatterns.some(pattern => pattern.test(content));
}

/**
 * Convert Jest-style tests to Chai-style in a file
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} True if file was modified
 */
async function convertFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    
    // Check if file contains Jest-style tests
    if (!containsJestTests(content)) {
      return false;
    }
    
    let modified = false;
    let newContent = content;
    
    // Add Chai imports if needed and doesn't already have them
    if (newContent.includes('expect(') && !newContent.includes("require('chai')") && !newContent.includes('require("chai")')) {
      newContent = "const { expect } = require('chai');\nconst sinon = require('sinon');\n\n" + newContent;
      modified = true;
    }
    
    // Apply each replacement pattern
    for (const { from, to } of JEST_TO_CHAI_PATTERNS) {
      const originalContent = newContent;
      newContent = newContent.replace(from, to);
      if (originalContent !== newContent) {
        modified = true;
      }
    }
    
    // Write the file back if it was modified
    if (modified) {
      await writeFile(filePath, newContent, 'utf8');
      console.log(`✅ Converted Jest to Chai in: ${path.relative(__dirname, filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Process all test files in a directory recursively
 * @param {string} directory - Directory to process
 * @returns {Promise<number>} Number of files modified
 */
async function processDirectory(directory) {
  let modifiedCount = 0;

  try {
    const entries = await readdir(directory);

    for (const entry of entries) {
      const entryPath = path.join(directory, entry);
      const entryStat = await stat(entryPath);

      if (entryStat.isDirectory()) {
        // Recursively process subdirectories
        modifiedCount += await processDirectory(entryPath);
      } else if (entryStat.isFile() && (entry.endsWith('.test.js') || entry.endsWith('.spec.js'))) {
        // Convert test files
        if (await convertFile(entryPath)) {
          modifiedCount++;
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error processing directory ${directory}:`, error.message);
  }

  return modifiedCount;
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Converting Jest-style tests to Chai-style...');
  let totalModified = 0;

  for (const directory of TEST_DIRECTORIES) {
    console.log(`\nProcessing directory: ${path.relative(__dirname, directory)}`);
    const modifiedCount = await processDirectory(directory);
    totalModified += modifiedCount;
    console.log(`Converted ${modifiedCount} files in this directory.`);
  }

  console.log(`\n✨ Done! Converted a total of ${totalModified} files.`);
}

// Run the script
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
}); 