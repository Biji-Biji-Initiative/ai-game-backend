#!/usr/bin/env node

/**
 * Test Relocation Script Generator
 * 
 * This script analyzes test files using the same logic as analyze-test-placement.js,
 * but generates a shell script to automate moving the tests to their proper locations.
 * 
 * Usage: node scripts/generate-test-relocation-script.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Import the same analysis logic from analyze-test-placement.js
const TEST_DIRECTORIES = [
  path.join(__dirname, '../tests/domain'),
  path.join(__dirname, '../tests/integration'),
  path.join(__dirname, '../tests/api'),
  path.join(__dirname, '../tests/e2e'),
  path.join(__dirname, '../tests/external')
];

// Same patterns from analyze-test-placement.js
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

// Same analysis function from analyze-test-placement.js
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
    
    return {
      file: path.basename(filePath),
      path: filePath,
      relativePath,
      currentCategory,
      idealCategory: idealCategory === 'unknown' ? currentCategory : idealCategory,
      needsRelocation: currentCategory !== idealCategory && idealCategory !== 'unknown' && confidence !== 'Very Low',
      confidence,
      scores,
      evidence
    };
  } catch (error) {
    console.error(`❌ Error analyzing file ${filePath}:`, error.message);
    return {
      file: path.basename(filePath),
      path: filePath,
      relativePath: path.relative(__dirname, filePath),
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
 * Generate a shell script to relocate tests
 * @param {Array} results - Analysis results
 * @returns {Promise<string>} Path to generated script
 */
async function generateScript(results) {
  const needsRelocation = results.filter(r => r.needsRelocation);
  
  if (needsRelocation.length === 0) {
    console.log('No tests need relocation!');
    return null;
  }
  
  // Prepare script content
  let scriptContent = `#!/bin/bash
# Test Relocation Script
# Generated by generate-test-relocation-script.js on ${new Date().toISOString()}
# This script will move test files to their proper locations according to DDD principles.

set -e  # Exit on error

# Create backup directory
BACKUP_DIR="tests/relocated-backup-$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "Created backup directory: $BACKUP_DIR"

`;

  // Generate move commands
  for (const test of needsRelocation) {
    const filePath = test.path;
    const fileName = test.file;
    const sourceDirname = path.dirname(filePath);
    
    // Determine the target directory path
    // Extract subdomain name from path (e.g., 'user', 'evaluation')
    const pathSegments = sourceDirname.split('/');
    const domainName = pathSegments[pathSegments.length - 1].toLowerCase();
    const isDomainDirPattern = /^(user|evaluation|challenge|prompt|personality|adapter|focusArea)$/i;
    const finalDomainName = isDomainDirPattern.test(domainName) ? domainName : '';
    
    // Create target directory path based on ideal category
    let targetDir;
    if (test.idealCategory === 'domain') {
      targetDir = `tests/domain/${finalDomainName}`;
    } else if (test.idealCategory === 'unit') {
      targetDir = `tests/unit/${finalDomainName}`;
    } else if (test.idealCategory === 'integration') {
      targetDir = `tests/integration`;
    } else if (test.idealCategory === 'external') {
      // Determine if it's OpenAI or Supabase based on the evidence
      const isOpenAI = test.evidence.external.some(e => e.includes('OpenAI'));
      const isSupabase = test.evidence.external.some(e => e.includes('Supabase'));
      const externalDir = isOpenAI ? 'openai' : (isSupabase ? 'supabase' : '');
      targetDir = `tests/external/${externalDir}`;
    } else if (test.idealCategory === 'e2e') {
      targetDir = `tests/e2e`;
    } else {
      continue; // Skip if no clear target
    }
    
    // Generate shell commands
    scriptContent += `
# ${fileName} (${test.confidence} confidence)
# Moving from ${test.currentCategory} to ${test.idealCategory}
mkdir -p "${targetDir}"
cp "${filePath}" "$BACKUP_DIR/"
mv "${filePath}" "${targetDir}/"
echo "Moved ${fileName} to ${targetDir}/"
`;
  }
  
  // Add final message
  scriptContent += `
echo "✅ Relocation complete! Files were backed up to $BACKUP_DIR"
echo "Moved ${needsRelocation.length} files to their proper locations."
`;

  // Write script to file
  const scriptPath = path.join(__dirname, 'relocate-tests.sh');
  await writeFile(scriptPath, scriptContent, { mode: 0o755 }); // Make executable
  
  return scriptPath;
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Analyzing test files for relocation...');
  let results = [];

  for (const directory of TEST_DIRECTORIES) {
    console.log(`Processing directory: ${path.relative(__dirname, directory)}`);
    const directoryResults = await processDirectory(directory);
    results = results.concat(directoryResults);
  }

  console.log(`Analyzed ${results.length} test files.`);
  const needsRelocation = results.filter(r => r.needsRelocation);
  console.log(`Found ${needsRelocation.length} files that need relocation.`);
  
  if (needsRelocation.length > 0) {
    const scriptPath = await generateScript(results);
    if (scriptPath) {
      console.log(`\n✨ Relocation script generated: ${path.relative(__dirname, scriptPath)}`);
      console.log('\nTo execute the script, run:');
      console.log(`bash ${path.relative(__dirname, scriptPath)}\n`);
    }
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
}); 