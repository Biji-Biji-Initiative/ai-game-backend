#!/usr/bin/env node

/**
 * Test Structure Check Script
 * 
 * This script analyzes the test directory structure and provides
 * a summary of the current state of the tests.
 */

const fs = require('fs');
const path = require('path');

// Root directory
const rootDir = path.resolve(__dirname, '..');
const testsDir = path.join(rootDir, 'tests');

// Directories to scan
const SCAN_DIRS = [
  'domains',
  'integration',
  'external',
  'e2e',
  'shared',
  'real-api',
  'legacy'
];

// Track stats
const stats = {
  totalFiles: 0,
  domainTests: {
    challenge: 0,
    evaluation: 0,
    focusArea: 0,
    prompt: 0,
    total: 0
  },
  otherTests: {
    integration: 0,
    external: 0,
    e2e: 0,
    shared: 0,
    realApi: 0,
    legacy: 0,
    total: 0
  }
};

/**
 * Count test files in a directory and its subdirectories
 */
function countTestFiles(dir) {
  try {
    if (!fs.existsSync(dir)) {
      return 0;
    }
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let count = 0;
    
    files.forEach(file => {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        count += countTestFiles(fullPath);
      } else if (file.name.endsWith('.test.js') || file.name.startsWith('test-') && file.name.endsWith('.js')) {
        count++;
        stats.totalFiles++;
      }
    });
    
    return count;
  } catch (error) {
    console.error(`Error counting files in ${dir}:`, error.message);
    return 0;
  }
}

console.log('Analyzing test directory structure...\n');

// Count domain tests
console.log('Domain Tests:');
['challenge', 'evaluation', 'focusArea', 'prompt'].forEach(domain => {
  const domainDir = path.join(testsDir, 'domains', domain);
  const count = countTestFiles(domainDir);
  stats.domainTests[domain] = count;
  stats.domainTests.total += count;
  console.log(`  - ${domain}: ${count} test files`);
});

// Count other tests
console.log('\nOther Tests:');
['integration', 'external', 'e2e', 'shared', 'real-api', 'legacy'].forEach(dir => {
  const testDir = path.join(testsDir, dir.replace('real-api', 'real-api'));
  const count = countTestFiles(testDir);
  const statKey = dir.replace('-', '').replace('real-api', 'realApi');
  stats.otherTests[statKey] = count;
  stats.otherTests.total += count;
  console.log(`  - ${dir}: ${count} test files`);
});

// Print summary
console.log('\nSummary:');
console.log(`  Domain Tests: ${stats.domainTests.total} files`);
console.log(`  Other Tests: ${stats.otherTests.total} files`);
console.log(`  Total Test Files: ${stats.totalFiles} files`);

// Overall progress
const legacyPercentage = Math.round((stats.otherTests.legacy / stats.totalFiles) * 100) || 0;
const migrationPercentage = Math.round(((stats.totalFiles - stats.otherTests.legacy) / stats.totalFiles) * 100) || 0;

console.log('\nMigration Progress:');
console.log(`  Migrated: ${migrationPercentage}%`);
console.log(`  Not Yet Migrated: ${legacyPercentage}%`);

// Next steps
console.log('\nNext Steps:');
if (stats.otherTests.legacy > 0) {
  console.log(`  1. Migrate or archive the ${stats.otherTests.legacy} test files in the legacy directory`);
}

if (stats.domainTests.challenge === 0 || stats.domainTests.evaluation === 0 || 
    stats.domainTests.focusArea === 0 || stats.domainTests.prompt === 0) {
  console.log('  2. Add test files for domains with missing coverage:');
  if (stats.domainTests.challenge === 0) console.log('     - challenge domain');
  if (stats.domainTests.evaluation === 0) console.log('     - evaluation domain');
  if (stats.domainTests.focusArea === 0) console.log('     - focusArea domain');
  if (stats.domainTests.prompt === 0) console.log('     - prompt domain');
}

console.log('  3. Run individual domain tests to verify they work:');
console.log('     - npm run test:domain:challenge');
console.log('     - npm run test:domain:evaluation');
console.log('     - npm run test:domain:focusArea');
console.log('     - npm run test:domain:prompt');

console.log('\nFor more details, see tests/README.md');

// Add the script to package.json if not already there
try {
  const packagePath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (!packageJson.scripts['test:check-structure']) {
    packageJson.scripts['test:check-structure'] = 'node scripts/test-structure-check.js';
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('\nAdded test:check-structure script to package.json');
  }
} catch (error) {
  console.error('Error updating package.json:', error.message);
} 