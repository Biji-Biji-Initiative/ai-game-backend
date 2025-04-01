#!/usr/bin/env node

/**
 * Value Object Usage Audit Script
 * 
 * This script scans the codebase for methods that use value objects and identifies
 * patterns that need to be standardized according to our Value Object Usage Guide.
 * 
 * It searches for:
 * 1. Methods that extract .value from value objects unnecessarily
 * 2. Methods that don't follow the standardized naming pattern
 * 3. Methods that don't handle both primitive and VO parameters
 * 
 * Usage: node valueObjectAudit.js [--fix]
 * 
 * Options:
 * --fix: Generate suggestions for fixing issues (not implemented yet)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use fs.promises instead of promisify
const { readFile, readdir, stat } = fs.promises;

// Value object types to look for
const VALUE_OBJECT_TYPES = [
  'Email', 
  'UserId', 
  'ChallengeId', 
  'FocusArea', 
  'DifficultyLevel', 
  'TraitScore'
];

// Patterns to identify issues
const EXTRACT_VALUE_PATTERN = /([a-zA-Z]+)VO\.value/g;
const CREATE_VO_PATTERN = new RegExp(`create(${VALUE_OBJECT_TYPES.join('|')})\\(([^)]+)\\)`, 'g');
const MIXED_PARAM_PATTERN = new RegExp(`(instanceof|===) (${VALUE_OBJECT_TYPES.join('|')})`, 'g');

// Directories to scan
const DIRECTORIES_TO_SCAN = [
  'src/core',
  'src/application'
];

// Files to ignore
const IGNORE_FILES = [
  'valueObjectAudit.js',
  'index.js',
  'test.js',
  '.test.js',
  '.spec.js'
];

/**
 * Check if a file should be scanned
 * @param {string} filename - File name
 * @returns {boolean} True if the file should be scanned
 */
function shouldScanFile(filename) {
  if (!filename.endsWith('.js')) return false;
  
  return !IGNORE_FILES.some(ignorePattern => 
    ignorePattern.startsWith('.') 
      ? filename.endsWith(ignorePattern)
      : filename === ignorePattern
  );
}

/**
 * Recursively scan directories for JS files
 * @param {string} dir - Directory to scan
 * @returns {Promise<string[]>} List of file paths
 */
async function findJsFiles(dir) {
  const files = [];
  const entries = await readdir(dir);
  
  for (const entry of entries) {
    const entryPath = path.join(dir, entry);
    const stats = await stat(entryPath);
    
    if (stats.isDirectory()) {
      const subFiles = await findJsFiles(entryPath);
      files.push(...subFiles);
    } else if (stats.isFile() && shouldScanFile(entry)) {
      files.push(entryPath);
    }
  }
  
  return files;
}

/**
 * Extract method signatures from file content
 * @param {string} content - File content
 * @returns {Array<Object>} Array of method info objects
 */
function extractMethodSignatures(content) {
  const methods = [];
  const methodRegex = /(?:async\s+)?([a-zA-Z][a-zA-Z0-9]*)\s*\(([^)]*)\)\s*{/g;
  
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    const [fullMatch, methodName, paramsStr] = match;
    
    // Skip constructor and private methods
    if (methodName === 'constructor' || methodName.startsWith('_')) {
      continue;
    }
    
    // Extract parameter names
    const params = paramsStr.split(',')
      .map(param => param.trim())
      .filter(Boolean)
      .map(param => {
        // Handle default values or destructuring
        const parts = param.split('=')[0].trim();
        return parts.replace(/\{.*\}/, '').trim();
      });
    
    methods.push({
      methodName,
      params,
      startPos: match.index,
      endPos: match.index + fullMatch.length
    });
  }
  
  return methods;
}

/**
 * Analyze file for value object usage
 * @param {string} filePath - Path to file
 * @param {string} content - File content
 * @returns {Array<Object>} Array of issues found
 */
function analyzeFile(filePath, content) {
  const issues = [];
  const methods = extractMethodSignatures(content);
  
  // Check for value extraction
  let match;
  while ((match = EXTRACT_VALUE_PATTERN.exec(content)) !== null) {
    issues.push({
      type: 'extractValue',
      filePath,
      line: getLineNumber(content, match.index),
      message: `Unnecessary extraction of .value from ${match[1]}VO`,
      context: content.substring(Math.max(0, match.index - 50), match.index + 50)
    });
  }
  
  // Check methods that handle value objects
  for (const method of methods) {
    const methodBody = content.substring(
      method.startPos, 
      content.indexOf('}', method.endPos) + 1
    );
    
    // Look for methods that check for value object types
    if (MIXED_PARAM_PATTERN.test(methodBody)) {
      // Check if method follows naming conventions
      const usesOrVOPattern = method.params.some(param => 
        param.includes('OrVO') || 
        (param.includes('Id') && !param.endsWith('Id'))
      );
      
      if (!usesOrVOPattern) {
        issues.push({
          type: 'namingPattern',
          filePath,
          methodName: method.methodName,
          line: getLineNumber(content, method.startPos),
          message: `Method handles both primitive and VO but doesn't use OrVO naming pattern`,
          params: method.params.join(', ')
        });
      }
      
      // Look for standard VO conversion pattern
      const hasConversionPattern = CREATE_VO_PATTERN.test(methodBody);
      if (!hasConversionPattern) {
        issues.push({
          type: 'conversionPattern',
          filePath,
          methodName: method.methodName,
          line: getLineNumber(content, method.startPos),
          message: `Method doesn't use standard VO conversion pattern`,
          params: method.params.join(', ')
        });
      }
    }
  }
  
  return issues;
}

/**
 * Get line number for a position in content
 * @param {string} content - File content
 * @param {number} position - Position in content
 * @returns {number} Line number
 */
function getLineNumber(content, position) {
  const lines = content.substring(0, position).split('\n');
  return lines.length;
}

/**
 * Print issues in a formatted way
 * @param {Array<Object>} issues - Array of issues
 */
function printIssues(issues) {
  if (issues.length === 0) {
    console.log('No issues found!');
    return;
  }
  
  console.log(`Found ${issues.length} issues:`);
  console.log('----------------------------\n');
  
  // Group issues by file
  const issuesByFile = issues.reduce((acc, issue) => {
    const filePath = issue.filePath;
    if (!acc[filePath]) {
      acc[filePath] = [];
    }
    acc[filePath].push(issue);
    return acc;
  }, {});
  
  // Print issues by file
  for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
    console.log(`\x1b[1m${filePath}\x1b[0m`);
    
    for (const issue of fileIssues) {
      console.log(`  Line ${issue.line}: \x1b[33m${issue.message}\x1b[0m`);
      if (issue.methodName) {
        console.log(`    Method: ${issue.methodName}(${issue.params})`);
      }
      if (issue.context) {
        console.log(`    Context: "${issue.context.replace(/\n/g, ' ')}"`);
      }
    }
    
    console.log('');
  }
}

/**
 * Main function
 */
async function main() {
  const rootDir = path.resolve(__dirname, '../..');
  const allIssues = [];
  
  console.log('Scanning for Value Object usage issues...');
  
  for (const dir of DIRECTORIES_TO_SCAN) {
    const dirPath = path.join(rootDir, dir);
    const files = await findJsFiles(dirPath);
    
    console.log(`Scanning ${files.length} files in ${dir}...`);
    
    for (const file of files) {
      const content = await readFile(file, 'utf8');
      const issues = analyzeFile(file, content);
      
      if (issues.length > 0) {
        allIssues.push(...issues);
      }
    }
  }
  
  printIssues(allIssues);
  
  console.log('\nAudit complete. Check src/core/common/VALUE_OBJECT_USAGE_GUIDE.md for guidance on fixing these issues.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 