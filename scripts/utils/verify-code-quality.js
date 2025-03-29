#!/usr/bin/env node
/**
 * Verify Code Quality
 * 
 * Script to identify code quality issues in the codebase:
 * - Inconsistent naming conventions
 * - Typos in comments, function names, and variable names
 * - Duplicated async keywords and other common mistakes
 * - Direct access to process.env outside config files
 * - Console.log usage in production code
 * - Hard-coded API keys or sensitive values
 * - Missing function documentation
 */

'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Configuration
const rootDir = path.join(__dirname, '../..');
const srcDir = path.join(rootDir, 'src');
const excludeDirs = ['node_modules', 'dist', 'build', '.git', 'migrations', 'reports', 'logs', 'dev-scripts'];
const jsExtensions = ['.js', '.jsx', '.ts', '.tsx'];

// Common typographical errors to check for
const commonTypos = [
  { pattern: /async\s+async/, message: 'Duplicated `async` keyword' },
  { pattern: /fucntion/, message: 'Typo: "fucntion" should be "function"' },
  { pattern: /contructor/, message: 'Typo: "contructor" should be "constructor"' },
  { pattern: /require\(.*\/errorHandler'\);?/i, message: 'Incorrect case: Should be ErrorHandler.js' },
  { pattern: /return await\s+Promise\.resolve/, message: 'Unnecessary await with Promise.resolve' },
  { pattern: /await\s+this\.(get|set)/, message: 'Likely missing await for async cache operations' }
];

// Code smells to identify
const codeSmells = [
  { 
    pattern: /console\.(log|warn|error|debug|info)\(/, 
    message: 'Direct `console` usage detected. Use injected logger.',
    type: 'BEST_PRACTICE',
    excludeFiles: ['src/config/logger.js', 'src/core/infra/logging/']
  },
  { 
    pattern: /require\(.*container'\)/, 
    message: 'Direct container import detected. Use dependency injection.',
    type: 'DI_VIOLATION',
    excludeFiles: ['src/config/container.js', 'src/config/container/index.js'] 
  },
  { 
    pattern: /process\.env\.([A-Z_]+)/, 
    message: 'Direct `process.env` access detected. Use config service.',
    type: 'CONFIG_VIOLATION',
    excludeFiles: ['src/config/config.js', 'src/core/infra/db/'] 
  },
  {
    pattern: /(password|apikey|secret|token)\s*[:=]\s*['"`][^'"`]+['"`]/i,
    message: 'Potential hardcoded secret detected',
    type: 'SECURITY',
    excludeFiles: ['test/', 'tests/', 'example/', 'config.example.js']
  }
];

// Issues found during scanning
const issues = [];

/**
 * Finds all JavaScript/TypeScript files in a directory recursively
 * @param {string} dir - Directory to search
 * @returns {Promise<string[]>} Array of file paths
 */
async function findJsFiles(dir) {
  const files = [];
  
  /**
   *
   */
  async function scan(directory) {
    try {
      const entries = await fs.promises.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name)) {
            await scan(fullPath);
          }
        } else if (entry.isFile() && jsExtensions.includes(path.extname(entry.name))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore errors like permission denied for certain directories
      if (error.code !== 'EACCES' && error.code !== 'ENOENT') {
        console.warn(chalk.yellow(`Could not scan directory: ${directory} - ${error.message}`));
      }
    }
  }
  
  await scan(dir);
  return files;
}

/**
 * Checks if a file should be excluded from a particular check
 * @param {string} filePath - Path to the file
 * @param {string[]} excludePatterns - Patterns to exclude
 * @returns {boolean} True if file should be excluded
 */
function shouldExcludeFile(filePath, excludePatterns) {
  if (!excludePatterns) {
    return false;
  }
  
  const relativePath = path.relative(rootDir, filePath);
  return excludePatterns.some(pattern => 
    relativePath.includes(pattern) || filePath.includes(pattern)
  );
}

/**
 * Examines a file for code quality issues
 * @param {string} filePath - Path to the file
 */
async function examineFile(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const relativePath = path.relative(rootDir, filePath);
    
    // Check for typos
    commonTypos.forEach(typo => {
      lines.forEach((line, index) => {
        if (typo.pattern.test(line)) {
          issues.push({
            file: relativePath,
            line: index + 1,
            type: 'TYPO',
            message: typo.message,
            sample: line.trim()
          });
        }
      });
    });
    
    // Check for code smells
    codeSmells.forEach(smell => {
      // Check if the file should be excluded for this specific smell
      if (shouldExcludeFile(filePath, smell.excludeFiles)) {
        return;
      }
      
      lines.forEach((line, index) => {
        // Skip commented lines
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          return;
        }
        
        if (smell.pattern.test(line)) {
          issues.push({
            file: relativePath,
            line: index + 1,
            type: smell.type || 'CODE_SMELL',
            message: smell.message,
            sample: line.trim()
          });
        }
      });
    });
    
    // Check for missing JSDoc on method declarations (more accurate detection)
    const functionRegex = /^(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|class\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function|\s*(\w+)\s*[:=]\s*(?:async\s+)?function|\s*(\w+)\s*\([^)]*\)\s*{)/gm;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1] || match[2] || match[3] || match[4] || match[5];
      if (!functionName || functionName === 'constructor') {
        continue;
      }
      
      const position = match.index;
      const lineNumber = content.substring(0, position).split('\n').length;
      
      // Check if there's a JSDoc block before this method
      const precedingText = content.substring(Math.max(0, position - 200), position);
      if (!precedingText.trim().endsWith('*/')) {
        issues.push({
          file: relativePath,
          line: lineNumber,
          type: 'DOCS',
          message: `Missing JSDoc for function/method '${functionName}'`,
          sample: match[0].trim()
        });
      }
    }
    
  } catch (error) {
    console.error(chalk.red(`Error examining file ${filePath}:`), error.message);
  }
}

/**
 * Scans the codebase for issues and prints a report
 * @param {Object} options - Scan options
 * @param {boolean} options.fixable - Only show fixable issues
 * @param {boolean} options.jsdocOnly - Only show JSDoc issues
 */
async function scanCodebase(options = {}) {
  console.log(chalk.blue.bold('=== Code Quality Verification ==='));
  
  // Find all JS files
  const files = await findJsFiles(srcDir);
  console.log(chalk.cyan(`🔍 Scanning ${files.length} JavaScript files...`));
  
  // Examine each file
  for (const file of files) {
    await examineFile(file);
  }
  
  // Filter issues based on options
  let filteredIssues = issues;
  if (options.jsdocOnly) {
    filteredIssues = issues.filter(issue => issue.type === 'DOCS');
  } else if (options.fixable) {
    filteredIssues = issues.filter(issue => issue.type === 'TYPO' || issue.type === 'BEST_PRACTICE');
  }
  
  // Group issues by file
  const issuesByFile = {};
  filteredIssues.forEach(issue => {
    if (!issuesByFile[issue.file]) {
      issuesByFile[issue.file] = [];
    }
    issuesByFile[issue.file].push(issue);
  });
  
  // Print report
  console.log(chalk.cyan('\n=== Verification Report ==='));
  
  if (filteredIssues.length === 0) {
    console.log(chalk.green.bold('✅ No code quality issues detected!'));
    return;
  }
  
  console.log(chalk.yellow.bold(`⚠️ Found ${filteredIssues.length} potential issues:`));
  
  Object.entries(issuesByFile).forEach(([file, fileIssues]) => {
    console.log(`\n📄 ${chalk.yellow(file)}`);
    
    fileIssues.forEach(issue => {
      let color;
      switch (issue.type) {
        case 'TYPO': color = chalk.red; break;
        case 'SECURITY': color = chalk.red.bold; break;
        case 'DOCS': color = chalk.magenta; break;
        case 'DI_VIOLATION': color = chalk.yellow; break;
        case 'CONFIG_VIOLATION': color = chalk.yellow; break;
        case 'BEST_PRACTICE': color = chalk.blue; break;
        default: color = chalk.gray;
      }
      
      console.log(`   ${chalk.gray(`L${issue.line}:`)} ${color(`[${issue.type}]`)} ${issue.message}`);
      console.log(`     ${chalk.dim(issue.sample)}`);
    });
  });
  
  // Print recommendations
  console.log(chalk.cyan('\nRecommendations:'));
  if (filteredIssues.some(i => i.type === 'TYPO')) {
    console.log(chalk.yellow('• Fix typos in comments and function names'));
  }
  if (filteredIssues.some(i => i.type === 'DOCS')) {
    console.log(chalk.yellow('• Add missing JSDoc documentation to functions and methods'));
  }
  if (filteredIssues.some(i => i.type === 'DI_VIOLATION' || i.type === 'CONFIG_VIOLATION')) {
    console.log(chalk.yellow('• Use the dependency injection pattern consistently'));
  }
  if (filteredIssues.some(i => i.type === 'BEST_PRACTICE')) {
    console.log(chalk.yellow('• Replace direct console usage with the logger service'));
  }
  if (filteredIssues.some(i => i.type === 'SECURITY')) {
    console.log(chalk.red.bold('• Remove hardcoded secrets and credentials'));
  }
  
  console.log(chalk.cyan('\nTo fix issues:'));
  console.log(chalk.yellow('• Run ESLint: npm run lint'));
  console.log(chalk.yellow('• Run Prettier: npm run format'));
  console.log(chalk.yellow('• For specific issues: npm run quality:fix'));
}

// Process command line arguments
const args = process.argv.slice(2);
const options = {
  fixable: args.includes('--fixable') || args.includes('-f'),
  jsdocOnly: args.includes('--jsdoc-only') || args.includes('-j'),
};

// Run the scanner
scanCodebase(options).catch(error => {
  console.error(chalk.red('An error occurred during code scanning:'), error);
  process.exit(1);
}); 