#!/usr/bin/env node

/**
 * Verify Event Migration Script
 * 
 * This script scans the codebase to identify any remaining instances of direct event publishing
 * and provides a report to help verify the migration to entity-based event collection.
 * 
 * Usage:
 *   node scripts/verify-event-migration.js [options]
 * 
 * Options:
 *   --verbose       Show detailed logging
 *   --exclude=GLOB  Exclude files matching the glob pattern (can be used multiple times)
 *   --help          Show help
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const options = {
  verbose: process.argv.includes('--verbose'),
  help: process.argv.includes('--help'),
  excludePatterns: []
};

// Extract exclude patterns from arguments
process.argv.forEach(arg => {
  if (arg.startsWith('--exclude=')) {
    options.excludePatterns.push(arg.split('=')[1]);
  }
});

// Create logger
const log = {
  info: (message) => console.log(`INFO: ${message}`),
  success: (message) => console.log(`SUCCESS: ${message}`),
  error: (message) => console.error(`ERROR: ${message}`),
  warn: (message) => console.warn(`WARNING: ${message}`),
  verbose: (message) => options.verbose && console.log(`VERBOSE: ${message}`)
};

// Show help if requested
if (options.help) {
  console.log(`
Verify Event Migration Script

This script scans the codebase to identify any remaining instances of direct event publishing
and provides a report to help verify the migration to entity-based event collection.

Usage:
  node scripts/verify-event-migration.js [options]

Options:
  --verbose       Show detailed logging
  --exclude=GLOB  Exclude files matching the glob pattern (can be used multiple times)
  --help          Show help
  `);
  process.exit(0);
}

// Define the patterns to search for
const eventPublishingPatterns = [
  {
    name: 'Direct EventBus.publish',
    pattern: /eventBus\.publish\s*\(\s*(['"][A-Z_]+['"]|EventTypes\.[A-Z_]+)/g,
    severity: 'high'
  },
  {
    name: 'Direct this.eventBus.publish',
    pattern: /this\.eventBus\.publish\s*\(\s*(['"][A-Z_]+['"]|this\.EventTypes\.[A-Z_]+|EventTypes\.[A-Z_]+)/g,
    severity: 'high'
  },
  {
    name: 'Direct EventBus.publishEvent',
    pattern: /eventBus\.publishEvent\s*\(\s*(['"][A-Z_]+['"]|EventTypes\.[A-Z_]+)/g,
    severity: 'high'
  },
  {
    name: 'Direct this.eventBus.publishEvent',
    pattern: /this\.eventBus\.publishEvent\s*\(\s*(['"][A-Z_]+['"]|this\.EventTypes\.[A-Z_]+|EventTypes\.[A-Z_]+)/g,
    severity: 'high'
  },
  {
    name: 'Direct DomainEvents.publish',
    pattern: /domainEvents\.publish\s*\(/g,
    severity: 'high'
  },
  {
    name: 'Custom publish method',
    pattern: /publish[A-Z][a-zA-Z]+\s*\(\s*(['"][A-Z_]+['"]|EventTypes\.[A-Z_]+)/g,
    severity: 'medium'
  }
];

// Create stats object
const stats = {
  totalFiles: 0,
  scannedFiles: 0,
  filesWithIssues: 0,
  totalIssues: 0,
  issuesByPattern: {},
  issuesBySeverity: {
    high: 0,
    medium: 0,
    low: 0
  },
  fileDetails: []
};

// Initialize issue counts by pattern
eventPublishingPatterns.forEach(pattern => {
  stats.issuesByPattern[pattern.name] = 0;
});

// Timestamp for report
const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');

/**
 * Find files to scan
 * @returns {Promise<string[]>} Array of file paths
 */
async function findFilesToScan() {
  return new Promise((resolve, reject) => {
    const pattern = 'src/**/*.js';
    log.info(`Searching for files to scan: ${pattern}`);
    
    glob(pattern).then(files => {
      // Filter out excluded files
      if (options.excludePatterns.length > 0) {
        log.verbose(`Applying exclude patterns: ${options.excludePatterns.join(', ')}`);
        
        const excludeFiles = options.excludePatterns.map(pattern => glob.sync(pattern)).flat();
        log.verbose(`Found ${excludeFiles.length} files to exclude`);
        
        files = files.filter(file => !excludeFiles.includes(file));
      }
      
      stats.totalFiles = files.length;
      log.info(`Found ${files.length} files to scan`);
      resolve(files);
    }).catch(err => {
      log.error(`Failed to find files: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Scan a file for direct event publishing
 * @param {string} filePath - Path to the file
 */
async function scanFile(filePath) {
  try {
    stats.scannedFiles++;
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for each pattern
    const fileIssues = [];
    
    for (const patternInfo of eventPublishingPatterns) {
      const matches = [...content.matchAll(patternInfo.pattern)];
      
      if (matches.length > 0) {
        // Find line numbers for matches
        const lines = content.split('\n');
        
        for (const match of matches) {
          // Find line number by counting newlines
          const positionUpToMatch = content.substring(0, match.index);
          const lineNumber = positionUpToMatch.split('\n').length;
          
          // Get the line content
          const line = lines[lineNumber - 1];
          
          fileIssues.push({
            pattern: patternInfo.name,
            severity: patternInfo.severity,
            line: lineNumber,
            match: match[0],
            context: line.trim()
          });
          
          // Update statistics
          stats.totalIssues++;
          stats.issuesByPattern[patternInfo.name]++;
          stats.issuesBySeverity[patternInfo.severity]++;
        }
      }
    }
    
    if (fileIssues.length > 0) {
      stats.filesWithIssues++;
      
      stats.fileDetails.push({
        file: filePath,
        issueCount: fileIssues.length,
        issues: fileIssues
      });
      
      log.verbose(`Found ${fileIssues.length} issues in ${filePath}`);
    }
  } catch (error) {
    log.error(`Error scanning file ${filePath}: ${error.message}`);
  }
}

/**
 * Generate a markdown report
 * @returns {string} Markdown report
 */
function generateMarkdownReport() {
  const report = [];
  
  report.push('# Event Migration Verification Report');
  report.push(`\nGenerated: ${new Date().toLocaleString()}\n`);
  
  report.push('## Summary\n');
  report.push(`- Total files scanned: ${stats.scannedFiles}`);
  report.push(`- Files with direct event publishing: ${stats.filesWithIssues}`);
  report.push(`- Total instances found: ${stats.totalIssues}`);
  report.push('');
  
  report.push('## Issues by Severity\n');
  report.push(`- High: ${stats.issuesBySeverity.high}`);
  report.push(`- Medium: ${stats.issuesBySeverity.medium}`);
  report.push(`- Low: ${stats.issuesBySeverity.low}`);
  report.push('');
  
  report.push('## Issues by Pattern\n');
  for (const patternName in stats.issuesByPattern) {
    report.push(`- ${patternName}: ${stats.issuesByPattern[patternName]}`);
  }
  report.push('');
  
  // Sort files by issue count (descending)
  const sortedFiles = [...stats.fileDetails].sort((a, b) => b.issueCount - a.issueCount);
  
  report.push('## Files with Direct Event Publishing\n');
  for (const fileInfo of sortedFiles) {
    report.push(`### ${fileInfo.file} (${fileInfo.issueCount} issues)\n`);
    
    // Group issues by pattern
    const issuesByPattern = {};
    for (const issue of fileInfo.issues) {
      if (!issuesByPattern[issue.pattern]) {
        issuesByPattern[issue.pattern] = [];
      }
      issuesByPattern[issue.pattern].push(issue);
    }
    
    for (const pattern in issuesByPattern) {
      report.push(`#### ${pattern}\n`);
      
      for (const issue of issuesByPattern[pattern]) {
        report.push(`- Line ${issue.line}: \`${issue.context}\``);
      }
      report.push('');
    }
  }
  
  report.push('## Recommendations\n');
  report.push('Files with high severity issues should be prioritized for migration.');
  report.push('Use the migration scripts to automatically update these files:');
  report.push('');
  report.push('```bash');
  report.push('# Update service files');
  report.push('node scripts/update-services.js');
  report.push('');
  report.push('# Update coordinator files');
  report.push('node scripts/update-coordinators.js');
  report.push('```');
  
  return report.join('\n');
}

/**
 * Generate a JSON report
 * @returns {object} JSON report
 */
function generateJsonReport() {
  return {
    timestamp,
    summary: {
      totalFiles: stats.totalFiles,
      scannedFiles: stats.scannedFiles,
      filesWithIssues: stats.filesWithIssues,
      totalIssues: stats.totalIssues
    },
    issuesByPattern: stats.issuesByPattern,
    issuesBySeverity: stats.issuesBySeverity,
    fileDetails: stats.fileDetails
  };
}

/**
 * Save reports to files
 */
function saveReports() {
  try {
    const reportDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    // Save markdown report
    const mdReportPath = path.join(reportDir, `event-migration-verification-${timestamp}.md`);
    fs.writeFileSync(mdReportPath, generateMarkdownReport(), 'utf-8');
    
    // Save JSON report
    const jsonReportPath = path.join(reportDir, `event-migration-verification-${timestamp}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(generateJsonReport(), null, 2), 'utf-8');
    
    log.info(`Markdown report saved to: ${mdReportPath}`);
    log.info(`JSON report saved to: ${jsonReportPath}`);
    
    return { mdReportPath, jsonReportPath };
  } catch (error) {
    log.error(`Failed to save reports: ${error.message}`);
    return null;
  }
}

/**
 * Main script function
 */
async function main() {
  console.log(`\nVerify Event Migration Script\n`);
  
  try {
    // Find files to scan
    const files = await findFilesToScan();
    
    // Scan each file
    log.info('Scanning files...');
    for (const filePath of files) {
      await scanFile(filePath);
    }
    
    // Print summary
    console.log('\nSummary:');
    console.log(`Files scanned: ${stats.scannedFiles}`);
    console.log(`Files with direct event publishing: ${stats.filesWithIssues}`);
    console.log(`Total instances found: ${stats.totalIssues}`);
    
    if (stats.filesWithIssues > 0) {
      console.log('\nIssues by severity:');
      console.log(`High: ${stats.issuesBySeverity.high}`);
      console.log(`Medium: ${stats.issuesBySeverity.medium}`);
      console.log(`Low: ${stats.issuesBySeverity.low}`);
      
      console.log('\nTop files with issues:');
      // Show top 5 files by issue count
      const topFiles = [...stats.fileDetails]
        .sort((a, b) => b.issueCount - a.issueCount)
        .slice(0, 5);
      
      for (const fileInfo of topFiles) {
        console.log(`- ${fileInfo.file}: ${fileInfo.issueCount} issues`);
      }
    } else {
      console.log('\nNo direct event publishing found! Migration complete.');
    }
    
    // Save reports
    const reportPaths = saveReports();
    if (reportPaths) {
      console.log(`\nDetailed reports saved to:`);
      console.log(`- Markdown: ${reportPaths.mdReportPath}`);
      console.log(`- JSON: ${reportPaths.jsonReportPath}`);
    }
    
    console.log(`\nDone!\n`);
  } catch (error) {
    log.error(`Script failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main(); 