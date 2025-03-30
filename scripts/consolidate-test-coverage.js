#!/usr/bin/env node

/**
 * Script to consolidate redundant test coverage by:
 * 1. Identifying tests with similar functionality
 * 2. Merging similar test cases into a single file
 * 3. Ensuring complete coverage with minimal redundancy
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { globSync } from 'glob';

// Get the directory of the current file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Test files to consolidate
// Format: { targetFile: [files to merge content from] }
const filesToConsolidate = {
  // Challenge domain consolidation
  'tests/domain/challenge/challenge.model.test.js': [
    'tests/external/openai/challenge/challenge.model.test.js'
  ],
  
  // Evaluation service consolidation
  'tests/domain/evaluation/evaluation.service.test.js': [
    'tests/domain/evaluation/evaluationservice.test.js',
    'tests/domain/evaluation/services/evaluationservice.test.js'
  ],
  
  // System message tests consolidation
  'tests/domain/evaluation/services/evaluation-service-system-messages.test.js': [
    'tests/domain/evaluation/services/serviceDynamicSystemMessages.test.js'
  ],
  
  // Focus area service tests consolidation
  'tests/domain/focusArea/focusArea.service.test.js': [
    'tests/domain/focusArea/services/focus-area-service-system-messages.test.js',
    'tests/domain/focusArea/focus-area-service-system-messages.test.js'
  ],
  
  // OpenAI client tests consolidation
  'tests/external/openai/openai-client.test.js': [
    'tests/external/openai/sample-openai-test.test.js'
  ],
  
  // Evaluation responses API tests consolidation
  'tests/integration/responses-api/openai-responses.workflow.test.js': [
    'tests/domain/evaluation/openai-responses.workflow.test.js'
  ]
};

// Function to extract test cases from a test file
function extractTestCases(filePath) {
  try {
    const content = fs.readFileSync(path.join(projectRoot, filePath), 'utf8');
    const testCases = [];
    
    // Extract it/test blocks from the file
    const itRegex = /(?:it|test)\(\s*['"](.+?)['"]\s*,\s*(?:async\s*)?\(\)\s*=>\s*{([\s\S]*?)(?:}\s*\)\s*;|}\s*\))/g;
    let match;
    
    while ((match = itRegex.exec(content)) !== null) {
      const testName = match[1];
      const testBody = match[2];
      testCases.push({ testName, testBody });
    }
    
    // Extract import statements
    const importStatements = [];
    const importRegex = /import\s+.+?from\s+['"].+?['"]\s*;/g;
    while ((match = importRegex.exec(content)) !== null) {
      importStatements.push(match[0]);
    }
    
    // Extract describe blocks
    const describeName = content.match(/describe\(\s*['"](.+?)['"]/)?.[1] || '';
    
    return { testCases, importStatements, describeName };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return { testCases: [], importStatements: [], describeName: '' };
  }
}

// Function to merge test cases without duplicates
function mergeTestCases(targetFile, sourceFiles) {
  console.log(`Consolidating test cases into ${targetFile}...`);
  
  // Extract content from target file
  const targetContent = extractTestCases(targetFile);
  if (!targetContent.testCases.length) {
    console.error(`Target file ${targetFile} doesn't appear to be a valid test file.`);
    return false;
  }
  
  // Extract test cases from source files
  const allSourceTests = [];
  const allImports = [...targetContent.importStatements];
  
  for (const sourceFile of sourceFiles) {
    try {
      if (!fs.existsSync(path.join(projectRoot, sourceFile))) {
        console.log(`  Source file not found: ${sourceFile}`);
        continue;
      }
      
      console.log(`  Processing: ${sourceFile}`);
      const sourceContent = extractTestCases(sourceFile);
      
      // Add test cases from source files
      allSourceTests.push(...sourceContent.testCases);
      
      // Add unique imports
      for (const importStmt of sourceContent.importStatements) {
        if (!allImports.includes(importStmt)) {
          allImports.push(importStmt);
        }
      }
    } catch (error) {
      console.error(`  Error processing ${sourceFile}:`, error.message);
    }
  }
  
  // Deduplicate test cases (based on similar test names)
  const targetTestNames = targetContent.testCases.map(t => t.testName.toLowerCase());
  const uniqueSourceTests = allSourceTests.filter(test => {
    const testNameLower = test.testName.toLowerCase();
    return !targetTestNames.some(targetName => {
      // Check for similarity in test names
      return targetName.includes(testNameLower) || 
             testNameLower.includes(targetName) ||
             targetName.replace(/\s+/g, '') === testNameLower.replace(/\s+/g, '');
    });
  });
  
  if (uniqueSourceTests.length === 0) {
    console.log(`  No unique test cases found to merge into ${targetFile}`);
    return false;
  }
  
  // Read the target file
  const targetFullPath = path.join(projectRoot, targetFile);
  let content = fs.readFileSync(targetFullPath, 'utf8');
  
  // Add unique imports at the top of the file
  const uniqueImports = allImports.filter((importStmt, index) => 
    allImports.indexOf(importStmt) === index
  ).join('\n');
  
  // Find the position of the last describe block's closing brace
  const lastBracePos = content.lastIndexOf('});');
  
  if (lastBracePos === -1) {
    console.error(`  Could not find the end of the test block in ${targetFile}`);
    return false;
  }
  
  // Insert the test cases before the last brace
  let testCasesToAdd = uniqueSourceTests.map(test => 
    `\n  it('${test.testName}', async () => {${test.testBody}});\n`
  ).join('\n');
  
  // Update the file content
  const updatedContent = content.slice(0, lastBracePos) + testCasesToAdd + content.slice(lastBracePos);
  
  // Replace import section with unique imports
  const importEndIndex = updatedContent.indexOf('\n\n', updatedContent.lastIndexOf('import'));
  const updatedWithImports = uniqueImports + updatedContent.slice(importEndIndex);
  
  // Write the updated content to the target file
  fs.writeFileSync(targetFullPath, updatedWithImports);
  
  console.log(`  Added ${uniqueSourceTests.length} unique test cases to ${targetFile}`);
  return true;
}

// Function to format the test file
function formatTestFile(filePath) {
  try {
    console.log(`Formatting file: ${filePath}`);
    execSync(`npx prettier --write ${filePath}`, { 
      cwd: projectRoot, 
      stdio: 'inherit' 
    });
  } catch (error) {
    console.error(`Error formatting ${filePath}:`, error.message);
  }
}

// Function to remove source files after merging
function removeSourceFiles(sourceFiles) {
  for (const file of sourceFiles) {
    try {
      const fullPath = path.join(projectRoot, file);
      if (fs.existsSync(fullPath)) {
        console.log(`Removing file: ${file}`);
        fs.unlinkSync(fullPath);
      }
    } catch (error) {
      console.error(`Error removing ${file}:`, error.message);
    }
  }
}

// Main function to consolidate tests
function consolidateTests() {
  console.log('Starting test consolidation...');
  
  // Create a backup directory
  const backupDir = path.join(projectRoot, 'tests-backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  // Create a unique timestamp for the backup
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
  const backupPath = path.join(backupDir, `tests-consolidation-${timestamp}`);
  
  // Backup tests directory
  console.log(`Creating backup of tests directory to ${backupPath}...`);
  try {
    // Create backup directory
    fs.mkdirSync(backupPath, { recursive: true });
    
    // Copy tests directory content manually
    const copyDirSync = (src, dest) => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      const entries = fs.readdirSync(src, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
          copyDirSync(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };
    
    copyDirSync(path.join(projectRoot, 'tests'), path.join(backupPath, 'tests'));
    console.log('Backup created successfully.');
  } catch (error) {
    console.error('Error creating backup:', error.message);
    console.log('Aborting consolidation to prevent data loss.');
    return;
  }
  
  // Consolidate each group of files
  for (const [targetFile, sourceFiles] of Object.entries(filesToConsolidate)) {
    if (mergeTestCases(targetFile, sourceFiles)) {
      // Format the consolidated file
      formatTestFile(targetFile);
      
      // Remove source files
      console.log(`Removing source files after consolidation...`);
      removeSourceFiles(sourceFiles);
    }
  }
  
  console.log('Test consolidation complete!');
}

consolidateTests(); 