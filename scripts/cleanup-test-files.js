#!/usr/bin/env node

/**
 * Test Files Consolidation Script
 * 
 * This script reorganizes test files to follow a domain-driven structure
 * that aligns with our architecture and testing principles:
 * - Prefer real behavior over mocks
 * - Tests should validate business rules and architecture
 * - Integration tests should use actual components where possible
 * - Only mock external dependencies when absolutely necessary
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define the new test directory structure based on domains
const TEST_DIRS = {
  // Core domain tests
  'challenge': 'tests/domains/challenge',
  'focus-area': 'tests/domains/focusArea', 
  'evaluation': 'tests/domains/evaluation',
  'prompt': 'tests/domains/prompt',
  
  // Integration tests across domains
  'cross-domain': 'tests/integration',
  
  // External service integration
  'openai': 'tests/external/openai',
  'supabase': 'tests/external/supabase',
  
  // End-to-end workflow tests
  'workflow': 'tests/e2e',
  
  // Utilities and shared components
  'utils': 'tests/shared/utils',
  'shared': 'tests/shared/common',
  
  // Real API tests
  'real-api': 'tests/real-api'
};

// Files to ignore (we don't want to move these)
const IGNORE_FILES = [
  'jest.config.js',
  'jest.setup.js'
];

// Pattern to identify test files
const TEST_FILE_PATTERN = /\.(test|spec)\.js$/;

// Get all directories to scan
const rootDir = path.resolve(__dirname, '..');
const dirsToScan = [
  rootDir,
  path.join(rootDir, 'tests'),
  path.join(rootDir, 'tests/integration'),
  path.join(rootDir, 'tests/real-api')
];

// Track stats
const stats = {
  identified: 0,
  moved: 0,
  archived: 0,
  errors: 0
};

// Ensure the destination directories exist
for (const dir of Object.values(TEST_DIRS)) {
  const fullPath = path.join(rootDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// Create an archive directory if it doesn't exist
const archiveDir = path.join(rootDir, 'archive', 'tests');
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
  console.log(`Created archive directory: archive/tests`);
}

// Find test files and determine where they should go
function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      // Skip node_modules, coverage, and archive directories
      if (['node_modules', 'coverage', 'archive'].includes(file.name)) {
        return;
      }
      scanDirectory(fullPath);
      return;
    }
    
    // Skip non-test files and ignored files
    if (!TEST_FILE_PATTERN.test(file.name) || IGNORE_FILES.includes(file.name)) {
      return;
    }
    
    stats.identified++;
    
    try {
      // Read the file content to determine where it should go
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Determine the appropriate destination
      let destDir = null;
      
      // First check if the path already indicates the domain
      for (const [key, targetDir] of Object.entries(TEST_DIRS)) {
        if (fullPath.includes(`/${key}/`) || fullPath.includes(`-${key}`) || 
            fullPath.includes(`${key}-`) || file.name.includes(key)) {
          destDir = targetDir;
          break;
        }
      }
      
      // If no match by path, check the content
      if (!destDir) {
        for (const [key, targetDir] of Object.entries(TEST_DIRS)) {
          // Look for imports, requires or describe statements that might indicate domain
          const keyMatches = [
            `import.*${key}`,
            `require.*${key}`,
            `${key}.*service`,
            `${key}.*repository`,
            `${key}.*model`,
            `describe.*${key}`
          ];
          
          if (keyMatches.some(pattern => new RegExp(pattern, 'i').test(content))) {
            destDir = targetDir;
            break;
          }
        }
      }
      
      // Default to archive if no suitable location found
      if (!destDir) {
        // Analyze the file a bit more to make a better guess
        if (content.includes('real') && content.includes('API')) {
          destDir = TEST_DIRS['real-api'];
        } else if (content.includes('mock(') || content.includes('jest.fn')) {
          // Tests with many mocks should be reconsidered later
          destDir = path.join('archive', 'tests', 'mocked-tests');
        } else {
          destDir = archiveDir;
        }
      }
      
      // Skip if the file is already in the right place
      if (fullPath.includes(destDir)) {
        return;
      }
      
      // Ensure destination directory exists
      const destPath = path.join(rootDir, destDir);
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      
      // Move the file
      const destinationFile = path.join(destPath, file.name);
      fs.copyFileSync(fullPath, destinationFile);
      
      // Only delete the original if it's not in a core test directory that we want to preserve
      if (!fullPath.includes('/src/') && 
          (fullPath.includes('/test-') || !fullPath.includes('/tests/'))) {
        fs.unlinkSync(fullPath);
        console.log(`Moved: ${fullPath} -> ${destinationFile}`);
        stats.moved++;
      } else {
        console.log(`Copied: ${fullPath} -> ${destinationFile}`);
        stats.moved++;
      }
    } catch (error) {
      console.error(`Error processing ${fullPath}:`, error.message);
      stats.errors++;
    }
  });
}

// Scan all directories
dirsToScan.forEach(scanDirectory);

// Print summary
console.log('\nTest Consolidation Summary:');
console.log(`  Identified test files: ${stats.identified}`);
console.log(`  Moved/copied to new structure: ${stats.moved}`);
console.log(`  Errors: ${stats.errors}`);

if (stats.identified === 0) {
  console.log('\nNo test files found to reorganize.');
}

// Git status to show changes
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  
  if (gitStatus.trim()) {
    console.log('\nChanged files:');
    console.log(gitStatus);
  } else {
    console.log('\nNo pending changes in git.');
  }
} catch (error) {
  console.log('\nCould not get git status:', error.message);
} 