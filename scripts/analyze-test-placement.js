#!/usr/bin/env node

/**
 * Test Placement Analyzer
 * 
 * This script analyzes test files to detect if they're properly categorized according to DDD principles.
 * It checks for patterns indicating if a test should be in domain, integration, external, e2e, or unit directories.
 * 
 * Usage: node scripts/analyze-test-placement.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// Test directories to scan
const TEST_DIRECTORIES = [
  path.join(__dirname, '../tests/domain'),
  path.join(__dirname, '../tests/integration'),
  path.join(__dirname, '../tests/api'),
  path.join(__dirname, '../tests/e2e'),
  path.join(__dirname, '../tests/external')
];

// Patterns to identify test types
const TEST_PATTERNS = {
  domain: [
    { pattern: /InMemory.*Repository/g, weight: 5, description: "Uses in-memory repositories" },
    { pattern: /mock\(.*Service\)/g, weight: 3, description: "Mocks a service" },
    { pattern: /sinon\.stub\(\)/g, weight: 3, description: "Uses sinon stubs" },
    { pattern: /eventBus.*stub/g, weight: 4, description: "Mocks event bus" },
    { pattern: /new\s+[A-Z][a-zA-Z]+\([^)]*\)/g, weight: 2, description: "Instantiates domain objects directly" },
    { pattern: /\.validate\(\)/g, weight: 2, description: "Tests validation logic" }
  ],
  unit: [
    { pattern: /jest\.mock\(/g, weight: 4, description: "Uses Jest mocks" },
    { pattern: /sinon\.stub|sinon\.mock|sinon\.spy/g, weight: 4, description: "Uses Sinon for mocking" },
    { pattern: /Controller/g, weight: 3, description: "Tests a controller" },
    { pattern: /\.body\.|\.status|request\(/g, weight: 2, description: "Tests HTTP specifics" }
  ],
  integration: [
    { pattern: /eventBus/g, weight: 4, description: "Uses event bus for domain events" },
    { pattern: /requires coordination between .* and/g, weight: 5, description: "Mentions cross-domain coordination" },
    { pattern: /const \w+Service.*\nconst \w+Service/gs, weight: 3, description: "Uses multiple services" },
    { pattern: /Domain Event/g, weight: 3, description: "Tests domain events" }
  ],
  external: [
    { pattern: /[^In]Memory(Repository|DB)/g, weight: -3, description: "NOT using in-memory repositories" },
    { pattern: /supabase|supabaseClient|createClient/g, weight: 5, description: "Directly uses Supabase" },
    { pattern: /openai|OpenAIClient|APIRequestError/g, weight: 5, description: "Directly uses OpenAI" },
    { pattern: /axios\.(get|post)/g, weight: 4, description: "Makes HTTP calls with axios" },
    { pattern: /fetch\(/g, weight: 4, description: "Makes HTTP calls with fetch" },
    { pattern: /process\.env\.SUPABASE/g, weight: 3, description: "Uses Supabase env vars" },
    { pattern: /process\.env\.OPENAI/g, weight: 3, description: "Uses OpenAI env vars" }
  ],
  e2e: [
    { pattern: /supertest|request\(/g, weight: 5, description: "Uses supertest for HTTP calls" },
    { pattern: /\.get\('\/api|\.post\('\/api/g, weight: 5, description: "Makes API calls to endpoints" },
    { pattern: /\.set\('Authorization/g, weight: 3, description: "Sets auth headers" },
    { pattern: /\.status\(200\)/g, weight: 2, description: "Checks status codes" },
    { pattern: /\.json\(\)/g, weight: 2, description: "Processes JSON responses" }
  ]
};

/**
 * Analyze a single file and determine its ideal test category
 * @param {string} filePath - Path to test file
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    const scores = {
      domain: 0,
      unit: 0,
      integration: 0,
      external: 0,
      e2e: 0
    };
    
    const evidence = {
      domain: [],
      unit: [],
      integration: [],
      external: [],
      e2e: []
    };
    
    // Score each type based on patterns
    for (const [type, patterns] of Object.entries(TEST_PATTERNS)) {
      for (const { pattern, weight, description } of patterns) {
        const matches = (content.match(pattern) || []).length;
        if (matches > 0) {
          scores[type] += matches * weight;
          evidence[type].push(`${description} (${matches} matches)`);
        }
      }
    }
    
    // Determine current category based on path
    const relativePath = path.relative(__dirname, filePath);
    const currentCategory = relativePath.includes('/domain/') ? 'domain' :
                           relativePath.includes('/unit/') ? 'unit' :
                           relativePath.includes('/integration/') ? 'integration' :
                           relativePath.includes('/external/') ? 'external' :
                           relativePath.includes('/e2e/') ? 'e2e' :
                           relativePath.includes('/api/') ? 'api' :
                           'unknown';
    
    // Find highest scoring category
    let highestScore = -Infinity;
    let idealCategory = 'unknown';
    
    for (const [category, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        idealCategory = category;
      }
    }
    
    // Handle ambiguous cases with special rules
    // E.g. If external and e2e both score high, prefer e2e for supertest/API calls
    if (scores.external > 0 && scores.e2e > 0 && scores.e2e >= scores.external * 0.8) {
      idealCategory = 'e2e';
    }
    
    // Fix up api -> e2e
    if (currentCategory === 'api') {
      idealCategory = 'e2e';
    }
    
    // Low confidence if the scores are very close
    const secondHighestScore = Object.entries(scores)
      .filter(([category]) => category !== idealCategory)
      .reduce((max, [_, score]) => Math.max(max, score), -Infinity);
    
    const confidence = highestScore <= 0 ? 'Very Low' :
                       highestScore - secondHighestScore < 2 ? 'Low' :
                       highestScore - secondHighestScore < 5 ? 'Medium' :
                       'High';
    
    // Extract the test filename only (without full path)
    const filename = path.basename(filePath);
    
    return {
      file: filename,
      path: relativePath,
      currentCategory,
      idealCategory: idealCategory === 'unknown' ? currentCategory : idealCategory,
      needsRelocation: currentCategory !== idealCategory && idealCategory !== 'unknown',
      confidence,
      scores,
      evidence
    };
  } catch (error) {
    console.error(`❌ Error analyzing file ${filePath}:`, error.message);
    return {
      file: path.basename(filePath),
      path: path.relative(__dirname, filePath),
      error: error.message
    };
  }
}

/**
 * Process all test files in a directory recursively
 * @param {string} directory - Directory to process
 * @returns {Promise<Array>} Analysis results for all files
 */
async function processDirectory(directory) {
  const results = [];

  try {
    const entries = await readdir(directory);

    for (const entry of entries) {
      const entryPath = path.join(directory, entry);
      const entryStat = await stat(entryPath);

      if (entryStat.isDirectory()) {
        // Recursively process subdirectories
        const subResults = await processDirectory(entryPath);
        results.push(...subResults);
      } else if (entryStat.isFile() && (entry.endsWith('.test.js') || entry.endsWith('.spec.js'))) {
        // Analyze test files
        const result = await analyzeFile(entryPath);
        results.push(result);
      }
    }
  } catch (error) {
    console.error(`❌ Error processing directory ${directory}:`, error.message);
  }

  return results;
}

/**
 * Print analysis results in a user-friendly format
 * @param {Array} results - Analysis results
 */
function printResults(results) {
  // Group by relocation needs
  const needsRelocation = results.filter(r => r.needsRelocation);
  const correctlyPlaced = results.filter(r => !r.needsRelocation && !r.error);
  const errors = results.filter(r => r.error);
  
  console.log('\n------------------------------------------');
  console.log(`📊 Test Analysis Summary: ${results.length} files analyzed`);
  console.log(`✅ Correctly placed: ${correctlyPlaced.length}`);
  console.log(`⚠️ Need relocation: ${needsRelocation.length}`);
  console.log(`❌ Analysis errors: ${errors.length}`);
  console.log('------------------------------------------\n');
  
  if (needsRelocation.length > 0) {
    console.log('🔄 Tests That Need Relocation:');
    console.log('------------------------------------------');
    
    // Group by current location
    const byCurrentCategory = {};
    for (const result of needsRelocation) {
      if (!byCurrentCategory[result.currentCategory]) {
        byCurrentCategory[result.currentCategory] = [];
      }
      byCurrentCategory[result.currentCategory].push(result);
    }
    
    for (const [category, items] of Object.entries(byCurrentCategory)) {
      console.log(`\n📁 From ${category}:`);
      
      for (const item of items) {
        console.log(`  ${item.file} → ${item.idealCategory} (${item.confidence} confidence)`);
        console.log(`    Current path: ${item.path}`);
        
        // Show top evidence for ideal category
        const topEvidence = item.evidence[item.idealCategory].slice(0, 3);
        if (topEvidence.length > 0) {
          console.log('    Evidence:');
          for (const evidence of topEvidence) {
            console.log(`      - ${evidence}`);
          }
        }
        
        console.log('');
      }
    }
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const error of errors) {
      console.log(`  ${error.file}: ${error.error}`);
    }
    console.log('');
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Analyzing test file placement...');
  let results = [];

  for (const directory of TEST_DIRECTORIES) {
    console.log(`Processing directory: ${path.relative(__dirname, directory)}`);
    const directoryResults = await processDirectory(directory);
    results = results.concat(directoryResults);
  }

  printResults(results);

  // Suggest command to automate relocations
  if (results.filter(r => r.needsRelocation).length > 0) {
    console.log('\n✨ To create a script for automatic relocation, run:');
    console.log('node scripts/generate-test-relocation-script.js\n');
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
}); 