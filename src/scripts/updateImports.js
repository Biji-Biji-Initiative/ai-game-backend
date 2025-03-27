/**
 * Import Path Update Script
 * 
 * This script updates all import paths in the codebase to use the new
 * DDD-compliant directory structure.
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

// Import path mappings - old path to new path
const importMappings = {
  '../utils/errorHandler': '../core/infra/errors/errorHandler',
  '../utils/logger': '../core/infra/logging/logger',
  '../utils/diContainer': '../core/infra/di/DIContainer',
  '../utils/performance/performanceMetrics': '../core/challenge/services/ChallengePerformanceService',
  '../utils/user/traitUtils': '../core/user/services/UserTraitsService',
  '../utils/challenge/challengeUtils': '../core/challenge/services/ChallengeUtils',
  '../utils/db/challengeDbMapper': '../core/infra/db/challengeDbMapper',
  '../utils/db/supabaseClient': '../core/infra/db/supabaseClient',
  '../../utils/errorHandler': '../../core/infra/errors/errorHandler',
  '../../utils/logger': '../../core/infra/logging/logger',
  '../../utils/diContainer': '../../core/infra/di/DIContainer',
  '../../utils/performance/performanceMetrics': '../../core/challenge/services/ChallengePerformanceService',
  '../../utils/user/traitUtils': '../../core/user/services/UserTraitsService',
  '../../utils/challenge/challengeUtils': '../../core/challenge/services/ChallengeUtils',
  '../../utils/db/challengeDbMapper': '../../core/infra/db/challengeDbMapper',
  '../../utils/db/supabaseClient': '../../core/infra/db/supabaseClient',
  '../../../utils/errorHandler': '../../../core/infra/errors/errorHandler',
  '../../../utils/logger': '../../../core/infra/logging/logger',
  '../../../utils/diContainer': '../../../core/infra/di/DIContainer',
  '../../../utils/performance/performanceMetrics': '../../../core/challenge/services/ChallengePerformanceService',
  '../../../utils/user/traitUtils': '../../../core/user/services/UserTraitsService',
  '../../../utils/challenge/challengeUtils': '../../../core/challenge/services/ChallengeUtils',
  '../../../utils/db/challengeDbMapper': '../../../core/infra/db/challengeDbMapper',
  '../../../utils/db/supabaseClient': '../../../core/infra/db/supabaseClient',
  '../../repositories/challengeTypeRepository': '../../core/challenge/repositories/ChallengeTypeRepository',
  '../repositories/challengeTypeRepository': '../core/challenge/repositories/ChallengeTypeRepository'
};

// Root directory of the codebase
const rootDir = path.resolve(__dirname, '..');

// File extensions to process
const extensions = ['.js', '.jsx', '.ts', '.tsx'];

// Directories to exclude
const excludeDirs = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.deprecated'
];

// Function to walk through the directory structure
async function walkDirs(dir) {
  let results = [];
  const entries = await readdir(dir);
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = await stat(fullPath);
    
    if (stats.isDirectory()) {
      if (!excludeDirs.includes(entry)) {
        const subResults = await walkDirs(fullPath);
        results = results.concat(subResults);
      }
    } else if (stats.isFile() && extensions.includes(path.extname(fullPath))) {
      results.push(fullPath);
    }
  }
  
  return results;
}

// Function to update imports in a file
async function updateFileImports(filePath) {
  try {
    let fileContent = await readFile(filePath, 'utf8');
    let updated = false;
    
    // Check for each mapped import path
    for (const [oldPath, newPath] of Object.entries(importMappings)) {
      const requireRegex = new RegExp(`require\\(['"](${oldPath})['"]\\)`, 'g');
      const importRegex = new RegExp(`import.*?from\\s+['"](${oldPath})['"]`, 'g');
      
      if (requireRegex.test(fileContent) || importRegex.test(fileContent)) {
        fileContent = fileContent.replace(requireRegex, `require('${newPath}')`);
        fileContent = fileContent.replace(importRegex, (match) => match.replace(oldPath, newPath));
        updated = true;
      }
    }
    
    if (updated) {
      await writeFile(filePath, fileContent, 'utf8');
      console.log(`Updated imports in ${filePath}`);
      return 1;
    }
    
    return 0;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
    return 0;
  }
}

// Main function
async function main() {
  try {
    console.log('Scanning files...');
    const files = await walkDirs(rootDir);
    console.log(`Found ${files.length} files to check.`);
    
    let updatedCount = 0;
    
    for (const file of files) {
      updatedCount += await updateFileImports(file);
    }
    
    console.log(`\nUpdate complete. Modified ${updatedCount} files.`);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
main(); 