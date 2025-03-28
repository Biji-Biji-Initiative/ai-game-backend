#!/usr/bin/env node
/**
 * Migrate to New Environment Setup
 * 
 * This script helps migrate from the old test environment configuration
 * to the new unified environment setup using loadEnv.js.
 * 
 * It:
 * 1. Creates a .env.test file if it doesn't exist
 * 2. Updates test files to use the new loadEnv.js instead of old setup files
 * 3. Ensures all tests skip properly when credentials are missing
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');

// Check if we have an .env.test file
const envTestPath = path.resolve(process.cwd(), '.env.test');
const envExamplePath = path.resolve(process.cwd(), '.env.test.example');

// Check for old environment setups
const OLD_ENV_PATTERNS = [
  'tests/config/test.env',
  'tests/setup/testEnv.js',
  'tests/helpers/setupTestEnv.js'
];

// Patterns to search for in test files
const patterns = {
  oldImports: /require\(['"]\.\.\/config\/test\.env['"]\)|require\(['"]\.\.\/setup\/testEnv['"]\)|require\(['"]\.\.\/helpers\/setupTestEnv['"]\)/g,
  directEnvAccess: /process\.env\.OPENAI_API_KEY|process\.env\.SUPABASE/g,
  oldSkipLogic: /this\.skip\(\)|describe\.skip|it\.skip/g,
  noSkipLogic: /OpenAI|Supabase|API|External/g
};

// Function to ensure .env.test exists
function ensureEnvFileExists() {
  if (fs.existsSync(envTestPath)) {
    console.log(chalk.green('✔ .env.test file already exists'));
    return true;
  }
  
  if (fs.existsSync(envExamplePath)) {
    console.log(chalk.yellow('⚠️ .env.test file not found, creating from example'));
    fs.copyFileSync(envExamplePath, envTestPath);
    console.log(chalk.green('✔ Created .env.test from example'));
    console.log(chalk.yellow('  Please update it with your actual credentials'));
    return true;
  }
  
  console.log(chalk.red('❌ No .env.test or .env.test.example file found'));
  return false;
}

// Function to check for old environment setup files
function checkOldEnvSetups() {
  for (const pattern of OLD_ENV_PATTERNS) {
    const matches = glob.sync(pattern);
    
    if (matches.length > 0) {
      console.log(chalk.yellow(`⚠️ Found old environment setup: ${pattern}`));
      console.log(chalk.yellow(`  This should be migrated to the new .env.test approach`));
      
      // If it's the problematic test.env file, warn about potential security risks
      if (pattern === 'tests/config/test.env') {
        console.log(chalk.red('⚠️ WARNING: tests/config/test.env may contain sensitive credentials'));
        console.log(chalk.red('  Consider removing this file and using .env.test instead'));
        console.log(chalk.red('  Also check your Git history to ensure credentials have not been committed'));
      }
    }
  }
}

// Function to scan test files for old patterns
function scanTestFiles() {
  const files = glob.sync('tests/**/*.test.js');
  console.log(`Found ${files.length} test files to scan`);
  
  const filesToFix = [];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const issues = [];
      
      // Check for old imports
      if (content.match(patterns.oldImports)) {
        issues.push('oldImports');
      }
      
      // Check for direct env access
      if (content.match(patterns.directEnvAccess)) {
        issues.push('directEnvAccess');
      }
      
      // Check for old skip logic
      if (content.match(patterns.oldSkipLogic)) {
        issues.push('oldSkipLogic');
      }
      
      // Check for missing skip logic in external API tests
      if (content.match(patterns.noSkipLogic) && 
          !content.includes('skipIfMissingEnv') && 
          !content.match(patterns.oldSkipLogic)) {
        issues.push('noSkipLogic');
      }
      
      if (issues.length > 0) {
        filesToFix.push({
          path: file,
          issues
        });
      }
    } catch (error) {
      console.error(chalk.red(`Error scanning ${file}: ${error.message}`));
    }
  }
  
  return filesToFix;
}

// Create a summary report
function createSummaryReport(filesToFix) {
  if (filesToFix.length === 0) {
    console.log(chalk.green('✔ No issues found in test files'));
    return;
  }
  
  console.log(chalk.yellow(`\nFound ${filesToFix.length} files with issues:`));
  
  // Group by issue type
  const issueTypes = {
    oldImports: [],
    directEnvAccess: [],
    oldSkipLogic: [],
    noSkipLogic: []
  };
  
  for (const file of filesToFix) {
    for (const issue of file.issues) {
      issueTypes[issue].push(file.path);
    }
  }
  
  // Print summary
  if (issueTypes.oldImports.length > 0) {
    console.log(chalk.yellow(`\n${issueTypes.oldImports.length} files with old environment imports:`));
    issueTypes.oldImports.forEach(file => console.log(`  ${file}`));
    console.log(chalk.green('  Fix: Replace with require("../loadEnv")'));
  }
  
  if (issueTypes.directEnvAccess.length > 0) {
    console.log(chalk.yellow(`\n${issueTypes.directEnvAccess.length} files with direct environment access:`));
    issueTypes.directEnvAccess.forEach(file => console.log(`  ${file}`));
    console.log(chalk.green('  Fix: Use testEnv.getTestConfig() instead of process.env'));
  }
  
  if (issueTypes.oldSkipLogic.length > 0) {
    console.log(chalk.yellow(`\n${issueTypes.oldSkipLogic.length} files with old skip logic:`));
    issueTypes.oldSkipLogic.forEach(file => console.log(`  ${file}`));
    console.log(chalk.green('  Fix: Replace with skipIfMissingEnv(this, "openai|supabase")'));
  }
  
  if (issueTypes.noSkipLogic.length > 0) {
    console.log(chalk.yellow(`\n${issueTypes.noSkipLogic.length} files missing skip logic for external APIs:`));
    issueTypes.noSkipLogic.forEach(file => console.log(`  ${file}`));
    console.log(chalk.green('  Fix: Add skipIfMissingEnv(this, "openai|supabase") in a before hook'));
  }
  
  console.log(chalk.cyan('\nYou can use the migrate-tests.js script to fix some of these issues:'));
  console.log(chalk.cyan('  node scripts/migrate-tests.js --fix'));
}

// Main function
async function main() {
  console.log(chalk.blue('=== Environment Migration Tool ==='));
  console.log(chalk.cyan('----------------------------------'));
  
  // Step 1: Check for .env.test file
  const hasEnvFile = ensureEnvFileExists();
  
  // Step 2: Check for old environment setup files
  checkOldEnvSetups();
  
  // Step 3: Scan test files for old patterns
  const filesToFix = scanTestFiles();
  
  // Step 4: Create summary report
  createSummaryReport(filesToFix);
  
  console.log(chalk.cyan('\n----------------------------------'));
}

main().catch(console.error); 