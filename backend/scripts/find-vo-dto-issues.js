#!/usr/bin/env node
/**
 * Find Value Object and DTO Usage Issues in Tests
 * 
 * This script scans test files for improper use of value objects and DTOs, such as:
 * 1. Using primitive values instead of value objects
 * 2. Not using DTO mappers for API boundaries
 * 3. Missing proper value object creation for IDs and other domain values
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

console.log('🔍 Finding tests with improper Value Object and DTO usage...');

// Find domain, unit, and integration test files
const testFiles = globSync([
  'tests/domain/**/*.test.js', 
  'tests/unit/**/*.test.js',
  'tests/integration/**/*.test.js',
  'tests/e2e/**/*.test.js'
], { cwd: projectRoot });

// Pattern detection configurations by domain
const domainPatterns = {
  user: {
    primitiveId: /['"]user-\w+['"]/g,
    valueObjects: ['UserId'],
    dtos: ['UserDTO', 'UserProfileDTO'],
    mappers: ['UserDTOMapper', 'UserProfileDTOMapper'],
    repositories: ['UserRepository']
  },
  challenge: {
    primitiveId: /['"]challenge-\w+['"]/g,
    valueObjects: ['ChallengeId'],
    dtos: ['ChallengeDTO', 'ChallengeResponseDTO'],
    mappers: ['ChallengeDTOMapper', 'ChallengeResponseDTOMapper'],
    repositories: ['ChallengeRepository']
  },
  evaluation: {
    primitiveId: /['"]evaluation-\w+['"]/g,
    valueObjects: ['EvaluationId'],
    dtos: ['EvaluationDTO'],
    mappers: ['EvaluationDTOMapper'],
    repositories: ['EvaluationRepository']
  },
  focusArea: {
    primitiveId: /['"]focus-\w+['"]/g,
    valueObjects: ['FocusAreaId'],
    dtos: ['FocusAreaDTO'],
    mappers: ['FocusAreaDTOMapper'],
    repositories: ['FocusAreaRepository']
  },
  personality: {
    primitiveId: /['"]personality-\w+['"]/g,
    valueObjects: ['PersonalityId'],
    dtos: ['PersonalityDTO', 'PersonalityProfileDTO'],
    mappers: ['PersonalityDTOMapper'],
    repositories: ['PersonalityRepository']
  }
};

// Common UUID pattern
const uuidPattern = /['"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['"]/g;

// Results storage
const results = [];

// Process each file
for (const file of testFiles) {
  const filePath = resolve(projectRoot, file);
  let content;
  
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${file}: ${error.message}`);
    continue;
  }
  
  // Determine which domain the test is for
  let domain = null;
  for (const d of Object.keys(domainPatterns)) {
    if (file.includes(`/${d}/`) || file.includes(`${d}.`)) {
      domain = d;
      break;
    }
  }
  
  // If no domain was matched, try to infer from content
  if (!domain) {
    for (const d of Object.keys(domainPatterns)) {
      // Check if the file mentions domain-specific keywords
      const containsValueObjects = domainPatterns[d].valueObjects.some(vo => content.includes(vo));
      const containsDTOs = domainPatterns[d].dtos.some(dto => content.includes(dto));
      const containsRepo = domainPatterns[d].repositories.some(repo => content.includes(repo));
      
      if (containsValueObjects || containsDTOs || containsRepo) {
        domain = d;
        break;
      }
    }
  }
  
  if (!domain) {
    // Skip files we can't categorize to a specific domain
    continue;
  }
  
  const issues = [];
  
  // Look for primitive IDs where value objects should be used
  const primitiveIdMatches = content.match(domainPatterns[domain].primitiveId) || [];
  const uuidMatches = content.match(uuidPattern) || [];
  
  if (primitiveIdMatches.length > 0 || uuidMatches.length > 0) {
    const idIssue = {
      type: 'primitive_id',
      description: `Using primitive ID values instead of ${domainPatterns[domain].valueObjects[0]} value objects`,
      examples: [...new Set([...primitiveIdMatches, ...uuidMatches])].slice(0, 5)
    };
    issues.push(idIssue);
  }
  
  // Check for e2e/API tests that should use DTO mappers
  if (file.includes('/e2e/') || file.includes('/api/')) {
    const mappers = domainPatterns[domain].mappers;
    const mapperUsed = mappers.some(mapper => content.includes(mapper));
    
    if (!mapperUsed) {
      const dtoIssue = {
        type: 'missing_dto_mapper',
        description: `E2E/API test not using ${mappers.join(' or ')} for request/response mapping`,
        examples: []
      };
      issues.push(dtoIssue);
    }
  }
  
  // Check for repository tests that should use value objects
  if (content.includes('Repository') && domainPatterns[domain].valueObjects.length > 0) {
    // Check if the file has proper value object creations
    const voCreationPattern = new RegExp(`create${domainPatterns[domain].valueObjects[0]}`, 'g');
    const voConstructorPattern = new RegExp(`new ${domainPatterns[domain].valueObjects[0]}\\(`, 'g');
    
    const hasVOCreation = content.match(voCreationPattern) || content.match(voConstructorPattern);
    
    if (!hasVOCreation) {
      const voIssue = {
        type: 'missing_vo_creation',
        description: `Repository test not using ${domainPatterns[domain].valueObjects[0]} value objects for IDs`,
        examples: []
      };
      issues.push(voIssue);
    }
  }
  
  if (issues.length > 0) {
    results.push({
      file,
      domain,
      issues
    });
  }
}

// Print results
console.log('\n-------------------------------------------------');
console.log('Test Files with Value Object & DTO Issues');
console.log('-------------------------------------------------');

// Group by domain
const domainResults = {};
for (const result of results) {
  if (!domainResults[result.domain]) {
    domainResults[result.domain] = [];
  }
  domainResults[result.domain].push(result);
}

for (const [domain, files] of Object.entries(domainResults)) {
  console.log(`\n🔷 ${domain.toUpperCase()} DOMAIN (${files.length} files):`);
  
  for (const { file, issues } of files) {
    console.log(`\n📝 ${file}`);
    
    for (const issue of issues) {
      console.log(`  ⚠️ ${issue.description}`);
      
      if (issue.examples && issue.examples.length > 0) {
        console.log(`    Examples: ${issue.examples.join(', ')}`);
      }
    }
  }
}

console.log('\n\n✅ Analysis complete!');
console.log(`Found ${results.length} files with value object or DTO issues across ${Object.keys(domainResults).length} domains.`);
console.log('');
console.log('Recommended approach:');
console.log('1. Start with repository tests: Ensure these use value objects for IDs');
console.log('2. Update service tests: Services should receive and return value objects');
console.log('3. Fix e2e/API tests: These should use DTO mappers for request/response boundaries');
console.log('4. Update remaining tests: Fix any tests that still use primitive values'); 