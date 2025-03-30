#!/usr/bin/env node

/**
 * Script to generate a final report about the test cleanup
 * This summarizes what we did and the results
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// File paths
const logsDir = path.join(projectRoot, 'logs');
const esmTestsPath = path.join(logsDir, 'esm-tests.json');
const commonjsTestsPath = path.join(logsDir, 'commonjs-tests.json');
const emptyTestsPath = path.join(logsDir, 'empty-tests.json');
const reportPath = path.join(projectRoot, 'test-cleanup-report.md');

// Load data from logs
function loadJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return [];
  }
}

// Generate markdown report
function generateReport() {
  const esmTests = loadJsonFile(esmTestsPath);
  const commonjsTests = loadJsonFile(commonjsTestsPath);
  const emptyTests = loadJsonFile(emptyTestsPath);
  
  const backupDirs = fs.readdirSync(path.join(projectRoot, 'tests-backup'))
    .filter(dir => dir.startsWith('commonjs-tests-'));
  
  const latestBackup = backupDirs.sort().pop() || 'No backup found';
  
  let report = `# Test Cleanup Report\n\n`;
  report += `## Summary\n\n`;
  report += `- **Total tests processed**: ${esmTests.length + commonjsTests.length + emptyTests.length}\n`;
  report += `- **ESM tests kept**: ${esmTests.length}\n`;
  report += `- **CommonJS tests removed**: ${commonjsTests.length}\n`;
  report += `- **Empty tests removed**: ${emptyTests.length}\n`;
  report += `- **Total tests removed**: ${commonjsTests.length + emptyTests.length}\n\n`;
  
  report += `## Backup Information\n\n`;
  report += `All removed files were backed up to: \`tests-backup/${latestBackup}\`\n\n`;
  
  report += `## ESM Tests (${esmTests.length})\n\n`;
  report += `These tests use ES modules syntax and were kept in the codebase:\n\n`;
  report += `\`\`\`\n${esmTests.join('\n')}\n\`\`\`\n\n`;
  
  report += `## CommonJS Tests (${commonjsTests.length})\n\n`;
  report += `These tests use CommonJS syntax and were removed:\n\n`;
  report += `\`\`\`\n${commonjsTests.join('\n')}\n\`\`\`\n\n`;
  
  report += `## Empty Tests (${emptyTests.length})\n\n`;
  report += `These tests were empty or had minimal content and were removed:\n\n`;
  report += `\`\`\`\n${emptyTests.join('\n')}\n\`\`\`\n\n`;
  
  report += `## Next Steps\n\n`;
  report += `1. Run the tests to verify that all ESM tests are working correctly\n`;
  report += `2. Update the build and deployment pipelines to ensure they support ESM\n`;
  report += `3. Consider creating additional ESM tests for the functionality that was previously tested by CommonJS tests\n`;
  
  return report;
}

// Write the report to a file
function writeReport(report) {
  try {
    fs.writeFileSync(reportPath, report);
    console.log(`Report written to ${reportPath}`);
  } catch (error) {
    console.error('Error writing report:', error.message);
  }
}

// Run the script
try {
  console.log('Generating test cleanup report...');
  const report = generateReport();
  writeReport(report);
  console.log('Done!');
} catch (error) {
  console.error('Error generating report:', error.message);
} 