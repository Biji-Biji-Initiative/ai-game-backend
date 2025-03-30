#!/usr/bin/env node

/**
 * Script to convert Mocha test features to Jest compatible syntax
 * This helps migrate tests to work with Jest in an ESM environment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// Get the directory of the current file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Patterns to find and replace
const replacements = [
  // Replace this.timeout() with jest.setTimeout()
  {
    find: /this\.timeout\((\d+)\);/g,
    replace: 'jest.setTimeout($1);'
  },
  // Replace before/after with beforeAll/afterAll
  {
    find: /\bbefore\(\s*\(\)\s*=>\s*{/g,
    replace: 'beforeAll(() => {'
  },
  {
    find: /\bafter\(\s*\(\)\s*=>\s*{/g,
    replace: 'afterAll(() => {'
  },
  // Replace eval parameter name (reserved keyword in strict mode)
  {
    find: /\(eval(\s*)=>/g,
    replace: '(evaluation$1=>'
  },
  {
    find: /\.callsFake\(eval(\s*)=>/g,
    replace: '.callsFake(evaluation$1=>'
  },
  // Fix Mocha-specific context references
  {
    find: /this\.(test|suite|context|currentTest)/g,
    replace: '// Removed Mocha-specific context: this.$1'
  },
  // Update import paths that use @/ aliases
  {
    find: /import .* from ['"]@\/(.*)['"];/g,
    replace: (match, importPath) => {
      return match.replace('@/', '../../../src/');
    }
  }
];

/**
 * Processes a single test file to make it Jest compatible
 * @param {string} filePath - Path to the test file
 */
function processFile(filePath) {
  try {
    // Read the file content
    let content = fs.readFileSync(filePath, 'utf8');
    let wasModified = false;

    // Apply all replacements
    for (const { find, replace } of replacements) {
      const newContent = content.replace(find, replace);
      if (newContent !== content) {
        content = newContent;
        wasModified = true;
      }
    }

    // Write the file back if it was modified
    if (wasModified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Find and process all test files
 */
function processAllTestFiles() {
  // Find all test files
  const testFiles = globSync('tests/**/*.test.js', { cwd: projectRoot });
  
  console.log(`Found ${testFiles.length} test files to process.`);
  
  // Process each file
  let processedCount = 0;
  for (const file of testFiles) {
    const fullPath = path.join(projectRoot, file);
    processFile(fullPath);
    processedCount++;
  }
  
  console.log(`\nProcessed ${processedCount} test files.`);
}

/**
 * Create or update Jest setup file
 */
function createJestSetupFile() {
  const setupPath = path.join(projectRoot, 'jest.setup.js');
  const setupContent = `// Jest setup file for ESM support and test environment configuration

// Increase the default timeout for all tests (similar to Mocha's this.timeout())
jest.setTimeout(30000);

// Add chai expect to global scope for easy use in tests
import chai from 'chai';
global.expect = chai.expect;

// Make Chai work better with Jest
chai.config.includeStack = true;

// Override some global functions to handle both Mocha and Jest conventions
global.beforeAll = global.beforeAll || global.before;
global.afterAll = global.afterAll || global.after;

// Log when setup is complete
console.log('Jest setup file loaded - Using Chai for assertions');
`;

  fs.writeFileSync(setupPath, setupContent);
  console.log(`✅ Created/updated Jest setup file: jest.setup.js`);
}

/**
 * Create Jest configuration file
 */
function createJestConfig() {
  const jestConfigPath = path.join(projectRoot, 'jest.config.js');
  const configContent = `// Jest configuration for ES Modules
export default {
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'],
  testTimeout: 30000,
  verbose: true,
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/archive/', '/tests-backup/'],
  transformIgnorePatterns: ['node_modules/(?!(chai)/)']
};
`;

  fs.writeFileSync(jestConfigPath, configContent);
  console.log(`✅ Created/updated Jest config file: jest.config.js`);
}

// Run the script
console.log('🔄 Converting Mocha test features to Jest compatible syntax...');
processAllTestFiles();
createJestSetupFile();
createJestConfig();
console.log('\n✅ Conversion complete!');
console.log('\nNext steps:');
console.log('1. Run tests with: npm test');
console.log('2. Fix any remaining issues manually');
console.log('3. Update package.json scripts if needed'); 