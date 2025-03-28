#!/usr/bin/env node

/**
 * Code Quality Enforcement Script
 * 
 * This script runs ESLint on the codebase to enforce code quality standards.
 * It generates reports on code quality issues and JSDoc coverage.
 * 
 * Usage:
 * - node scripts/enforce-code-quality.js               # Check code quality
 * - node scripts/enforce-code-quality.js --fix         # Fix issues where possible
 * - node scripts/enforce-code-quality.js --jsdoc-only  # Check JSDoc coverage only
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Config
const SOURCE_DIR = path.join(__dirname, '..', 'src');
const REPORT_DIR = path.join(__dirname, '..', 'reports');
const JSDOC_REPORT_PATH = path.join(REPORT_DIR, 'jsdoc-coverage.json');
const ESLINT_REPORT_PATH = path.join(REPORT_DIR, 'eslint-report.json');

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Parse command line arguments
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');
const jsdocOnly = args.includes('--jsdoc-only');

console.log(chalk.blue('=== Code Quality Enforcement ==='));

/**
 * Run ESLint on the codebase and generate reports
 */
function runEslint() {
  try {
    const fixFlag = shouldFix ? ' --fix' : '';
    
    console.log(chalk.yellow('Running ESLint...'));
    
    // Run ESLint and generate a JSON report
    execSync(
      `npx eslint src/ --ext .js --format json --output-file ${ESLINT_REPORT_PATH}${fixFlag}`,
      { stdio: 'inherit' }
    );
    
    console.log(chalk.green('ESLint completed. Report generated at: ') + ESLINT_REPORT_PATH);
  } catch (error) {
    // ESLint will exit with error code 1 if there are any linting errors
    console.log(chalk.red('ESLint found issues. Check the report for details.'));
  }
}

/**
 * Check JSDoc coverage in the codebase
 */
function checkJsDocCoverage() {
  try {
    console.log(chalk.yellow('Checking JSDoc coverage...'));
    
    // Run ESLint with only JSDoc rules enabled
    execSync(
      `npx eslint src/ --ext .js --no-eslintrc --parser-options=ecmaVersion:2022 ` +
      `--plugin jsdoc --rule 'jsdoc/require-jsdoc: ["warn", {"require": ` +
      `{"FunctionDeclaration": true, "MethodDefinition": true, "ClassDeclaration": true, ` +
      `"ArrowFunctionExpression": false, "FunctionExpression": false}}]' ` +
      `--format json --output-file ${JSDOC_REPORT_PATH}`,
      { stdio: 'pipe' }
    );
    
    // Parse the report
    const report = JSON.parse(fs.readFileSync(JSDOC_REPORT_PATH, 'utf8'));
    
    // Count issues
    let totalIssues = 0;
    let fileIssues = {};
    
    report.forEach(fileReport => {
      if (fileReport.messages.length > 0) {
        const jsdocIssues = fileReport.messages.filter(msg => 
          msg.ruleId && msg.ruleId.startsWith('jsdoc/')
        ).length;
        
        if (jsdocIssues > 0) {
          totalIssues += jsdocIssues;
          fileIssues[fileReport.filePath] = jsdocIssues;
        }
      }
    });
    
    // Generate summary
    console.log(chalk.green('\nJSDoc Coverage Summary:'));
    console.log('-------------------------');
    console.log(`Total JSDoc issues: ${totalIssues}`);
    
    if (totalIssues > 0) {
      console.log('\nTop files needing JSDoc improvements:');
      Object.entries(fileIssues)
        .sort((a, b) => b[1] - a[1])  // Sort by issue count (descending)
        .slice(0, 10)                  // Take top 10
        .forEach(([filePath, issueCount]) => {
          console.log(`${chalk.yellow(issueCount)} issues in ${path.relative(process.cwd(), filePath)}`);
        });
    }
    
    console.log(chalk.green('\nJSDoc coverage report generated at: ') + JSDOC_REPORT_PATH);
  } catch (error) {
    console.error(chalk.red('Error checking JSDoc coverage:'), error.message);
  }
}

/**
 * Count and analyze JSDoc comments in a file
 * @param {string} filePath - Path to the file
 * @returns {Object} Statistics about JSDoc coverage
 */
function analyzeJsDocInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let totalFunctions = 0;
    let documentedFunctions = 0;
    let totalClasses = 0;
    let documentedClasses = 0;
    
    // Extremely simple function and class detection (for demonstration purposes)
    let inJsDoc = false;
    let jsDocLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for JSDoc start
      if (line.startsWith('/**')) {
        inJsDoc = true;
        jsDocLines = [line];
        continue;
      }
      
      // Collect JSDoc lines
      if (inJsDoc) {
        jsDocLines.push(line);
        // Check for JSDoc end
        if (line.endsWith('*/')) {
          inJsDoc = false;
          continue;
        }
      }
      
      // If we just ended a JSDoc block, check what follows
      if (!inJsDoc && jsDocLines.length > 0 && jsDocLines[jsDocLines.length - 1].endsWith('*/')) {
        // Look ahead for function or class definition
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine.startsWith('function ') || nextLine.includes('= function(') ||
              nextLine.includes('=> {') || nextLine.includes('async function')) {
            totalFunctions++;
            documentedFunctions++;
          } else if (nextLine.startsWith('class ')) {
            totalClasses++;
            documentedClasses++;
          }
        }
        jsDocLines = [];
      } else {
        // Check for undocumented functions/classes
        if (line.startsWith('function ') || line.includes('= function(') ||
            line.includes('=> {') || line.includes('async function')) {
          totalFunctions++;
        } else if (line.startsWith('class ')) {
          totalClasses++;
        }
      }
    }
    
    return {
      totalFunctions,
      documentedFunctions,
      totalClasses,
      documentedClasses,
      functionCoverage: totalFunctions ? (documentedFunctions / totalFunctions) * 100 : 100,
      classCoverage: totalClasses ? (documentedClasses / totalClasses) * 100 : 100
    };
  } catch (error) {
    console.error(`Error analyzing file ${filePath}:`, error.message);
    return null;
  }
}

// Execute
if (!jsdocOnly) {
  runEslint();
}
checkJsDocCoverage();

console.log(chalk.blue('\nDone!')); 