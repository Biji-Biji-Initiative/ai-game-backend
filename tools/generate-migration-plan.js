/**
 * Test Migration Plan Generator
 * 
 * This script analyzes tests using the verification tool and generates
 * a prioritized migration plan with recommendations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Patterns to look for in each test type (simplified version of what's in verify-test-categories.js)
const patterns = {
  domain: {
    valid: [
      /sinon\.createSandbox\(\)/i,
      /mock.*Repository/i,
      /stub\(/i,
      /in-memory/i,
      /new\s+Map\(\)/i,
    ],
    invalid: [
      /createClient\(\s*supabase/i,
      /apiTestHelper\.api/i,
      /axios\.create/i,
      /\.from\(['"]\w+['"]\)/i
    ]
  },
  integration: {
    valid: [
      /Integration:/i,
      /cross-domain/i,
      /workflow/i,
      /\.(find|save|update).*Then/i
    ],
    invalid: [
      /apiTestHelper\.api/i
    ]
  },
  external: {
    valid: [
      /openai.*client/i,
      /supabase.*client/i,
      /API\s+Calls/i,
      /skipIfMissingEnv/
    ],
    invalid: [
      /apiTestHelper\.api/i
    ]
  },
  e2e: {
    valid: [
      /apiTestHelper\.api/i,
      /axios\.create/i,
      /API_URL/i,
      /Bearer/i
    ],
    invalid: [
      /sinon\.createSandbox/i,
      /new\s+Map\(\)/i
    ]
  }
};

/**
 * Analyze a file to determine its best category
 * @param {string} filePath - Path to the test file
 * @returns {Object} Analysis results
 */
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const currentCategory = getCategoryFromPath(filePath);
    
    // Score each category based on pattern matches
    const scores = {};
    for (const [category, categoryPatterns] of Object.entries(patterns)) {
      const validMatches = categoryPatterns.valid.filter(pattern => pattern.test(content));
      const invalidMatches = categoryPatterns.invalid.filter(pattern => pattern.test(content));
      
      scores[category] = {
        valid: validMatches.length / categoryPatterns.valid.length,
        invalid: invalidMatches.length ? -0.5 : 0, // Penalty for invalid patterns
        patterns: {
          validFound: validMatches.map(p => p.toString()),
          invalidFound: invalidMatches.map(p => p.toString())
        }
      };
    }
    
    // Calculate total scores and find best category
    let bestCategory = currentCategory;
    let bestScore = 0;
    for (const [category, score] of Object.entries(scores)) {
      const totalScore = score.valid + score.invalid;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestCategory = category;
      }
    }
    
    // Determine migration action
    let action = 'none';
    if (bestCategory !== currentCategory) {
      action = `migrate to ${bestCategory}`;
    } else if (scores[currentCategory].invalid < 0) {
      action = 'fix semantics';
    }
    
    return {
      file: filePath,
      currentCategory,
      bestCategory,
      action,
      scores,
      isCorrectlyPlaced: bestCategory === currentCategory && scores[currentCategory].invalid === 0
    };
  } catch (error) {
    console.error(`Error analyzing file ${filePath}:`, error.message);
    return { file: filePath, error: error.message };
  }
}

/**
 * Get category from file path
 * @param {string} filePath - Path to the test file
 * @returns {string} Category name
 */
function getCategoryFromPath(filePath) {
  const relativePath = path.relative(rootDir, filePath);
  if (relativePath.includes('/domain/')) return 'domain';
  if (relativePath.includes('/integration/')) return 'integration';
  if (relativePath.includes('/external/')) return 'external';
  if (relativePath.includes('/e2e/')) return 'e2e';
  return 'unknown';
}

/**
 * Find all test files in the project
 * @returns {string[]} Array of test file paths
 */
function findAllTestFiles() {
  const testDirs = [
    path.join(rootDir, 'tests', 'domain'),
    path.join(rootDir, 'tests', 'integration'),
    path.join(rootDir, 'tests', 'external'),
    path.join(rootDir, 'tests', 'e2e')
  ];
  
  const testFiles = [];
  for (const dir of testDirs) {
    if (!fs.existsSync(dir)) continue;
    
    const files = findTestFilesRecursively(dir);
    testFiles.push(...files);
  }
  
  return testFiles;
}

/**
 * Recursively find test files in a directory
 * @param {string} dir - Directory to scan
 * @returns {string[]} Array of test file paths 
 */
function findTestFilesRecursively(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...findTestFilesRecursively(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.js'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Generate a migration plan for all test files
 */
function generateMigrationPlan() {
  console.log('Generating test migration plan...');
  
  // Find all test files
  const testFiles = findAllTestFiles();
  console.log(`Found ${testFiles.length} test files to analyze.`);
  
  // Analyze each file
  const analysisResults = testFiles.map(analyzeFile);
  
  // Generate migration plan
  const migrationPlan = {
    summary: {
      total: analysisResults.length,
      correctlyPlaced: analysisResults.filter(r => r.isCorrectlyPlaced).length,
      needMigration: analysisResults.filter(r => r.action === 'migrate to domain' || r.action === 'migrate to integration' || 
                                               r.action === 'migrate to external' || r.action === 'migrate to e2e').length,
      needFix: analysisResults.filter(r => r.action === 'fix semantics').length,
      errors: analysisResults.filter(r => r.error).length
    },
    domainTests: {
      toMigrate: analysisResults.filter(r => r.currentCategory === 'domain' && r.bestCategory !== 'domain'),
      toFix: analysisResults.filter(r => r.currentCategory === 'domain' && r.bestCategory === 'domain' && r.action === 'fix semantics')
    },
    integrationTests: {
      toMigrate: analysisResults.filter(r => r.currentCategory === 'integration' && r.bestCategory !== 'integration'),
      toFix: analysisResults.filter(r => r.currentCategory === 'integration' && r.bestCategory === 'integration' && r.action === 'fix semantics')
    },
    externalTests: {
      toMigrate: analysisResults.filter(r => r.currentCategory === 'external' && r.bestCategory !== 'external'),
      toFix: analysisResults.filter(r => r.currentCategory === 'external' && r.bestCategory === 'external' && r.action === 'fix semantics')
    },
    e2eTests: {
      toMigrate: analysisResults.filter(r => r.currentCategory === 'e2e' && r.bestCategory !== 'e2e'),
      toFix: analysisResults.filter(r => r.currentCategory === 'e2e' && r.bestCategory === 'e2e' && r.action === 'fix semantics')
    }
  };
  
  // Write migration plan to file
  const outputPath = path.join(rootDir, 'test-migration-plan.md');
  const markdownPlan = generateMarkdownPlan(migrationPlan);
  fs.writeFileSync(outputPath, markdownPlan);
  
  console.log(`Migration plan generated and saved to: ${outputPath}`);
  console.log('\nSummary:');
  console.log(`- Total test files: ${migrationPlan.summary.total}`);
  console.log(`- Correctly placed: ${migrationPlan.summary.correctlyPlaced}`);
  console.log(`- Need migration: ${migrationPlan.summary.needMigration}`);
  console.log(`- Need semantics fix: ${migrationPlan.summary.needFix}`);
  console.log(`- Errors during analysis: ${migrationPlan.summary.errors}`);
}

/**
 * Generate markdown content for the migration plan
 * @param {Object} plan - Migration plan data
 * @returns {string} Markdown content
 */
function generateMarkdownPlan(plan) {
  return `# Test Migration Plan

This document outlines a plan for migrating tests to their correct categories based on an automated analysis of test semantics.

## Summary

- **Total test files**: ${plan.summary.total}
- **Correctly placed**: ${plan.summary.correctlyPlaced}
- **Need migration**: ${plan.summary.needMigration}
- **Need semantics fix**: ${plan.summary.needFix}
- **Errors during analysis**: ${plan.summary.errors}

## Domain Tests

### Domain tests that should be migrated (${plan.domainTests.toMigrate.length})

${formatFileList(plan.domainTests.toMigrate)}

### Domain tests that need semantics fixes (${plan.domainTests.toFix.length})

${formatFileList(plan.domainTests.toFix)}

## Integration Tests

### Integration tests that should be migrated (${plan.integrationTests.toMigrate.length})

${formatFileList(plan.integrationTests.toMigrate)}

### Integration tests that need semantics fixes (${plan.integrationTests.toFix.length})

${formatFileList(plan.integrationTests.toFix)}

## External Tests

### External tests that should be migrated (${plan.externalTests.toMigrate.length})

${formatFileList(plan.externalTests.toMigrate)}

### External tests that need semantics fixes (${plan.externalTests.toFix.length})

${formatFileList(plan.externalTests.toFix)}

## E2E Tests

### E2E tests that should be migrated (${plan.e2eTests.toMigrate.length})

${formatFileList(plan.e2eTests.toMigrate)}

### E2E tests that need semantics fixes (${plan.e2eTests.toFix.length})

${formatFileList(plan.e2eTests.toFix)}

## Migration Instructions

For tests that need to be migrated, use the appropriate migration tool:

\`\`\`bash
# Convert a test to domain test
node tools/convert-to-domain-test.js --file=<file-path>

# Fix e2e test semantics
node tools/fix-e2e-test-semantics.js --file=<file-path>

# Move integration test to correct category
node tools/migrate-evaluation-flow-test.js --source=<source-path> --dest=<destination-path>
\`\`\`

For tests that need semantics fixes but are in the correct category, use the verification tool to identify specific issues:

\`\`\`bash
node tools/verify-test-categories.js --file=<file-path>
\`\`\`

## Migration Priority

1. **High Priority**: E2E tests using direct service calls without HTTP requests
2. **High Priority**: Domain tests with real external dependencies
3. **Medium Priority**: Integration tests with HTTP API calls
4. **Medium Priority**: External tests with business logic testing
5. **Low Priority**: Minor semantic issues in correctly placed tests
`;
}

/**
 * Format a list of files for markdown
 * @param {Array} files - List of file analysis results
 * @returns {string} Formatted markdown list
 */
function formatFileList(files) {
  if (files.length === 0) return 'None';
  
  return files.map(file => {
    const relativePath = path.relative(rootDir, file.file);
    return `1. **${relativePath}** → ${file.action}`;
  }).join('\n');
}

// Run the migration plan generator
generateMigrationPlan(); 