#!/usr/bin/env node

/**
 * Script to perform aggressive test cleanup based on analysis results
 * This will:
 * 1. Remove empty test files
 * 2. Remove stub/TODO-only test files
 * 3. Consolidate similar test files
 * 4. Remove duplicate tests
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory of the current file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Load the analysis results
let analysisResults;
try {
  const analysisPath = path.join(projectRoot, 'test-analysis-results.json');
  if (!fs.existsSync(analysisPath)) {
    console.error('Analysis results not found. Please run test-analysis.js first.');
    process.exit(1);
  }
  analysisResults = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
} catch (error) {
  console.error('Error loading analysis results:', error.message);
  process.exit(1);
}

// Function to extract test cases from a file
function extractTestCases(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const testCases = [];
    
    // Extract it/test blocks
    const itRegex = /(?:it|test)\(\s*['"](.+?)['"]\s*,\s*(?:async\s*)?\(\)\s*=>\s*{([\s\S]*?)(?:}\s*\)\s*;|}\s*\))/g;
    let match;
    
    while ((match = itRegex.exec(content)) !== null) {
      const testName = match[1];
      const testBody = match[2];
      
      testCases.push({ 
        testName, 
        testBody,
        range: {
          start: match.index,
          end: match.index + match[0].length
        }
      });
    }
    
    // Extract imports and setup
    const setupSection = content.split(/describe\(/)[0] || '';
    
    // Extract describe block
    const describeMatch = content.match(/describe\(\s*['"](.+?)['"].*?\{([\s\S]*)/);
    const describeContent = describeMatch ? describeMatch[2] : '';
    const describeName = describeMatch ? describeMatch[1] : '';
    
    return {
      content,
      setupSection,
      describeName,
      testCases,
      describeContent
    };
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

// Function to merge test cases from multiple files
function mergeTestFiles(targetFile, sourceFiles) {
  console.log(`\nMerging tests into ${targetFile}:`);
  
  // Extract test cases from the target file
  const targetPath = path.join(projectRoot, targetFile);
  const targetData = extractTestCases(targetPath);
  
  if (!targetData) {
    console.error(`Cannot read target file: ${targetFile}`);
    return false;
  }
  
  // Keep track of test names to avoid duplicates
  const existingTestNames = new Set(targetData.testCases.map(t => t.testName));
  
  // Test cases to add
  const testsToAdd = [];
  const processedFiles = [];
  
  // Process each source file
  for (const sourceFile of sourceFiles) {
    const sourcePath = path.join(projectRoot, sourceFile);
    
    if (!fs.existsSync(sourcePath)) {
      console.log(`  Source file not found: ${sourceFile}`);
      continue;
    }
    
    console.log(`  Processing: ${sourceFile}`);
    const sourceData = extractTestCases(sourcePath);
    
    if (!sourceData) {
      console.log(`  Error processing: ${sourceFile}`);
      continue;
    }
    
    // Add unique tests from the source file
    let uniqueTests = 0;
    for (const test of sourceData.testCases) {
      // Skip if the test name already exists in the target or was added from another source
      if (existingTestNames.has(test.testName)) {
        continue;
      }
      
      testsToAdd.push(test);
      existingTestNames.add(test.testName);
      uniqueTests++;
    }
    
    if (uniqueTests > 0) {
      console.log(`    Added ${uniqueTests} unique tests`);
      processedFiles.push(sourceFile);
    } else {
      console.log(`    No unique tests found to add`);
    }
  }
  
  if (testsToAdd.length === 0) {
    console.log(`  No tests to add to ${targetFile}`);
    return false;
  }
  
  // Create the merged content
  try {
    // Find where to insert the new tests
    const lastBraceIndex = targetData.content.lastIndexOf('});');
    if (lastBraceIndex === -1) {
      console.error(`  Cannot find end of describe block in ${targetFile}`);
      return false;
    }
    
    // Generate new tests content
    const newTestsContent = testsToAdd.map(test => {
      return `\n  it('${test.testName}', async () => {${test.testBody}});`;
    }).join('\n');
    
    // Create the updated content
    const updatedContent = 
      targetData.content.slice(0, lastBraceIndex) + 
      newTestsContent + 
      targetData.content.slice(lastBraceIndex);
    
    // Write the updated content
    fs.writeFileSync(targetPath, updatedContent);
    
    console.log(`  Successfully merged ${testsToAdd.length} tests into ${targetFile}`);
    
    // Remove the source files
    for (const sourceFile of processedFiles) {
      const sourcePath = path.join(projectRoot, sourceFile);
      console.log(`  Removing merged file: ${sourceFile}`);
      fs.unlinkSync(sourcePath);
    }
    
    return true;
  } catch (error) {
    console.error(`  Error updating ${targetFile}:`, error.message);
    return false;
  }
}

// Function to remove empty test files
function removeEmptyTestFiles() {
  const emptyFiles = analysisResults.emptyOrInvalidTests || [];
  console.log(`\nRemoving ${emptyFiles.length} empty test files...`);
  
  let removedCount = 0;
  for (const file of emptyFiles) {
    const filePath = path.join(projectRoot, file);
    
    if (fs.existsSync(filePath)) {
      console.log(`  Removing: ${file}`);
      fs.unlinkSync(filePath);
      removedCount++;
    } else {
      console.log(`  File not found: ${file}`);
    }
  }
  
  console.log(`  Removed ${removedCount} empty test files.`);
  return removedCount;
}

// Function to remove stub/TODO test files
function removeLowValueTestFiles() {
  const lowValueFiles = analysisResults.lowValueTests || [];
  console.log(`\nRemoving ${lowValueFiles.length} low-value test files (only stubs/TODOs)...`);
  
  let removedCount = 0;
  for (const file of lowValueFiles) {
    const filePath = path.join(projectRoot, file);
    
    if (fs.existsSync(filePath)) {
      console.log(`  Removing: ${file}`);
      fs.unlinkSync(filePath);
      removedCount++;
    } else {
      console.log(`  File not found: ${file}`);
    }
  }
  
  console.log(`  Removed ${removedCount} low-value test files.`);
  return removedCount;
}

// Function to implement the consolidation strategy
function implementConsolidationStrategy() {
  const strategy = analysisResults.consolidationStrategy || {};
  console.log('\nImplementing consolidation strategy...');
  
  let consolidatedGroups = 0;
  let removedFiles = 0;
  
  for (const [domain, strategies] of Object.entries(strategy)) {
    if (Object.keys(strategies).length === 0) continue;
    
    console.log(`\nDomain: ${domain}`);
    
    for (const [key, strategyData] of Object.entries(strategies)) {
      console.log(`  Processing group "${key}" (${strategyData.totalFiles} files)`);
      console.log(`    Target file: ${strategyData.targetFile}`);
      console.log(`    Files to merge: ${strategyData.filesToMerge.length}`);
      
      const success = mergeTestFiles(strategyData.targetFile, strategyData.filesToMerge);
      
      if (success) {
        consolidatedGroups++;
        removedFiles += strategyData.filesToMerge.length;
      }
    }
  }
  
  console.log(`\nConsolidated ${consolidatedGroups} groups, removed ${removedFiles} files.`);
  return removedFiles;
}

// Function to clean up empty directories
function cleanEmptyDirectories() {
  console.log('\nCleaning up empty directories...');
  let removedDirCount = 0;
  
  function scanForEmpty(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    // Process subdirectories first
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      if (fs.statSync(fullPath).isDirectory()) {
        scanForEmpty(fullPath);
      }
    }
    
    // Check if current directory is now empty
    const currentItems = fs.readdirSync(dir);
    if (currentItems.length === 0) {
      console.log(`  Removing empty directory: ${dir}`);
      fs.rmdirSync(dir);
      removedDirCount++;
    }
  }
  
  try {
    scanForEmpty(path.join(projectRoot, 'tests'));
  } catch (error) {
    console.error('Error cleaning empty directories:', error.message);
  }
  
  console.log(`  Removed ${removedDirCount} empty directories.`);
  return removedDirCount;
}

// Function to regenerate import paths
function updateImportPaths() {
  console.log('\nUpdating import paths...');
  
  try {
    console.log('  Running fix-test-imports.js script...');
    execSync('node scripts/fix-test-imports.js', { cwd: projectRoot, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('  Error updating import paths:', error.message);
    return false;
  }
}

// Main function
async function performAggressiveCleanup() {
  console.log('Starting aggressive test cleanup...');
  
  // Create a backup directory
  const backupDir = path.join(projectRoot, 'tests-backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  // Create a unique timestamp for the backup
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
  const backupPath = path.join(backupDir, `tests-aggressive-${timestamp}`);
  
  // Backup tests directory
  console.log(`\nCreating backup of tests directory to ${backupPath}...`);
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
    console.log('  Backup created successfully.');
  } catch (error) {
    console.error('  Error creating backup:', error.message);
    console.log('  Aborting cleanup to prevent data loss.');
    return;
  }
  
  // Step 1: Remove empty test files
  const emptyRemoved = removeEmptyTestFiles();
  
  // Step 2: Remove low-value test files
  const lowValueRemoved = removeLowValueTestFiles();
  
  // Step 3: Implement consolidation strategy
  const consolidationRemoved = implementConsolidationStrategy();
  
  // Step 4: Clean up empty directories
  const directoriesRemoved = cleanEmptyDirectories();
  
  // Step 5: Update import paths
  updateImportPaths();
  
  // Generate summary
  console.log('\n=============================================');
  console.log('CLEANUP SUMMARY');
  console.log('=============================================\n');
  
  console.log(`Empty test files removed: ${emptyRemoved}`);
  console.log(`Low-value test files removed: ${lowValueRemoved}`);
  console.log(`Files removed through consolidation: ${consolidationRemoved}`);
  console.log(`Empty directories removed: ${directoriesRemoved}`);
  
  const totalFilesRemoved = emptyRemoved + lowValueRemoved + consolidationRemoved;
  const originalTotal = analysisResults.totalFiles;
  const percentReduction = Math.round((totalFilesRemoved / originalTotal) * 100);
  
  console.log(`\nTotal files removed: ${totalFilesRemoved} (${percentReduction}% of original ${originalTotal})`);
  console.log(`Estimated remaining test files: ${originalTotal - totalFilesRemoved}`);
  
  console.log('\nCleanup complete! A backup was created in the tests-backup directory.');
  console.log('Next steps:');
  console.log('1. Run tests to ensure functionality is preserved: npm test');
  console.log('2. Review any failing tests and fix if needed');
  console.log('3. Commit changes with a message describing the cleanup');
}

performAggressiveCleanup().catch(error => console.error('Cleanup failed:', error)); 