#!/usr/bin/env node

/**
 * Move Legacy Tests Script
 * 
 * This script finds and moves tests from legacy directories
 * into our new domain-driven test structure.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Root directory
const rootDir = path.resolve(__dirname, '..');

// Legacy test directories that need to be migrated
const LEGACY_DIRS = [
  'tests/challenges',
  'tests/focus-areas',
  'tests/integration'
];

// Mapping of keywords to target directories
const KEYWORD_MAPPING = {
  'challenge': 'tests/domains/challenge',
  'focus-area': 'tests/domains/focusArea',
  'evaluation': 'tests/domains/evaluation',
  'prompt': 'tests/domains/prompt',
  'domain': 'tests/shared/common',
  'event': 'tests/shared/common',
  'util': 'tests/shared/utils',
  'helper': 'tests/shared/utils',
  'integration': 'tests/integration',
  'openai': 'tests/external/openai',
  'supabase': 'tests/external/supabase',
  'api': 'tests/external',
  'workflow': 'tests/e2e'
};

// Mapping of filenames to target directories (for specific files)
const FILE_MAPPING = {
  'test-challenges.js': 'tests/domains/challenge',
  'test-focus-areas.js': 'tests/domains/focusArea',
  'evaluationPrompt.test.js': 'tests/domains/evaluation',
  'evaluationCategoryRepository.test.js': 'tests/domains/evaluation',
  'Evaluation.test.js': 'tests/domains/evaluation',
};

// Track stats
const stats = {
  moved: 0,
  copied: 0,
  renamed: 0,
  skipped: 0,
  errors: 0
};

// Function to make a filename consistent with our naming conventions
function standardizeFilename(filename) {
  // If it starts with "test-" and doesn't end with ".test.js", rename it
  if (filename.startsWith('test-') && !filename.endsWith('.test.js')) {
    // Convert test-focus-areas.js to FocusArea.test.js
    const baseName = filename.replace('test-', '').replace('.js', '');
    
    // Convert kebab-case to PascalCase
    const pascalName = baseName
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
    
    // Handle plurals (challenges -> Challenge)
    const singularName = pascalName.endsWith('s') 
      ? pascalName.slice(0, -1) 
      : pascalName;
    
    return `${singularName}.test.js`;
  }
  
  return filename;
}

// Process a file and determine where it should go
function processFile(filePath) {
  const filename = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // First check if there's a direct mapping for this file
  if (FILE_MAPPING[filename]) {
    return {
      targetDir: FILE_MAPPING[filename],
      shouldRename: filename.startsWith('test-')
    };
  }
  
  // Next, scan the file content for keywords
  for (const [keyword, targetDir] of Object.entries(KEYWORD_MAPPING)) {
    // Check if the keyword is in the filename or content
    if (filename.toLowerCase().includes(keyword) || 
        fileContent.toLowerCase().includes(keyword)) {
      return {
        targetDir,
        shouldRename: filename.startsWith('test-')
      };
    }
  }
  
  // Default to domains/challenge for challenge-related files
  if (filePath.includes('/challenges/')) {
    return {
      targetDir: 'tests/domains/challenge',
      shouldRename: true
    };
  }
  
  // Default to domains/focusArea for focus-area-related files
  if (filePath.includes('/focus-areas/')) {
    return {
      targetDir: 'tests/domains/focusArea',
      shouldRename: true
    };
  }
  
  // If we couldn't determine a target, put it in a legacy folder
  return {
    targetDir: 'tests/legacy',
    shouldRename: false
  };
}

// Process all files in the legacy directories
function processDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory doesn't exist, skipping: ${dir}`);
    return;
  }
  
  // Create the legacy directory if needed
  const legacyDir = path.join(rootDir, 'tests/legacy');
  if (!fs.existsSync(legacyDir)) {
    fs.mkdirSync(legacyDir, { recursive: true });
  }
  
  // Process all files in the directory
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const sourcePath = path.join(dir, file.name);
    
    // Skip README files
    if (file.name === 'README.md' || file.name === 'setup.js') {
      stats.skipped++;
      console.log(`Skipped: ${sourcePath} (README or setup file)`);
      continue;
    }
    
    // Process subdirectories recursively
    if (file.isDirectory()) {
      processDirectory(sourcePath);
      continue;
    }
    
    // Skip non-JavaScript files
    if (!file.name.endsWith('.js')) {
      stats.skipped++;
      console.log(`Skipped: ${sourcePath} (not a JavaScript file)`);
      continue;
    }
    
    // Determine where the file should go
    const { targetDir, shouldRename } = processFile(sourcePath);
    
    // Create the target directory if it doesn't exist
    const targetDirPath = path.join(rootDir, targetDir);
    if (!fs.existsSync(targetDirPath)) {
      fs.mkdirSync(targetDirPath, { recursive: true });
      console.log(`Created directory: ${targetDir}`);
    }
    
    try {
      // Determine the target filename (possibly renamed)
      const targetFilename = shouldRename 
        ? standardizeFilename(file.name) 
        : file.name;
      
      const targetPath = path.join(targetDirPath, targetFilename);
      
      // Check if the renamed file would be a duplicate
      if (fs.existsSync(targetPath)) {
        const alternateTargetPath = path.join(
          targetDirPath, 
          `legacy-${targetFilename}`
        );
        
        // Copy the file with a 'legacy-' prefix
        fs.copyFileSync(sourcePath, alternateTargetPath);
        console.log(`Copied as alternate: ${sourcePath} -> ${alternateTargetPath}`);
        stats.copied++;
      } else {
        // Copy the file
        fs.copyFileSync(sourcePath, targetPath);
        
        if (shouldRename) {
          console.log(`Copied and renamed: ${sourcePath} -> ${targetPath}`);
          stats.renamed++;
        } else {
          console.log(`Copied: ${sourcePath} -> ${targetPath}`);
          stats.copied++;
        }
        
        // Move the original file to the legacy directory
        const legacyPath = path.join(legacyDir, file.name);
        fs.renameSync(sourcePath, legacyPath);
        console.log(`Moved original to legacy: ${sourcePath} -> ${legacyPath}`);
        stats.moved++;
      }
    } catch (error) {
      console.error(`Error processing ${sourcePath}:`, error.message);
      stats.errors++;
    }
  }
  
  // Remove the directory if it's now empty
  try {
    const remainingFiles = fs.readdirSync(dir);
    if (remainingFiles.length === 0) {
      fs.rmdirSync(dir);
      console.log(`Removed empty directory: ${dir}`);
    }
  } catch (error) {
    console.error(`Error checking/removing directory ${dir}:`, error.message);
  }
}

// Process each legacy directory
LEGACY_DIRS.forEach(dir => {
  const fullPath = path.join(rootDir, dir);
  console.log(`Processing legacy directory: ${fullPath}`);
  processDirectory(fullPath);
});

// Print summary
console.log('\nLegacy Test Migration Summary:');
console.log(`  Files moved to legacy: ${stats.moved}`);
console.log(`  Files copied to new structure: ${stats.copied}`);
console.log(`  Files renamed: ${stats.renamed}`);
console.log(`  Files skipped: ${stats.skipped}`);
console.log(`  Errors: ${stats.errors}`);

// Add the script to package.json if not already there
try {
  const packagePath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (!packageJson.scripts['test:move-legacy']) {
    packageJson.scripts['test:move-legacy'] = 'node scripts/move-legacy-tests.js';
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('\nAdded test:move-legacy script to package.json');
  }
} catch (error) {
  console.error('Error updating package.json:', error.message);
}

console.log('\nNext steps:');
console.log('1. Run the tests with the new structure: npm run test:domains');
console.log('2. Fix any import paths or test issues');
console.log('3. Update test files to use in-memory repositories');
console.log('4. Add more domain-specific test cases following our structure'); 
 