/**
 * Merge Duplicate Tests
 * 
 * This script helps merge duplicate test files by:
 * 1. Identifying duplicate test descriptions
 * 2. Suggesting which files to keep and which to merge
 * 3. Creating a merged test file with unique tests
 * 
 * Usage: node scripts/merge-duplicate-tests.js source-file.test.js target-file.test.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Check arguments
if (process.argv.length < 4) {
  console.log('Usage: node scripts/merge-duplicate-tests.js source-file.test.js target-file.test.js');
  process.exit(1);
}

// Get source and target files
const sourceFile = process.argv[2];
const targetFile = process.argv[3];
const sourceFilePath = resolve(sourceFile);
const targetFilePath = resolve(targetFile);

// Check if files exist
if (!existsSync(sourceFilePath)) {
  console.error(`Error: Source file does not exist: ${sourceFile}`);
  process.exit(1);
}

if (!existsSync(targetFilePath)) {
  console.error(`Error: Target file does not exist: ${targetFile}`);
  process.exit(1);
}

console.log(`Merging tests from ${sourceFile} into ${targetFile}`);

// Read source and target files
const sourceCode = readFileSync(sourceFilePath, 'utf-8');
const targetCode = readFileSync(targetFilePath, 'utf-8');

// Extract imports from both files
function extractImports(code) {
  const importRegex = /^import\s+.*?from\s+['"].*?['"];?\s*$/gm;
  const imports = [];
  let match;
  
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[0]);
  }
  
  return imports;
}

const sourceImports = extractImports(sourceCode);
const targetImports = extractImports(targetCode);

// Combine unique imports
const allImports = new Set([...targetImports, ...sourceImports]);

// Extract describe blocks
function extractDescribeBlocks(code) {
  const describeRegex = /describe\(['"`](.*?)['"`],\s*(?:function\s*\(\s*\)|(?:\(\s*\)|(?:async)?\s*\(\s*\))\s*=>)\s*{([\s\S]*?)}\s*\)\s*;?/g;
  const blocks = [];
  let match;
  
  while ((match = describeRegex.exec(code)) !== null) {
    blocks.push({
      description: match[1],
      content: match[2],
      full: match[0]
    });
  }
  
  return blocks;
}

const sourceBlocks = extractDescribeBlocks(sourceCode);
const targetBlocks = extractDescribeBlocks(targetCode);

// Extract individual tests from a describe block
function extractTests(describeBlock) {
  const testRegex = /\s*(it|test)\(['"`](.*?)['"`],\s*(?:function\s*\(\s*\)|(?:\(\s*\)|(?:async)?\s*\(\s*\))\s*=>)\s*{([\s\S]*?)}\s*\)\s*;?/g;
  const tests = [];
  let match;
  
  while ((match = testRegex.exec(describeBlock.content)) !== null) {
    tests.push({
      type: match[1], // it or test
      description: match[2],
      content: match[3],
      full: match[0]
    });
  }
  
  return tests;
}

// Process all describe blocks and their tests
const sourceTests = sourceBlocks.flatMap(block => 
  extractTests(block).map(test => ({
    ...test,
    describeBlock: block.description
  }))
);

const targetTests = targetBlocks.flatMap(block => 
  extractTests(block).map(test => ({
    ...test,
    describeBlock: block.description
  }))
);

// Find duplicate tests by comparing description + describe block
const duplicateTests = sourceTests.filter(sourceTest => 
  targetTests.some(targetTest => 
    sourceTest.description.toLowerCase() === targetTest.description.toLowerCase() &&
    sourceTest.describeBlock.toLowerCase() === targetTest.describeBlock.toLowerCase()
  )
);

// Find unique tests in source
const uniqueSourceTests = sourceTests.filter(sourceTest => 
  !targetTests.some(targetTest => 
    sourceTest.description.toLowerCase() === targetTest.description.toLowerCase() &&
    sourceTest.describeBlock.toLowerCase() === targetTest.describeBlock.toLowerCase()
  )
);

// Identify source describe blocks that have unique tests
const sourceBlocksWithUniqueTests = new Set(uniqueSourceTests.map(test => test.describeBlock));

// Report on findings
console.log('\n=== Analysis ===');
console.log(`Source file: ${sourceTests.length} tests in ${sourceBlocks.length} describe blocks`);
console.log(`Target file: ${targetTests.length} tests in ${targetBlocks.length} describe blocks`);
console.log(`Duplicate tests: ${duplicateTests.length}`);
console.log(`Unique tests in source: ${uniqueSourceTests.length}`);
console.log(`Source describe blocks with unique tests: ${sourceBlocksWithUniqueTests.size}`);

// Merge the tests
if (uniqueSourceTests.length === 0) {
  console.log('\nNo unique tests to merge. Source file can be deleted.');
} else {
  console.log('\n=== Merging Tests ===');
  
  // Strategy:
  // 1. Group unique source tests by describe block
  // 2. For each group:
  //    a. If describe block exists in target, add tests to it
  //    b. If not, add the entire describe block
  
  const testsByDescribeBlock = {};
  
  for (const test of uniqueSourceTests) {
    if (!testsByDescribeBlock[test.describeBlock]) {
      testsByDescribeBlock[test.describeBlock] = [];
    }
    testsByDescribeBlock[test.describeBlock].push(test);
  }
  
  // Check which describe blocks already exist in target
  const targetDescribeBlocks = new Set(targetBlocks.map(block => block.description));
  
  let mergedCode = [...allImports].join('\n') + '\n\n';
  
  // Add all target describe blocks first
  for (const block of targetBlocks) {
    const blockContent = block.content;
    const blockDescription = block.description;
    
    // If this describe block also exists in source with unique tests, we'll merge them
    if (sourceBlocksWithUniqueTests.has(blockDescription)) {
      const uniqueTestsForBlock = testsByDescribeBlock[blockDescription] || [];
      const uniqueTestsContent = uniqueTestsForBlock.map(test => test.full).join('\n\n');
      
      // Add unique tests to the end of the block
      const updatedBlockContent = blockContent.trimEnd() + '\n\n' + uniqueTestsContent + '\n';
      
      mergedCode += `describe('${blockDescription}', () => {${updatedBlockContent}});\n\n`;
      console.log(`Added ${uniqueTestsForBlock.length} tests to existing describe block: ${blockDescription}`);
    } else {
      // Keep the block as is
      mergedCode += `describe('${blockDescription}', () => {${blockContent}});\n\n`;
    }
  }
  
  // Add source describe blocks that don't exist in target
  for (const blockDescription of sourceBlocksWithUniqueTests) {
    if (!targetDescribeBlocks.has(blockDescription)) {
      const sourceBlock = sourceBlocks.find(block => block.description === blockDescription);
      mergedCode += `describe('${blockDescription}', () => {${sourceBlock.content}});\n\n`;
      console.log(`Added new describe block: ${blockDescription}`);
    }
  }
  
  // Write the merged code to a new file
  const mergedFilePath = targetFilePath.replace('.test.js', '.merged.test.js');
  writeFileSync(mergedFilePath, mergedCode, 'utf-8');
  
  console.log(`\nMerged file created: ${mergedFilePath.replace(projectRoot, '')}`);
  console.log('\nReview the merged file and replace the target file if it looks good:');
  console.log(`mv ${mergedFilePath} ${targetFilePath}`);
}

// Generate import update report
console.log('\n=== Import Updates ===');
const uniqueSourceImports = sourceImports.filter(imp => !targetImports.includes(imp));
if (uniqueSourceImports.length > 0) {
  console.log('The following imports from the source file were added to the target:');
  uniqueSourceImports.forEach(imp => console.log(`  ${imp}`));
}

console.log('\n=== Next Steps ===');
console.log('1. Review the merged file carefully');
console.log('2. Run tests to ensure everything still works');
console.log('3. If tests pass, replace the target file with the merged file');
console.log('4. Delete the source file'); 