/**
 * Test Category Verification Script
 * 
 * This script validates that tests in different categories follow the correct semantics:
 * - Domain tests should use only in-memory repositories and mock all external dependencies
 * - Integration tests should focus on cross-component/cross-domain interaction
 * - External tests should directly target an external service 
 * - E2E tests should use the apiTestHelper or axios to make HTTP requests
 * 
 * Usage: node tools/verify-test-categories.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Patterns to look for in each test type
const patterns = {
  domain: {
    valid: [
      /sinon\.createSandbox\(\)/i, // Using Sinon for mocks
      /mock.*Repository/i,         // Mock repositories
      /stub\(/i,                   // Using stubs  
      /in-memory/i,                // In-memory mention
      /new\s+Map\(\)/i,            // In-memory map for test data
    ],
    invalid: [
      /createClient\(\s*supabase/i, // Direct Supabase client usage
      /apiTestHelper\.api/i,        // Using API helper for HTTP requests
      /axios\.create/i,             // Using Axios for HTTP requests  
      /\.from\(['"]\w+['"]\)/i     // Direct Supabase queries
    ]
  },
  integration: {
    valid: [
      /Integration:/i,    // Integration in test description
      /cross-domain/i,    // Cross-domain mention
      /workflow/i,        // Workflow mention
      /\.(find|save|update).*Then/i // Repository chain operations
    ],
    invalid: [
      /apiTestHelper\.api/i // Using API helper for HTTP requests
    ]
  },
  external: {
    valid: [
      /openai.*client/i,  // OpenAI client  
      /supabase.*client/i, // Supabase client
      /API\s+Calls/i,      // API Calls section
      /skipIfMissingEnv/   // Skip if env missing
    ],
    invalid: [
      /apiTestHelper\.api/i // Using API helper for HTTP requests
    ]
  },
  e2e: {
    valid: [
      /apiTestHelper\.api/i,  // Using API helper
      /axios\.create/i,       // Using Axios
      /API_URL/i,             // API URL constant
      /Bearer/i               // Auth token usage
    ],
    invalid: [
      /sinon\.createSandbox/i, // Using Sinon directly in E2E tests
      /new\s+Map\(\)/i        // In-memory storage in E2E tests
    ]
  }
};

// Aggregate issues found
const issues = {
  domain: [],
  integration: [],
  external: [],
  e2e: []
};

/**
 * Check a file for pattern violations
 * @param {string} filePath - Path to test file
 * @param {string} category - Test category (domain, integration, external, e2e)
 */
function checkFile(filePath, category) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const validMatches = patterns[category].valid.filter(pattern => pattern.test(content));
    const invalidMatches = patterns[category].invalid.filter(pattern => pattern.test(content));
    
    // If file has no valid patterns or has invalid patterns, log an issue
    if (validMatches.length === 0 || invalidMatches.length > 0) {
      issues[category].push({
        file: filePath,
        missingValidPatterns: patterns[category].valid.length - validMatches.length,
        invalidPatternsFound: invalidMatches.length,
        details: {
          validFound: validMatches.map(p => p.toString()),
          invalidFound: invalidMatches.map(p => p.toString())
        }
      });
    }
  } catch (error) {
    console.error(`Error checking file ${filePath}:`, error.message);
  }
}

/**
 * Recursively scan a directory for test files
 * @param {string} dir - Directory to scan
 * @param {string} category - Test category (domain, integration, external, e2e)
 */
function scanDirectory(dir, category) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDirectory(filePath, category);
    } else if (file.endsWith('.test.js') || file.endsWith('.spec.js')) {
      checkFile(filePath, category);
    }
  }
}

// Scan all test categories
console.log('Verifying test category semantics...');

// Check domain tests
scanDirectory(path.join(rootDir, 'tests', 'domain'), 'domain');

// Check integration tests
scanDirectory(path.join(rootDir, 'tests', 'integration'), 'integration');

// Check external tests
scanDirectory(path.join(rootDir, 'tests', 'external'), 'external');

// Check e2e tests
scanDirectory(path.join(rootDir, 'tests', 'e2e'), 'e2e');

// Print results
console.log('\n--- Test Category Verification Results ---');

let hasIssues = false;
for (const [category, categoryIssues] of Object.entries(issues)) {
  if (categoryIssues.length > 0) {
    hasIssues = true;
    console.log(`\n${category.toUpperCase()} TESTS - Found ${categoryIssues.length} files with potential issues`);
    
    categoryIssues.forEach(issue => {
      console.log(`\n  File: ${issue.file}`);
      console.log(`  Missing valid patterns: ${issue.missingValidPatterns}`);
      console.log(`  Invalid patterns found: ${issue.invalidPatternsFound}`);
      
      if (issue.details.invalidFound.length > 0) {
        console.log('  Invalid patterns:');
        issue.details.invalidFound.forEach(pattern => {
          console.log(`    - ${pattern}`);
        });
      }
    });
  } else {
    console.log(`\n${category.toUpperCase()} TESTS - All files passed validation`);
  }
}

if (!hasIssues) {
  console.log('\nAll tests follow correct category semantics! 🎉');
} else {
  console.log('\nSome tests may not follow correct category semantics. Please review the issues above.');
} 