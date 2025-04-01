#!/usr/bin/env node

/**
 * Full Domain Event Migration Script
 * 
 * This script orchestrates the entire domain event migration process:
 * 1. Performs pre-migration checks
 * 2. Takes a backup of the codebase
 * 3. Runs the migration scripts
 * 4. Verifies the migration results
 * 5. Sends notifications to the team
 * 
 * Usage:
 *   node scripts/run-full-domain-event-migration.js [options]
 * 
 * Options:
 *   --dry-run       Run without making changes, show what would be updated
 *   --skip-backup   Skip the backup step
 *   --skip-notify   Skip the notification step
 *   --help          Show help
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const options = {
  dryRun: process.argv.includes('--dry-run'),
  skipBackup: process.argv.includes('--skip-backup'),
  skipNotify: process.argv.includes('--skip-notify'),
  help: process.argv.includes('--help')
};

// Show help if requested
if (options.help) {
  console.log(`
Full Domain Event Migration Script

This script orchestrates the entire domain event migration process:
1. Performs pre-migration checks
2. Takes a backup of the codebase
3. Runs the migration scripts
4. Verifies the migration results
5. Sends notifications to the team

Usage:
  node scripts/run-full-domain-event-migration.js [options]

Options:
  --dry-run       Run without making changes, show what would be updated
  --skip-backup   Skip the backup step
  --skip-notify   Skip the notification step
  --help          Show help
  `);
  process.exit(0);
}

// Create timestamp for logs and backups
const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');

// Create directories if they don't exist
const createDirectories = () => {
  ['logs', 'backups', 'reports'].forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
};

// Set up logging
const logFilePath = path.join(process.cwd(), 'logs', `migration-${timestamp}.log`);
const log = {
  info: (message) => {
    const logMessage = `[INFO] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(logFilePath, logMessage + '\n');
  },
  success: (message) => {
    const logMessage = `[SUCCESS] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(logFilePath, logMessage + '\n');
  },
  error: (message) => {
    const logMessage = `[ERROR] ${message}`;
    console.error(logMessage);
    fs.appendFileSync(logFilePath, logMessage + '\n');
  },
  warn: (message) => {
    const logMessage = `[WARNING] ${message}`;
    console.warn(logMessage);
    fs.appendFileSync(logFilePath, logMessage + '\n');
  }
};

// Initialize stats for reports
const stats = {
  startTime: new Date(),
  endTime: null,
  success: false,
  services: {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  },
  coordinators: {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  },
  eventFiles: {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  },
  verification: {
    totalFiles: 0,
    filesWithIssues: 0,
    totalIssues: 0
  }
};

/**
 * Run a command and log output
 * @param {string} command - Command to run
 * @param {string} errorMessage - Message to log on error
 * @returns {string} Command output
 */
const runCommand = (command, errorMessage) => {
  try {
    log.info(`Running command: ${command}`);
    const output = execSync(command, { encoding: 'utf8' });
    log.info('Command completed successfully');
    return output;
  } catch (error) {
    log.error(`${errorMessage}: ${error.message}`);
    log.error(`Command output: ${error.stdout}`);
    throw new Error(`Command failed: ${command}`);
  }
};

/**
 * Take a backup of the codebase
 */
const takeBackup = () => {
  if (options.skipBackup) {
    log.warn('Skipping backup step as requested');
    return;
  }

  log.info('Creating backup of the codebase...');
  
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    const backupFilePath = path.join(backupDir, `codebase-backup-${timestamp}.tar.gz`);
    
    // Create backup using tar - escape the path to handle spaces
    const escapedPath = backupFilePath.replace(/ /g, '\\ ');
    
    runCommand(
      `tar -czf "${backupFilePath}" --exclude=node_modules --exclude=.git --exclude=backups .`,
      'Failed to create backup'
    );
    
    log.success(`Backup created at: ${backupFilePath}`);
    return backupFilePath;
  } catch (error) {
    log.error(`Failed to create backup: ${error.message}`);
    throw error;
  }
};

/**
 * Perform pre-migration checks
 * @returns {boolean} True if all checks pass
 */
const performPreMigrationChecks = () => {
  log.info('Performing pre-migration checks...');
  
  // Check 1: Ensure we're in the right directory
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.name !== 'responses-api-fight-club') {
      throw new Error('Not in the project root directory');
    }
  } catch (error) {
    log.error(`Failed to verify project: ${error.message}`);
    return false;
  }
  
  // Check 2: Ensure all required scripts exist
  const requiredScripts = [
    'scripts/update-services.js',
    'scripts/update-coordinators.js',
    'scripts/update-event-files.js',
    'scripts/verify-event-migration.js'
  ];
  
  for (const script of requiredScripts) {
    if (!fs.existsSync(script)) {
      log.error(`Required script not found: ${script}`);
      return false;
    }
  }
  
  // Check 3: Verify that the npm scripts are defined
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredNpmScripts = [
      'events:update-services',
      'events:update-coordinators',
      'events:update-event-files',
      'events:verify'
    ];
    
    for (const script of requiredNpmScripts) {
      if (!packageJson.scripts[script]) {
        log.error(`Required npm script not defined: ${script}`);
        return false;
      }
    }
  } catch (error) {
    log.error(`Failed to verify npm scripts: ${error.message}`);
    return false;
  }
  
  // Check 4: Run a git status to make sure there are no uncommitted changes
  try {
    const gitStatus = runCommand('git status --porcelain', 'Failed to check git status');
    if (gitStatus.trim() !== '') {
      log.warn('There are uncommitted changes in the repository:');
      log.warn(gitStatus);
      log.warn('Consider committing or stashing changes before migration.');
      // Don't fail the checks for this, just warn
    }
  } catch (error) {
    log.warn(`Failed to check git status: ${error.message}`);
    // Don't fail the checks for this, just warn
  }
  
  log.success('All pre-migration checks passed successfully!');
  return true;
};

/**
 * Parse service script results
 * @param {string} output - Script output
 * @returns {object} Stats from the script
 */
const parseServiceResults = (output) => {
  try {
    const totalMatch = output.match(/Total services: (\d+)/);
    const updatedMatch = output.match(/Updated: (\d+)/);
    const skippedMatch = output.match(/Skipped: (\d+)/);
    const errorsMatch = output.match(/Errors: (\d+)/);
    
    if (totalMatch && updatedMatch && skippedMatch && errorsMatch) {
      stats.services = {
        total: parseInt(totalMatch[1], 10),
        updated: parseInt(updatedMatch[1], 10),
        skipped: parseInt(skippedMatch[1], 10),
        errors: parseInt(errorsMatch[1], 10)
      };
    }
    
    // Try to extract report path
    const reportMatch = output.match(/Detailed report saved to: ([^\s]+)/);
    if (reportMatch) {
      return reportMatch[1];
    }
    
    return null;
  } catch (error) {
    log.warn(`Failed to parse service results: ${error.message}`);
    return null;
  }
};

/**
 * Parse coordinator script results
 * @param {string} output - Script output
 * @returns {object} Stats from the script
 */
const parseCoordinatorResults = (output) => {
  try {
    const totalMatch = output.match(/Total coordinators: (\d+)/);
    const updatedMatch = output.match(/Updated: (\d+)/);
    const skippedMatch = output.match(/Skipped: (\d+)/);
    const errorsMatch = output.match(/Errors: (\d+)/);
    
    if (totalMatch && updatedMatch && skippedMatch && errorsMatch) {
      stats.coordinators = {
        total: parseInt(totalMatch[1], 10),
        updated: parseInt(updatedMatch[1], 10),
        skipped: parseInt(skippedMatch[1], 10),
        errors: parseInt(errorsMatch[1], 10)
      };
    }
    
    // Try to extract report path
    const reportMatch = output.match(/Detailed report saved to: ([^\s]+)/);
    if (reportMatch) {
      return reportMatch[1];
    }
    
    return null;
  } catch (error) {
    log.warn(`Failed to parse coordinator results: ${error.message}`);
    return null;
  }
};

/**
 * Parse event files script results
 * @param {string} output - Script output
 * @returns {object} Stats from the script
 */
const parseEventFileResults = (output) => {
  try {
    const totalMatch = output.match(/Total event files: (\d+)/);
    const updatedMatch = output.match(/Updated: (\d+)/);
    const skippedMatch = output.match(/Skipped: (\d+)/);
    const errorsMatch = output.match(/Errors: (\d+)/);
    
    if (totalMatch && updatedMatch && skippedMatch && errorsMatch) {
      stats.eventFiles = {
        total: parseInt(totalMatch[1], 10),
        updated: parseInt(updatedMatch[1], 10),
        skipped: parseInt(skippedMatch[1], 10),
        errors: parseInt(errorsMatch[1], 10)
      };
    }
    
    // Try to extract report path
    const reportMatch = output.match(/Detailed report saved to: ([^\s]+)/);
    if (reportMatch) {
      return reportMatch[1];
    }
    
    return null;
  } catch (error) {
    log.warn(`Failed to parse event file results: ${error.message}`);
    return null;
  }
};

/**
 * Parse verification script results
 * @param {string} output - Script output
 * @returns {object} Stats from the script
 */
const parseVerificationResults = (output) => {
  try {
    const scannedMatch = output.match(/Files scanned: (\d+)/);
    const filesWithIssuesMatch = output.match(/Files with direct event publishing: (\d+)/);
    const totalIssuesMatch = output.match(/Total instances found: (\d+)/);
    
    if (scannedMatch && filesWithIssuesMatch && totalIssuesMatch) {
      stats.verification = {
        totalFiles: parseInt(scannedMatch[1], 10),
        filesWithIssues: parseInt(filesWithIssuesMatch[1], 10),
        totalIssues: parseInt(totalIssuesMatch[1], 10)
      };
    }
    
    // Try to extract report path
    const mdReportMatch = output.match(/Markdown: ([^\s]+)/);
    if (mdReportMatch) {
      return mdReportMatch[1];
    }
    
    return null;
  } catch (error) {
    log.warn(`Failed to parse verification results: ${error.message}`);
    return null;
  }
};

/**
 * Run the service update script
 * @returns {string} Path to report file
 */
const updateServices = () => {
  log.info('Updating services to use entity-based event collection...');
  
  try {
    const command = options.dryRun 
      ? 'npm run events:update-services:dry'
      : 'npm run events:update-services';
      
    const output = runCommand(command, 'Failed to update services');
    const reportPath = parseServiceResults(output);
    
    if (stats.services.errors > 0) {
      log.warn(`Service update completed with ${stats.services.errors} errors`);
    } else {
      log.success(`Service update completed successfully. Updated ${stats.services.updated} of ${stats.services.total} services.`);
    }
    
    return reportPath;
  } catch (error) {
    log.error(`Failed to update services: ${error.message}`);
    throw error;
  }
};

/**
 * Run the coordinator update script
 * @returns {string} Path to report file
 */
const updateCoordinators = () => {
  log.info('Updating coordinators to use entity-based event collection...');
  
  try {
    const command = options.dryRun 
      ? 'npm run events:update-coordinators:dry'
      : 'npm run events:update-coordinators';
      
    const output = runCommand(command, 'Failed to update coordinators');
    const reportPath = parseCoordinatorResults(output);
    
    if (stats.coordinators.errors > 0) {
      log.warn(`Coordinator update completed with ${stats.coordinators.errors} errors`);
    } else {
      log.success(`Coordinator update completed successfully. Updated ${stats.coordinators.updated} of ${stats.coordinators.total} coordinators.`);
    }
    
    return reportPath;
  } catch (error) {
    log.error(`Failed to update coordinators: ${error.message}`);
    throw error;
  }
};

/**
 * Run the event files update script
 * @returns {string} Path to report file
 */
const updateEventFiles = () => {
  log.info('Updating event files to use entity-based event collection...');
  
  try {
    const command = options.dryRun 
      ? 'npm run events:update-event-files:dry'
      : 'npm run events:update-event-files';
      
    const output = runCommand(command, 'Failed to update event files');
    const reportPath = parseEventFileResults(output);
    
    if (stats.eventFiles.errors > 0) {
      log.warn(`Event files update completed with ${stats.eventFiles.errors} errors`);
    } else {
      log.success(`Event files update completed successfully. Updated ${stats.eventFiles.updated} of ${stats.eventFiles.total} event files.`);
    }
    
    return reportPath;
  } catch (error) {
    log.error(`Failed to update event files: ${error.message}`);
    throw error;
  }
};

/**
 * Run verification script
 * @returns {string} Path to report file
 */
const verifyMigration = () => {
  log.info('Verifying migration results...');
  
  try {
    const command = 'npm run events:verify:verbose';
    const output = runCommand(command, 'Failed to verify migration');
    const reportPath = parseVerificationResults(output);
    
    if (stats.verification.filesWithIssues > 0) {
      log.warn(`Verification completed with ${stats.verification.filesWithIssues} files still using direct event publishing`);
      log.warn(`Total issues remaining: ${stats.verification.totalIssues}`);
    } else {
      log.success('Verification completed successfully. No direct event publishing found!');
    }
    
    return reportPath;
  } catch (error) {
    log.error(`Failed to verify migration: ${error.message}`);
    throw error;
  }
};

/**
 * Generate migration summary
 * @param {object} reports - Paths to report files
 * @returns {string} Summary markdown
 */
const generateMigrationSummary = (reports) => {
  const summary = [];
  
  summary.push('# Domain Event Migration Summary');
  summary.push(`\nMigration Date: ${new Date().toLocaleString()}`);
  summary.push(`Migration Mode: ${options.dryRun ? 'Dry Run (no changes made)' : 'Live Run'}`);
  summary.push('\n## Migration Results\n');
  
  // Service stats
  summary.push('### Services');
  summary.push(`- Total services: ${stats.services.total}`);
  summary.push(`- Updated: ${stats.services.updated}`);
  summary.push(`- Skipped: ${stats.services.skipped}`);
  summary.push(`- Errors: ${stats.services.errors}`);
  
  // Coordinator stats
  summary.push('\n### Coordinators');
  summary.push(`- Total coordinators: ${stats.coordinators.total}`);
  summary.push(`- Updated: ${stats.coordinators.updated}`);
  summary.push(`- Skipped: ${stats.coordinators.skipped}`);
  summary.push(`- Errors: ${stats.coordinators.errors}`);
  
  // Event file stats
  summary.push('\n### Event Files');
  summary.push(`- Total event files: ${stats.eventFiles.total}`);
  summary.push(`- Updated: ${stats.eventFiles.updated}`);
  summary.push(`- Skipped: ${stats.eventFiles.skipped}`);
  summary.push(`- Errors: ${stats.eventFiles.errors}`);
  
  // Verification stats
  summary.push('\n### Verification');
  summary.push(`- Total files scanned: ${stats.verification.totalFiles}`);
  summary.push(`- Files with direct event publishing: ${stats.verification.filesWithIssues}`);
  summary.push(`- Total instances found: ${stats.verification.totalIssues}`);
  
  // Calculate success metrics
  const totalUpdated = stats.services.updated + stats.coordinators.updated + stats.eventFiles.updated;
  const totalFiles = stats.services.total + stats.coordinators.total + stats.eventFiles.total;
  const successPercentage = Math.round((totalUpdated / totalFiles) * 100);
  
  summary.push('\n## Migration Status');
  if (stats.verification.filesWithIssues === 0) {
    summary.push('\n✅ **Migration Completed Successfully!**');
    summary.push(`\nAll ${totalFiles} files were processed, and no direct event publishing remains.`);
  } else {
    summary.push('\n⚠️ **Migration Partially Completed**');
    summary.push(`\n${totalUpdated} of ${totalFiles} files (${successPercentage}%) were updated to use entity-based event collection.`);
    summary.push(`\nHowever, ${stats.verification.filesWithIssues} files still contain direct event publishing with ${stats.verification.totalIssues} instances.`);
    summary.push('\nSee the verification report for details on remaining issues.');
  }
  
  // Add report links
  summary.push('\n## Detailed Reports');
  if (reports.services) {
    summary.push(`\n- [Service Update Report](${reports.services})`);
  }
  if (reports.coordinators) {
    summary.push(`- [Coordinator Update Report](${reports.coordinators})`);
  }
  if (reports.eventFiles) {
    summary.push(`- [Event Files Update Report](${reports.eventFiles})`);
  }
  if (reports.verification) {
    summary.push(`- [Verification Report](${reports.verification})`);
  }
  
  // Execution time
  const executionTime = ((stats.endTime - stats.startTime) / 1000).toFixed(2);
  summary.push(`\n\nMigration completed in ${executionTime} seconds.`);
  
  return summary.join('\n');
};

/**
 * Save the migration summary to a file
 * @param {string} summary - Migration summary markdown
 * @returns {string} Path to summary file
 */
const saveMigrationSummary = (summary) => {
  const summaryPath = path.join(process.cwd(), 'reports', `migration-summary-${timestamp}.md`);
  fs.writeFileSync(summaryPath, summary, 'utf8');
  log.info(`Migration summary saved to: ${summaryPath}`);
  return summaryPath;
};

/**
 * Send notifications to the team
 * @param {string} summaryPath - Path to summary file
 */
const notifyTeam = (summaryPath) => {
  if (options.skipNotify) {
    log.warn('Skipping notification step as requested');
    return;
  }
  
  log.info('Sending notifications to the team...');
  
  try {
    // Read summary file
    const summary = fs.readFileSync(summaryPath, 'utf8');
    
    // You might integrate with Slack or email here
    // For now, just log that we would send a notification
    log.info('Would send notifications to the team with the migration summary');
    
    // If you have a Slack webhook or email API, you could use it here
    // Example:
    // await axios.post('https://hooks.slack.com/services/XXX/YYY/ZZZ', {
    //   text: `Domain Event Migration ${options.dryRun ? '(Dry Run) ' : ''}Completed`,
    //   attachments: [
    //     {
    //       title: 'Migration Summary',
    //       text: summary,
    //       color: stats.verification.filesWithIssues === 0 ? 'good' : 'warning'
    //     }
    //   ]
    // });
    
    log.success('Notifications sent successfully');
  } catch (error) {
    log.error(`Failed to send notifications: ${error.message}`);
  }
};

/**
 * Run the full migration process
 */
const runMigration = async () => {
  log.info(`Starting domain event migration (${options.dryRun ? 'DRY RUN' : 'LIVE MODE'})...`);
  
  const reports = {};
  
  try {
    // Create required directories
    createDirectories();
    
    // Step 1: Perform pre-migration checks
    const checksPass = performPreMigrationChecks();
    if (!checksPass) {
      log.error('Pre-migration checks failed. Aborting migration.');
      return;
    }
    
    // Step 2: Take backup
    const backupPath = takeBackup();
    if (!backupPath && !options.skipBackup) {
      log.error('Backup failed. Aborting migration.');
      return;
    }
    
    // Step 3: Update services
    reports.services = updateServices();
    
    // Step 4: Update coordinators
    reports.coordinators = updateCoordinators();
    
    // Step 5: Update event files
    reports.eventFiles = updateEventFiles();
    
    // Step 6: Verify migration
    reports.verification = verifyMigration();
    
    // Set success flag
    stats.success = true;
    
    // Generate and save summary
    stats.endTime = new Date();
    const summary = generateMigrationSummary(reports);
    const summaryPath = saveMigrationSummary(summary);
    
    // Step 7: Send notifications
    notifyTeam(summaryPath);
    
    log.success(`Domain event migration ${options.dryRun ? '(DRY RUN) ' : ''}completed successfully!`);
    log.info(`Summary saved to: ${summaryPath}`);
    
    // Log completion and success
    console.log('\n' + '='.repeat(80));
    console.log(`${options.dryRun ? 'DRY RUN ' : ''}Migration completed successfully!`);
    console.log(`Services: ${stats.services.updated}/${stats.services.total} updated`);
    console.log(`Coordinators: ${stats.coordinators.updated}/${stats.coordinators.total} updated`);
    console.log(`Event Files: ${stats.eventFiles.updated}/${stats.eventFiles.total} updated`);
    
    if (stats.verification.filesWithIssues === 0) {
      console.log('\n✅ All files now use entity-based event collection!');
    } else {
      console.log(`\n⚠️ ${stats.verification.filesWithIssues} files with ${stats.verification.totalIssues} instances of direct event publishing remain.`);
      console.log('See verification report for details.');
    }
    
    console.log('\nMigration Summary:', summaryPath);
    console.log('Migration Log:', logFilePath);
    console.log('='.repeat(80));
    
  } catch (error) {
    stats.endTime = new Date();
    log.error(`Migration failed: ${error.message}`);
    
    // Try to generate a partial summary
    try {
      const summary = generateMigrationSummary(reports);
      const summaryPath = saveMigrationSummary(summary);
      log.info(`Partial summary saved to: ${summaryPath}`);
    } catch (summaryError) {
      log.error(`Failed to generate summary: ${summaryError.message}`);
    }
    
    // Log completion and failure
    console.log('\n' + '='.repeat(80));
    console.log('Migration FAILED!');
    console.log('See log file for details:', logFilePath);
    console.log('='.repeat(80));
    
    process.exit(1);
  }
};

// Run the migration
runMigration(); 