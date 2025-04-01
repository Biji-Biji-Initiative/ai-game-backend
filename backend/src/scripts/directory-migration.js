/**
 * Directory Migration Script for ARCH-2
 * 
 * This script helps with the migration of files and directories
 * according to the plan outlined in docs/architecture/directory-structure.md.
 * 
 * Usage:
 *   node src/scripts/directory-migration.js --phase=1
 * 
 * Phases:
 *   1: Initial structure updates (create directories, move infra code)
 *   2: Domain restructuring (move domain code)
 *   3: Generate import path update report
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SRC_DIR = path.resolve(__dirname, '../');
const CORE_DIR = path.join(SRC_DIR, 'core');

// New directory paths
const DOMAIN_DIR = path.join(SRC_DIR, 'domain');
const INFRASTRUCTURE_DIR = path.join(SRC_DIR, 'infrastructure');
const SHARED_DIR = path.join(SRC_DIR, 'shared');
const APPLICATION_DIR = path.join(SRC_DIR, 'application');

// Phase 1 mappings (infrastructure and shared)
const PHASE_1_MAPPINGS = [
  { from: path.join(CORE_DIR, 'infra'), to: INFRASTRUCTURE_DIR },
  { from: path.join(CORE_DIR, 'ai'), to: path.join(INFRASTRUCTURE_DIR, 'ai') },
  { from: path.join(CORE_DIR, 'auth'), to: path.join(INFRASTRUCTURE_DIR, 'auth') },
  { from: path.join(CORE_DIR, 'prompt'), to: path.join(INFRASTRUCTURE_DIR, 'ai', 'prompts') },
  { from: path.join(CORE_DIR, 'common'), to: SHARED_DIR },
  { from: path.join(CORE_DIR, 'shared'), to: path.join(SHARED_DIR, 'utils') },
];

// Phase 2 domain directories to move
const DOMAIN_CONTEXTS = [
  'user',
  'challenge',
  'evaluation',
  'personality',
  'focusArea',
  'progress',
  'userJourney',
  'adaptive'
];

// Application structure reorganization
const APPLICATION_SUBDIRS = [
  'coordinators',
  'eventHandlers',
  'services',
  'services/challenge',
  'services/evaluation',
  'services/focusArea',
  'services/personality',
  'services/user',
  'services/progress'
];

// Files to move in the application reorganization (Phase 2)
const APPLICATION_FILE_MOVES = [
  { 
    from: path.join(APPLICATION_DIR, 'BaseCoordinator.js'), 
    to: path.join(APPLICATION_DIR, 'coordinators', 'BaseCoordinator.js') 
  },
  { 
    from: path.join(APPLICATION_DIR, 'challengeCoordinator.js'), 
    to: path.join(APPLICATION_DIR, 'coordinators', 'ChallengeCoordinator.js') 
  },
  { 
    from: path.join(APPLICATION_DIR, 'PersonalityCoordinator.js'), 
    to: path.join(APPLICATION_DIR, 'coordinators', 'PersonalityCoordinator.js') 
  },
  { 
    from: path.join(APPLICATION_DIR, 'userJourneyCoordinator.js'), 
    to: path.join(APPLICATION_DIR, 'coordinators', 'UserJourneyCoordinator.js') 
  },
  { 
    from: path.join(APPLICATION_DIR, 'EventHandlers.js'), 
    to: path.join(APPLICATION_DIR, 'eventHandlers', 'ApplicationEventHandlers.js') 
  }
];

/**
 * Create directory if it doesn't exist
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Move a file or directory using git mv (to preserve history)
 */
function moveWithGit(from, to) {
  console.log(`Moving: ${from} -> ${to}`);
  try {
    ensureDirectoryExists(path.dirname(to));
    execSync(`git mv "${from}" "${to}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Error moving ${from} to ${to}:`, error.message);
    return false;
  }
}

/**
 * Create new directory structure (Phase 1)
 */
function createDirectoryStructure() {
  ensureDirectoryExists(DOMAIN_DIR);
  ensureDirectoryExists(INFRASTRUCTURE_DIR);
  ensureDirectoryExists(SHARED_DIR);
  ensureDirectoryExists(path.join(SHARED_DIR, 'models'));
  ensureDirectoryExists(path.join(SHARED_DIR, 'valueObjects'));
  ensureDirectoryExists(path.join(SHARED_DIR, 'utils'));
  console.log('Created base directory structure');
}

/**
 * Move infrastructure and shared components (Phase 1)
 */
function migrateInfrastructure() {
  let successCount = 0;
  for (const mapping of PHASE_1_MAPPINGS) {
    if (fs.existsSync(mapping.from)) {
      if (moveWithGit(mapping.from, mapping.to)) {
        successCount++;
      }
    } else {
      console.warn(`Source directory not found: ${mapping.from}`);
    }
  }
  console.log(`Completed Phase 1 migration: ${successCount}/${PHASE_1_MAPPINGS.length} moves successful`);
}

/**
 * Move domain contexts to domain directory (Phase 2)
 */
function migrateDomains() {
  let successCount = 0;
  for (const context of DOMAIN_CONTEXTS) {
    const from = path.join(CORE_DIR, context);
    const to = path.join(DOMAIN_DIR, context);
    if (fs.existsSync(from)) {
      if (moveWithGit(from, to)) {
        successCount++;
      }
    } else {
      console.warn(`Domain context not found: ${from}`);
    }
  }
  console.log(`Completed domain migration: ${successCount}/${DOMAIN_CONTEXTS.length} contexts moved`);
}

/**
 * Reorganize application directory (Phase 2)
 */
function reorganizeApplication() {
  // Create application subdirectories
  for (const dir of APPLICATION_SUBDIRS) {
    ensureDirectoryExists(path.join(APPLICATION_DIR, dir));
  }
  
  // Move application files
  let successCount = 0;
  for (const move of APPLICATION_FILE_MOVES) {
    if (fs.existsSync(move.from)) {
      if (moveWithGit(move.from, move.to)) {
        successCount++;
      }
    } else {
      console.warn(`Application file not found: ${move.from}`);
    }
  }
  console.log(`Completed application reorganization: ${successCount}/${APPLICATION_FILE_MOVES.length} files moved`);
}

/**
 * Generate import path report (Phase 3)
 */
function generateImportReport() {
  const report = {};
  
  // Function to find all JS files
  function findJsFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        findJsFiles(filePath, fileList);
      } else if (file.endsWith('.js')) {
        fileList.push(filePath);
      }
    }
    return fileList;
  }
  
  // Function to check imports in a file
  function checkImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const imports = [];
    
    // Find import statements
    for (const line of lines) {
      if (line.includes('import') && line.includes('from')) {
        // Extract the import path
        const match = line.match(/from\s+['"]([^'"]+)['"]/);
        if (match && match[1]) {
          const importPath = match[1];
          // Only report imports that need updating
          if (importPath.includes('/core/')) {
            imports.push({ line, path: importPath });
          }
        }
      }
    }
    
    if (imports.length > 0) {
      report[filePath] = imports;
    }
  }
  
  // Find all JS files and check their imports
  const jsFiles = findJsFiles(SRC_DIR);
  for (const file of jsFiles) {
    checkImports(file);
  }
  
  // Write report to file
  const reportPath = path.join(__dirname, 'import-path-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Import path report generated at: ${reportPath}`);
  console.log(`Files needing import updates: ${Object.keys(report).length}`);
}

/**
 * Main function to run the migration script
 */
function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const phaseArg = args.find(arg => arg.startsWith('--phase='));
  const phase = phaseArg ? parseInt(phaseArg.split('=')[1]) : null;
  
  if (!phase || ![1, 2, 3].includes(phase)) {
    console.error('Please specify a valid phase (1, 2, or 3) using --phase=NUMBER');
    process.exit(1);
  }
  
  console.log(`Running directory migration script (Phase ${phase})`);
  
  switch (phase) {
    case 1:
      createDirectoryStructure();
      migrateInfrastructure();
      break;
    case 2:
      migrateDomains();
      reorganizeApplication();
      break;
    case 3:
      generateImportReport();
      break;
  }
  
  console.log('Migration script completed');
}

// Run the script
main(); 