#!/usr/bin/env node

/**
 * Script to clean up the test folder by:
 * 1. Removing/consolidating duplicate test files
 * 2. Moving tests to their correct locations
 * 3. Normalizing test file naming
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { globSync } from 'glob';

// Get the directory of the current file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Known duplicates to be removed (first file in each array is kept)
const knownDuplicates = {
  'user-personality-interaction.test.js': [
    'tests/integration/focusArea/userPersonalityInteraction.test.js',
    'tests/api/cross-domain/user-personality-interaction.test.js',
    'tests/api/cross-domain/userPersonalityInteraction.test.js'
  ],
  'challengeWorkflow.test.js': [
    'tests/e2e/challenge/challengeCycle.e2e.test.js',
    'tests/api/cross-domain/challengeWorkflow.test.js'
  ],
  'openai-client.test.js': [
    'tests/external/openai/openai-client.test.js',
    'tests/external/openai/user/openai-client.test.js'
  ],
  'supabase-client.test.js': [
    'tests/external/supabase/supabase-client.test.js',
    'tests/external/supabase/challenge/supabase-client.test.js'
  ],
  'OpenAIInsightGenerator.test.js': [
    'tests/infrastructure/services/OpenAIInsightGenerator.test.js',
    'tests/external/openai/challenge/OpenAIInsightGenerator.test.js'
  ],
  'challengeGeneration.direct.test.js': [
    'tests/external/openai/challengeGeneration.direct.test.js',
    'tests/external/openai/direct/challengeGeneration.direct.test.js',
    'tests/integration/challenge/challengeGeneration.direct.test.js'
  ],
  'focusArea.external.test.js': [
    'tests/external/openai/focusArea.external.test.js',
    'tests/external/openai/direct/focusArea.external.test.js',
    'tests/integration/focusArea/focusArea.external.test.js'
  ],
  'evaluation.external.test.js': [
    'tests/external/openai/evaluation.external.test.js',
    'tests/integration/challenge/evaluation.external.test.js'
  ],
  'UserService.test.js': [
    'tests/domain/user/services/UserService.test.js',
    'tests/domain/user/user.service.test.js',
    'tests/domain/user/UserService.test.js'
  ]
};

// Tests in wrong locations that should be moved
const testsToMove = {
  // Format: [source, destination]
  'tests/domain/evaluation-flow.test.js': 'tests/domain/evaluation/evaluation-flow.test.js',
  'tests/integration/challenge-evaluation-flow.test.js': 'tests/integration/challenge/challenge-evaluation-flow.test.js',
  'tests/integration/evaluation-flow.test.js': 'tests/integration/challenge/evaluation-flow.test.js',
  'tests/integration/evaluationCategoryRepository.test.js': 'tests/integration/focusArea/evaluationCategoryRepository.test.js',
  'tests/integration/focus-area-flow.test.js': 'tests/integration/focusArea/focus-area-flow.test.js'
};

// Function to remove duplicate files
function removeDuplicates() {
  console.log('Removing duplicate test files...');
  let removedCount = 0;
  
  for (const [_, duplicates] of Object.entries(knownDuplicates)) {
    // Keep the first file, remove the rest
    const fileToKeep = duplicates[0];
    const filesToRemove = duplicates.slice(1);
    
    console.log(`Keeping: ${fileToKeep}`);
    for (const file of filesToRemove) {
      try {
        if (fs.existsSync(path.join(projectRoot, file))) {
          console.log(`  Removing: ${file}`);
          fs.unlinkSync(path.join(projectRoot, file));
          removedCount++;
        } else {
          console.log(`  File not found: ${file}`);
        }
      } catch (error) {
        console.error(`  Error removing ${file}:`, error.message);
      }
    }
  }
  
  console.log(`Removed ${removedCount} duplicate files.`);
}

// Function to move misplaced test files
function moveTestFiles() {
  console.log('\nMoving tests to correct locations...');
  let movedCount = 0;
  
  for (const [source, destination] of Object.entries(testsToMove)) {
    try {
      const sourceFullPath = path.join(projectRoot, source);
      const destinationFullPath = path.join(projectRoot, destination);
      
      // Create destination directory if it doesn't exist
      const destinationDir = path.dirname(destinationFullPath);
      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }
      
      if (fs.existsSync(sourceFullPath)) {
        console.log(`Moving: ${source} -> ${destination}`);
        
        // Read file content
        const content = fs.readFileSync(sourceFullPath, 'utf8');
        
        // Write to new location
        fs.writeFileSync(destinationFullPath, content);
        
        // Remove original file
        fs.unlinkSync(sourceFullPath);
        
        movedCount++;
      } else {
        console.log(`Source file not found: ${source}`);
      }
    } catch (error) {
      console.error(`Error moving ${source}:`, error.message);
    }
  }
  
  console.log(`Moved ${movedCount} test files.`);
}

// Function to normalize naming conventions (kebab-case)
function normalizeFileNames() {
  console.log('\nNormalizing test file naming conventions...');
  let normalizedCount = 0;
  
  // Find all test files using camelCase
  const allTestFiles = globSync('tests/**/*.test.js', { cwd: projectRoot });
  
  for (const file of allTestFiles) {
    const fileName = path.basename(file);
    
    // Check if file uses camelCase (contains uppercase letters)
    if (/[A-Z]/.test(fileName) && !fileName.includes('-')) {
      try {
        // Convert to kebab-case
        const kebabCaseName = fileName
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .toLowerCase();
        
        const directory = path.dirname(file);
        const newPath = path.join(directory, kebabCaseName);
        const fullSourcePath = path.join(projectRoot, file);
        const fullDestPath = path.join(projectRoot, newPath);
        
        if (fullSourcePath !== fullDestPath) {
          console.log(`Renaming: ${file} -> ${newPath}`);
          
          // Read file content
          const content = fs.readFileSync(fullSourcePath, 'utf8');
          
          // Write to new name
          fs.writeFileSync(fullDestPath, content);
          
          // Remove original file
          fs.unlinkSync(fullSourcePath);
          
          normalizedCount++;
        }
      } catch (error) {
        console.error(`Error renaming ${file}:`, error.message);
      }
    }
  }
  
  console.log(`Normalized ${normalizedCount} file names.`);
}

// Function to clean up empty directories
function cleanEmptyDirs() {
  console.log('\nCleaning up empty directories...');
  let removedDirCount = 0;
  
  // Find all directories in tests
  function scanForEmpty(dir) {
    const items = fs.readdirSync(dir);
    
    // Process subdirectories first
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        scanForEmpty(fullPath);
      }
    }
    
    // Check if current directory is now empty
    const currentItems = fs.readdirSync(dir);
    if (currentItems.length === 0) {
      console.log(`Removing empty directory: ${dir}`);
      fs.rmdirSync(dir);
      removedDirCount++;
    }
  }
  
  try {
    scanForEmpty(path.join(projectRoot, 'tests'));
  } catch (error) {
    console.error('Error cleaning empty directories:', error.message);
  }
  
  console.log(`Removed ${removedDirCount} empty directories.`);
}

// Function to update imports in test files
function updateImports() {
  console.log('\nUpdating imports in test files after cleanup...');
  
  try {
    console.log('Running fix-test-imports.js script...');
    execSync('node scripts/fix-test-imports.js', { cwd: projectRoot, stdio: 'inherit' });
  } catch (error) {
    console.error('Error running fix-test-imports.js:', error.message);
  }
}

// Main function to run the cleanup
function cleanupTests() {
  console.log('Starting test folder cleanup...');
  
  // Create a backup directory
  const backupDir = path.join(projectRoot, 'tests-backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  // Create a unique timestamp for the backup
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
  const backupPath = path.join(backupDir, `tests-backup-${timestamp}`);
  
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
    console.log('Aborting cleanup to prevent data loss.');
    return;
  }
  
  // Run cleanup steps
  removeDuplicates();
  moveTestFiles();
  normalizeFileNames();
  updateImports();
  cleanEmptyDirs();
  
  console.log('\nTest folder cleanup complete! A backup was created in tests-backup directory.');
}

cleanupTests(); 