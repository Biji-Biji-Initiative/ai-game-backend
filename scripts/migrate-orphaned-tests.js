#!/usr/bin/env node
/**
 * Migrate Orphaned Tests
 * 
 * This script moves orphaned test files from src/test to appropriate locations
 * in our organized test structure.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Configuration
const shouldMove = process.argv.includes('--move');
const shouldCopy = process.argv.includes('--copy');

console.log(chalk.blue('=== Migrate Orphaned Tests ==='));
console.log(chalk.cyan(`Mode: ${shouldMove ? 'Move' : shouldCopy ? 'Copy' : 'Analyze'}`));
console.log(chalk.cyan('------------------------------'));

// Define the migrations to perform
const migrations = [
  {
    source: 'src/test/repositories/InMemoryUserRepository.js',
    target: 'tests/helpers/inMemory/InMemoryUserRepository.js',
    type: 'repository'
  },
  {
    source: 'src/test/repositories/InMemoryChallengeRepository.js',
    target: 'tests/helpers/inMemory/InMemoryChallengeRepository.js',
    type: 'repository'
  },
  {
    source: 'src/test/personality/services/TraitsAnalysisServiceTest.js',
    target: 'tests/domain/user/TraitsAnalysisService.test.js',
    type: 'test'
  },
  {
    source: 'src/test/user/services/UserServiceTest.js',
    target: 'tests/domain/user/UserService.test.js',
    type: 'test'
  }
];

// Ensure target directories exist
function ensureDirectoryExists(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  
  console.log(`Creating directory: ${dirname}`);
  fs.mkdirSync(dirname, { recursive: true });
  return true;
}

// Process a migration
function processMigration(migration) {
  const { source, target, type } = migration;
  
  // Check if source exists
  if (!fs.existsSync(source)) {
    console.log(chalk.yellow(`Source file not found: ${source}`));
    return false;
  }
  
  // Check if target already exists
  if (fs.existsSync(target)) {
    console.log(chalk.yellow(`Target file already exists: ${target}`));
    
    // For test files, we should skip if target exists
    if (type === 'test') {
      return false;
    }
    
    // For other types, we might want to continue
    const fileName = path.basename(target);
    const newTarget = target.replace(fileName, `${fileName}.migrated`);
    console.log(chalk.yellow(`Using alternative target: ${newTarget}`));
    migration.target = newTarget;
  }
  
  if (shouldMove || shouldCopy) {
    // Ensure target directory exists
    ensureDirectoryExists(target);
    
    // Copy/Move the file
    const content = fs.readFileSync(source, 'utf8');
    fs.writeFileSync(target, content);
    console.log(chalk.green(`${shouldMove ? 'Moved' : 'Copied'} ${source} to ${target}`));
    
    // If moving, delete the source
    if (shouldMove) {
      fs.unlinkSync(source);
      console.log(chalk.green(`Deleted original file: ${source}`));
    }
    
    return true;
  } else {
    // Just analyze
    console.log(chalk.blue(`Will ${shouldCopy ? 'copy' : 'move'} ${source} to ${target}`));
    return false;
  }
}

// Process all migrations
let processed = 0;
let skipped = 0;

for (const migration of migrations) {
  const success = processMigration(migration);
  if (success) {
    processed++;
  } else {
    skipped++;
  }
}

console.log(chalk.cyan('\n------------------------------'));
console.log(`Total migrations: ${migrations.length}`);
console.log(`Processed: ${processed}`);
console.log(`Skipped: ${skipped}`);

if (!shouldMove && !shouldCopy) {
  console.log(chalk.green('\nRun with --move to move files, or --copy to copy files:'));
  console.log(chalk.green(`node scripts/migrate-orphaned-tests.js --move`));
} 