#!/usr/bin/env node

/**
 * Script to analyze test files in depth and identify candidates for consolidation or removal
 * This provides a more detailed analysis than find-test-duplicates.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Get the directory of the current file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Analysis results
const results = {
  totalFiles: 0,
  emptyOrInvalidTests: [],
  lowValueTests: [],
  duplicateTestCases: {},
  filesByDomain: {},
  filesByType: {},
  consolidationCandidates: {},
  testCounts: {}
};

// Find all test files
function findAllTestFiles() {
  const testFiles = [];
  
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
        const relativePath = path.relative(projectRoot, fullPath);
        testFiles.push(relativePath);
      }
    }
  }
  
  scanDir(path.join(projectRoot, 'tests'));
  return testFiles;
}

// Extract test cases from a file
function extractTestCases(filePath) {
  try {
    const content = fs.readFileSync(path.join(projectRoot, filePath), 'utf8');
    const testCases = [];
    
    // Extract it/test blocks
    const itRegex = /(?:it|test)\(\s*['"](.+?)['"]\s*,\s*(?:async\s*)?\(\)\s*=>\s*{([\s\S]*?)(?:}\s*\)\s*;|}\s*\))/g;
    let match;
    
    while ((match = itRegex.exec(content)) !== null) {
      const testName = match[1];
      const testBody = match[2];
      // Create a hash of the test body to identify similar tests
      const testHash = crypto.createHash('md5').update(testBody.replace(/\s+/g, ' ')).digest('hex');
      
      testCases.push({ 
        testName, 
        testBody, 
        testHash,
        // Check if the test is likely a stub or placeholder
        isStub: testBody.trim().length < 50 || 
                testBody.includes('// TODO') || 
                testBody.includes('/* TODO') ||
                testBody.includes('skip') ||
                testBody.includes('pending')
      });
    }
    
    // Extract the describe block name (if any)
    const describeMatch = content.match(/describe\(\s*['"](.+?)['"]/);
    const describeName = describeMatch ? describeMatch[1] : '';
    
    // Determine the type of test
    let testType = 'unknown';
    if (filePath.includes('/e2e/')) testType = 'e2e';
    else if (filePath.includes('/integration/')) testType = 'integration';
    else if (filePath.includes('/domain/')) testType = 'domain';
    else if (filePath.includes('/unit/')) testType = 'unit';
    else if (filePath.includes('/external/')) testType = 'external';
    
    // Determine the domain area
    let domain = 'unknown';
    const domainMatches = filePath.match(/\/(?:domain|integration|e2e|external)\/([^\/]+)/);
    if (domainMatches && domainMatches[1]) {
      domain = domainMatches[1];
    }
    
    return { 
      testCases, 
      describeName, 
      testType, 
      domain,
      isEmpty: testCases.length === 0,
      hasOnlyStubs: testCases.length > 0 && testCases.every(tc => tc.isStub)
    };
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return { 
      testCases: [], 
      describeName: '', 
      testType: 'unknown', 
      domain: 'unknown',
      isEmpty: true,
      hasOnlyStubs: false
    };
  }
}

// Analyze file contents for similarity
function analyzeFileSimilarity(files, fileData) {
  const similarityGroups = {};
  
  // Group files by describe name and domain
  const filesByDescribe = {};
  
  for (const file of files) {
    const data = fileData[file];
    const key = `${data.domain}:${data.describeName}`;
    
    if (!filesByDescribe[key]) {
      filesByDescribe[key] = [];
    }
    
    filesByDescribe[key].push(file);
  }
  
  // For each group, analyze test case similarity
  for (const [key, groupFiles] of Object.entries(filesByDescribe)) {
    if (groupFiles.length < 2) continue; // Skip groups with only one file
    
    similarityGroups[key] = groupFiles;
  }
  
  return similarityGroups;
}

// Find duplicate test cases across files
function findDuplicateTestCases(fileData) {
  const testCasesByHash = {};
  const duplicateCases = {};
  
  for (const [file, data] of Object.entries(fileData)) {
    for (const testCase of data.testCases) {
      const { testHash, testName } = testCase;
      
      if (!testCasesByHash[testHash]) {
        testCasesByHash[testHash] = [];
      }
      
      testCasesByHash[testHash].push({ file, testName });
    }
  }
  
  // Find duplicates
  for (const [hash, instances] of Object.entries(testCasesByHash)) {
    if (instances.length > 1) {
      duplicateCases[hash] = instances;
    }
  }
  
  return duplicateCases;
}

// Suggest consolidation strategy
function suggestConsolidationStrategy(fileData, similarityGroups, duplicateTestCases) {
  const strategy = {};
  
  // For each domain, find files that can be consolidated
  const domainFiles = {};
  
  for (const [file, data] of Object.entries(fileData)) {
    if (!domainFiles[data.domain]) {
      domainFiles[data.domain] = [];
    }
    
    domainFiles[data.domain].push({ file, data });
  }
  
  // For each domain, suggest consolidation
  for (const [domain, files] of Object.entries(domainFiles)) {
    const domainStrategy = {};
    
    // Group by test type
    const filesByType = {};
    for (const { file, data } of files) {
      if (!filesByType[data.testType]) {
        filesByType[data.testType] = [];
      }
      
      filesByType[data.testType].push(file);
    }
    
    // For each test type, suggest consolidation
    for (const [type, typeFiles] of Object.entries(filesByType)) {
      if (typeFiles.length < 2) continue;
      
      // Group further by file path prefix
      const filesByPrefix = {};
      for (const file of typeFiles) {
        const nameParts = path.basename(file, '.test.js').split('-');
        let prefix = nameParts[0];
        
        if (!filesByPrefix[prefix]) {
          filesByPrefix[prefix] = [];
        }
        
        filesByPrefix[prefix].push(file);
      }
      
      // Suggest consolidation for each prefix
      for (const [prefix, prefixFiles] of Object.entries(filesByPrefix)) {
        if (prefixFiles.length >= 2) {
          const key = `${domain}-${type}-${prefix}`;
          domainStrategy[key] = {
            targetFile: prefixFiles[0],
            filesToMerge: prefixFiles.slice(1),
            totalFiles: prefixFiles.length
          };
        }
      }
    }
    
    strategy[domain] = domainStrategy;
  }
  
  return strategy;
}

// Main analysis function
async function analyzeTests() {
  console.log('Starting in-depth test analysis...');
  
  // Find all test files
  const testFiles = findAllTestFiles();
  results.totalFiles = testFiles.length;
  console.log(`Found ${testFiles.length} test files.`);
  
  // Analyze each file
  const fileData = {};
  for (const file of testFiles) {
    const data = extractTestCases(file);
    fileData[file] = data;
    
    // Categorize by domain
    if (!results.filesByDomain[data.domain]) {
      results.filesByDomain[data.domain] = [];
    }
    results.filesByDomain[data.domain].push(file);
    
    // Categorize by type
    if (!results.filesByType[data.testType]) {
      results.filesByType[data.testType] = [];
    }
    results.filesByType[data.testType].push(file);
    
    // Track test counts
    results.testCounts[file] = data.testCases.length;
    
    // Find empty or invalid tests
    if (data.isEmpty) {
      results.emptyOrInvalidTests.push(file);
    }
    
    // Find low-value tests (only stubs or TODOs)
    if (data.hasOnlyStubs) {
      results.lowValueTests.push(file);
    }
  }
  
  // Find similar files
  results.consolidationCandidates = analyzeFileSimilarity(testFiles, fileData);
  
  // Find duplicate test cases
  results.duplicateTestCases = findDuplicateTestCases(fileData);
  
  // Create consolidation strategy
  results.consolidationStrategy = suggestConsolidationStrategy(fileData, results.consolidationCandidates, results.duplicateTestCases);
  
  // Generate the report
  generateReport(results, fileData);
}

// Generate a detailed report
function generateReport(results, fileData) {
  console.log('\n=============================================');
  console.log('TEST SUITE ANALYSIS REPORT');
  console.log('=============================================\n');
  
  // Basic statistics
  console.log(`Total test files: ${results.totalFiles}`);
  
  // Tests by domain
  console.log('\nFiles by domain:');
  for (const [domain, files] of Object.entries(results.filesByDomain)) {
    console.log(`- ${domain}: ${files.length} files`);
  }
  
  // Tests by type
  console.log('\nFiles by test type:');
  for (const [type, files] of Object.entries(results.filesByType)) {
    console.log(`- ${type}: ${files.length} files`);
  }
  
  // Empty test files
  console.log(`\nEmpty test files (${results.emptyOrInvalidTests.length}):`);
  for (const file of results.emptyOrInvalidTests.slice(0, 10)) {
    console.log(`- ${file}`);
  }
  if (results.emptyOrInvalidTests.length > 10) {
    console.log(`  ... and ${results.emptyOrInvalidTests.length - 10} more`);
  }
  
  // Low value test files
  console.log(`\nLow-value test files (only stubs/TODOs) (${results.lowValueTests.length}):`);
  for (const file of results.lowValueTests.slice(0, 10)) {
    console.log(`- ${file}`);
  }
  if (results.lowValueTests.length > 10) {
    console.log(`  ... and ${results.lowValueTests.length - 10} more`);
  }
  
  // Files with few tests
  const filesWithFewTests = Object.entries(results.testCounts)
    .filter(([_, count]) => count <= 2)
    .sort((a, b) => a[1] - b[1]);
  
  console.log(`\nFiles with few tests (<=2) (${filesWithFewTests.length}):`);
  for (const [file, count] of filesWithFewTests.slice(0, 10)) {
    console.log(`- ${file}: ${count} tests`);
  }
  if (filesWithFewTests.length > 10) {
    console.log(`  ... and ${filesWithFewTests.length - 10} more`);
  }
  
  // Duplicate test cases
  const duplicateCount = Object.keys(results.duplicateTestCases).length;
  console.log(`\nDuplicate test case implementations (${duplicateCount}):`);
  let i = 0;
  for (const [hash, instances] of Object.entries(results.duplicateTestCases)) {
    if (i++ >= 5) break;
    console.log(`\n  Duplicate set #${i}:`);
    for (const { file, testName } of instances) {
      console.log(`  - ${file}: "${testName}"`);
    }
  }
  if (duplicateCount > 5) {
    console.log(`  ... and ${duplicateCount - 5} more duplicate sets`);
  }
  
  // Consolidation strategy
  console.log('\n=============================================');
  console.log('CONSOLIDATION STRATEGY');
  console.log('=============================================\n');
  
  console.log('The following consolidation plan would significantly reduce the number of test files:');
  
  let totalFilesToRemove = 0;
  let totalConsolidationGroups = 0;
  
  for (const [domain, strategies] of Object.entries(results.consolidationStrategy)) {
    if (Object.keys(strategies).length === 0) continue;
    
    console.log(`\nDomain: ${domain}`);
    
    for (const [key, strategy] of Object.entries(strategies)) {
      console.log(`  Group "${key}" (${strategy.totalFiles} files):`);
      console.log(`    Target file: ${strategy.targetFile}`);
      console.log(`    Files to merge (${strategy.filesToMerge.length}):`);
      
      for (const file of strategy.filesToMerge.slice(0, 3)) {
        console.log(`      - ${file}`);
      }
      
      if (strategy.filesToMerge.length > 3) {
        console.log(`      ... and ${strategy.filesToMerge.length - 3} more`);
      }
      
      totalFilesToRemove += strategy.filesToMerge.length;
      totalConsolidationGroups++;
    }
  }
  
  // Summary
  console.log('\n=============================================');
  console.log('SUMMARY AND RECOMMENDATIONS');
  console.log('=============================================\n');
  
  console.log(`Current test files: ${results.totalFiles}`);
  console.log(`Files that could be removed through consolidation: ${totalFilesToRemove}`);
  console.log(`Files that are empty or invalid: ${results.emptyOrInvalidTests.length}`);
  console.log(`Files with only stubs/TODOs: ${results.lowValueTests.length}`);
  
  const potentialReduction = totalFilesToRemove + results.emptyOrInvalidTests.length;
  const percentReduction = Math.round((potentialReduction / results.totalFiles) * 100);
  
  console.log(`\nPotential reduction: ${potentialReduction} files (${percentReduction}% of total)`);
  console.log(`Estimated test files after cleanup: ${results.totalFiles - potentialReduction}`);
  
  console.log('\nRecommended cleanup steps:');
  console.log('1. Remove empty test files first');
  console.log('2. Review and potentially remove low-value test files with only stubs/TODOs');
  console.log('3. Implement the consolidation strategy, starting with the largest groups');
  console.log('4. Run the test suite after each step to ensure functionality is preserved');
  
  // Output to file
  const reportData = JSON.stringify(results, null, 2);
  fs.writeFileSync(path.join(projectRoot, 'test-analysis-results.json'), reportData);
  console.log('\nDetailed analysis saved to test-analysis-results.json');
}

analyzeTests().catch(error => console.error('Analysis failed:', error)); 