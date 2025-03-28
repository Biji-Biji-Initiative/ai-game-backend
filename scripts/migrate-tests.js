#!/usr/bin/env node
/**
 * Test Migration Script
 * 
 * This script helps migrate test files from old formats to the new structure.
 * It analyzes test files and suggests changes to make them conform to the new standards.
 * 
 * Usage:
 *   node scripts/migrate-tests.js [options] [file-pattern]
 * 
 * Examples:
 *   node scripts/migrate-tests.js                         # Analyze all test files
 *   node scripts/migrate-tests.js --fix                   # Fix all test files
 *   node scripts/migrate-tests.js tests/external/*.test.js # Analyze specific tests
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');

// Configuration
const autoFix = process.argv.includes('--fix');
const filePattern = process.argv.find(arg => !arg.startsWith('-') && arg !== process.argv[0] && arg !== process.argv[1]) || 'tests/**/*.test.js';

// Test patterns to look for
const patterns = {
  directOpenaiConstructor: /new\s+OpenAI\s*\(/g,
  // Direct process.env usage without testEnv
  directEnvUsage: /process\.env\.OPENAI_API_KEY|process\.env\.SUPABASE/g,
  // Old test.env or setupTestEnv calls
  oldSetupEnv: /require\(['"]\.\.\/test\.env['"]\)|require\(['"]\.\.\/setup\/testEnv['"]\)|setupTestEnv|test\.env/g,
  // Inconsistent assertion styles (Jest vs Chai)
  jestAssertions: /expect\([^)]*\)\.toBe|expect\([^)]*\)\.toEqual|expect\([^)]*\)\.toMatch/g,
  // Missing or inconsistent skip logic
  inconsistentSkip: /this\.skip\(\)|it\.skip\(|describe\.skip\(/g,
  // No timeout set for API tests
  missingTimeout: /describe\(['"][^'"]*API|OpenAI|Supabase[^'"]*['"],\s*function\(\)\s*{/g,
  noTimeoutSet: /this\.timeout\(\d+\)/g
};

// Fixes for common issues
const fixes = {
  directOpenaiConstructor: (content) => {
    return content.replace(
      /const\s+{\s*OpenAI\s*}\s*=\s*require\(['"]openai['"]\)/g,
      "const { OpenAIClient } = require('../../src/infra/openai')"
    ).replace(
      /new\s+OpenAI\s*\(\s*{\s*apiKey\s*:\s*([^}]+)\s*}\s*\)/g,
      "new OpenAIClient({ apiKey: $1 })"
    );
  },
  directEnvUsage: (content) => {
    // First add testEnv import if missing
    let updatedContent = content;
    if (!content.includes("require('../loadEnv')")) {
      updatedContent = updatedContent.replace(
        /(const[^;]*require[^;]*;(\s*)?)+/,
        "$&\nconst testEnv = require('../loadEnv');\n"
      );
    }
    
    // Then replace direct env usage with testEnv
    return updatedContent.replace(
      /process\.env\.OPENAI_API_KEY/g,
      "testEnv.getTestConfig().openai.apiKey"
    ).replace(
      /process\.env\.SUPABASE_URL/g,
      "testEnv.getTestConfig().supabase.url"
    ).replace(
      /process\.env\.SUPABASE_KEY/g,
      "testEnv.getTestConfig().supabase.key"
    );
  },
  oldSetupEnv: (content) => {
    // Remove old env setup imports
    return content.replace(
      /require\(['"]\.\.\/test\.env['"]\);?(\s*)?/g,
      ""
    ).replace(
      /require\(['"]\.\.\/setup\/testEnv['"]\);?(\s*)?/g,
      ""
    );
  },
  jestAssertions: (content) => {
    // Convert Jest assertions to Chai
    return content.replace(
      /expect\(([^)]*)\)\.toBe\(([^)]*)\)/g,
      "expect($1).to.equal($2)"
    ).replace(
      /expect\(([^)]*)\)\.toEqual\(([^)]*)\)/g,
      "expect($1).to.deep.equal($2)"
    ).replace(
      /expect\(([^)]*)\)\.toMatch\(([^)]*)\)/g,
      "expect($1).to.match($2)"
    );
  },
  inconsistentSkip: (content) => {
    // Add proper skip logic using testHelpers
    let updatedContent = content;
    
    // Add the helper import if needed
    if (!content.includes("skipIfMissingEnv")) {
      updatedContent = updatedContent.replace(
        /(const[^;]*require[^;]*;(\s*)?)+/,
        "$&\nconst { skipIfMissingEnv } = require('../../tests/helpers/testHelpers');\n"
      );
    }
    
    // Add skip logic for OpenAI or Supabase tests
    if (content.includes("OpenAI") && !content.includes("skipIfMissingEnv")) {
      updatedContent = updatedContent.replace(
        /(describe\([^{]+{(\s*)?)/,
        "$1\n  before(function() {\n    skipIfMissingEnv(this, 'openai');\n  });\n\n"
      );
    } else if (content.includes("Supabase") && !content.includes("skipIfMissingEnv")) {
      updatedContent = updatedContent.replace(
        /(describe\([^{]+{(\s*)?)/,
        "$1\n  before(function() {\n    skipIfMissingEnv(this, 'supabase');\n  });\n\n"
      );
    }
    
    return updatedContent;
  },
  missingTimeout: (content) => {
    if (content.match(patterns.missingTimeout) && !content.match(patterns.noTimeoutSet)) {
      return content.replace(
        /(describe\([^{]+{(\s*)?)/,
        "$1\n  // Set longer timeout for API calls\n  this.timeout(30000);\n\n"
      );
    }
    return content;
  }
};

// Analyze a file
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Check for each pattern
  for (const [key, pattern] of Object.entries(patterns)) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      issues.push({
        type: key,
        count: matches.length,
        fix: fixes[key]
      });
    }
  }
  
  return {
    path: filePath,
    content,
    issues
  };
}

// Fix a file
function fixFile(analysis) {
  let updatedContent = analysis.content;
  
  for (const issue of analysis.issues) {
    if (issue.fix) {
      updatedContent = issue.fix(updatedContent);
    }
  }
  
  // Only write the file if it's changed
  if (updatedContent !== analysis.content) {
    fs.writeFileSync(analysis.path, updatedContent);
    return true;
  }
  
  return false;
}

// Main function
async function main() {
  console.log(chalk.blue('=== Test Migration Tool ==='));
  console.log(chalk.cyan(`Mode: ${autoFix ? 'Fix' : 'Analyze'}`));
  console.log(chalk.cyan(`Pattern: ${filePattern}`));
  console.log(chalk.cyan('-----------------------------'));
  
  // Find all test files
  const files = glob.sync(filePattern);
  console.log(`Found ${files.length} test files to analyze.`);
  
  let totalIssues = 0;
  let totalFixed = 0;
  
  // Process each file
  for (const file of files) {
    const analysis = analyzeFile(file);
    
    if (analysis.issues.length > 0) {
      totalIssues += analysis.issues.length;
      
      console.log(chalk.yellow(`\nIssues in ${analysis.path}:`));
      for (const issue of analysis.issues) {
        console.log(`  - ${chalk.red(issue.type)}: ${issue.count} occurrences`);
      }
      
      if (autoFix) {
        const wasFixed = fixFile(analysis);
        if (wasFixed) {
          console.log(chalk.green('  Fixed!'));
          totalFixed++;
        } else {
          console.log(chalk.yellow('  No automatic fixes available.'));
        }
      }
    }
  }
  
  console.log(chalk.cyan('\n-----------------------------'));
  console.log(`Total issues found: ${totalIssues}`);
  if (autoFix) {
    console.log(`Files fixed: ${totalFixed}`);
  } else if (totalIssues > 0) {
    console.log(chalk.green('\nRun with --fix to attempt automatic fixes:'));
    console.log(chalk.green(`node scripts/migrate-tests.js --fix ${filePattern}`));
  }
}

main().catch(console.error); 