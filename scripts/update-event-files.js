#!/usr/bin/env node

/**
 * Event Files Update Script
 * 
 * This script identifies and updates event files that use direct event publishing
 * to use the standardized entity-based event collection pattern instead.
 * 
 * Usage:
 *   node scripts/update-event-files.js [options]
 * 
 * Options:
 *   --dry-run       Run without making changes, show what would be updated
 *   --verbose       Show detailed logging
 *   --path=PATH     Only process events in the specified path
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
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  help: process.argv.includes('--help')
};

// Extract path from arguments if provided
const pathArg = process.argv.find(arg => arg.startsWith('--path='));
if (pathArg) {
  options.path = pathArg.split('=')[1];
}

// Create logger
const log = {
  info: (message) => options.verbose && console.log(`INFO: ${message}`),
  success: (message) => console.log(`SUCCESS: ${message}`),
  error: (message) => console.error(`ERROR: ${message}`),
  warn: (message) => console.warn(`WARNING: ${message}`),
  verbose: (message) => options.verbose && console.log(`VERBOSE: ${message}`)
};

// Show help if requested
if (options.help) {
  console.log(`
Event Files Update Script

This script identifies and updates event files that use direct event publishing
to use the standardized entity-based event collection pattern instead.

Usage:
  node scripts/update-event-files.js [options]

Options:
  --dry-run       Run without making changes, show what would be updated
  --verbose       Show detailed logging
  --path=PATH     Only process events in the specified path
  --help          Show help
  `);
  process.exit(0);
}

// Create stats object to track changes
const stats = {
  total: 0,
  scanned: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
  eventFiles: [] // Will store details about each event file
};

// Timestamp for logging and reports
const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');

/**
 * Find event files
 * @returns {Promise<string[]>} Array of file paths
 */
async function findEventFiles() {
  return new Promise((resolve, reject) => {
    const pattern = options.path || 'src/**/events/**/*.js';
    log.info(`Searching for event files: ${pattern}`);
    
    glob(pattern).then(files => {
      stats.total = files.length;
      log.info(`Found ${files.length} event files`);
      resolve(files);
    }).catch(err => {
      log.error(`Failed to find event files: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Check if an event file uses direct event publishing
 * @param {string} content - File content
 * @returns {boolean} True if event file uses direct event publishing
 */
function usesDirectEventPublishing(content) {
  // Check for various patterns of direct event publishing
  const patterns = [
    /eventBus\.publish\s*\(\s*['"]([^'"]+)['"]\s*,/,
    /eventBus\.publish\s*\(\s*\{/,
    /eventBus\.publish\s*\(\s*EventTypes\./,
    /await\s+this\.eventBus\.publish/,
    /eventBus\.publishEvent\s*\(/,
    /this\.eventBus\.publishEvent\s*\(/,
    /this\.EventTypes\./,
    /domainEvents\.publishEvent\s*\(/
  ];
  
  const result = patterns.some(pattern => pattern.test(content));
  
  if (result) {
    const matches = [];
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
    log.verbose(`Found direct event publishing patterns: ${matches.join(', ')}`);
  }
  
  return result;
}

/**
 * Extract the domain name from the event file path
 * @param {string} filePath - File path
 * @returns {string} Domain name
 */
function extractDomainName(filePath) {
  const parts = filePath.split(path.sep);
  const domainIndex = parts.indexOf('core') + 1;
  return domainIndex < parts.length ? parts[domainIndex] : 'unknown';
}

/**
 * Transform an event file to use repository-based event publishing
 * @param {string} content - File content
 * @param {string} domainName - Domain name
 * @returns {string} Transformed content
 */
function transformEventFile(content, domainName) {
  let updatedContent = content;
  
  // Extract imports and add repository import if needed
  if (!updatedContent.includes(`import { ${domainName}Repository }`)) {
    // Find where imports end
    const lastImportIndex = updatedContent.lastIndexOf('import');
    const lastImportEnd = updatedContent.indexOf('\n', lastImportIndex);
    
    if (lastImportIndex !== -1 && lastImportEnd !== -1) {
      const importStatement = `\nimport { ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}Repository } from '../repositories/${domainName}Repository.js';`;
      updatedContent = updatedContent.slice(0, lastImportEnd + 1) + importStatement + updatedContent.slice(lastImportEnd + 1);
    }
  }
  
  // Add repository initialization
  const repoVarName = `${domainName}Repository`;
  if (!updatedContent.includes(repoVarName)) {
    // Find a good place to add repository initialization
    const eventTypesIndex = updatedContent.indexOf('const EventTypes');
    if (eventTypesIndex !== -1) {
      const lineEnd = updatedContent.indexOf('\n', eventTypesIndex);
      const repoInit = `\n\n// Initialize repository\nconst ${repoVarName} = new ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}Repository();\n`;
      updatedContent = updatedContent.slice(0, lineEnd + 1) + repoInit + updatedContent.slice(lineEnd + 1);
    }
  }
  
  // Replace direct event publishing with repository-based approach
  updatedContent = updatedContent.replace(
    /(async\s+function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?)(await\s+eventBus\.(?:publish|publishEvent)\s*\(\s*(?:EventTypes\.[A-Z_]+|['"][A-Z_]+['"])\s*,[\s\S]*?\}\s*\)\s*;)/g,
    (match, beforePublish, publishStatement) => {
      // Extract event type from the publish statement
      const eventTypeMatch = publishStatement.match(/EventTypes\.([A-Z_]+)|['"]([A-Z_]+)['"]/);
      const eventType = eventTypeMatch ? (eventTypeMatch[1] || eventTypeMatch[2]) : 'UNKNOWN_EVENT';
      
      // Extract payload data from publish statement
      const payloadMatch = publishStatement.match(/\{([\s\S]*?)\}\s*\)\s*;/);
      const payloadData = payloadMatch ? payloadMatch[1].trim() : '';
      
      // Try to identify the entity ID in the payload
      const idMatch = payloadData.match(/(\w+Id):\s*([^,}\s]+)/);
      const entityIdVar = idMatch ? idMatch[2] : `${domainName}Id`;
      
      // Check if we have a parameter that matches entityIdVar
      const paramMatch = match.match(new RegExp(`function\\s+\\w+\\s*\\(\\s*(?:[^,]*,\\s*)*?(${entityIdVar}|id|userId)\\s*[,)\\s]`));
      const entityIdParam = paramMatch ? paramMatch[1] : entityIdVar;
      
      // Begin building the transformed code
      let transformedCode = beforePublish;
      
      // Add entity-based event collection
      transformedCode += `
  // Get entity to add domain event
  const entity = await ${repoVarName}.findById(${entityIdParam});
  if (entity) {
    // Add domain event to entity
    entity.addDomainEvent(EventTypes.${eventType}, {
      ${payloadData}
    });
    
    // Save entity which will publish the event
    await ${repoVarName}.save(entity);
  } else {
    // Fallback to direct event publishing if entity not found
    console.warn(\`Entity with ID \${${entityIdParam}} not found for event ${eventType}. Using direct event publishing.\`);
    ${publishStatement}
  }`;
      
      return transformedCode;
    }
  );
  
  return updatedContent;
}

/**
 * Process an event file
 * @param {string} filePath - Path to the event file
 */
async function processEventFile(filePath) {
  const fileName = path.basename(filePath);
  const domainName = extractDomainName(filePath);
  
  log.verbose(`Processing ${fileName} (${domainName} domain)`);
  
  try {
    stats.scanned++;
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if event file uses direct event publishing
    if (!usesDirectEventPublishing(content)) {
      log.verbose(`${fileName} does not use direct event publishing, skipping`);
      stats.skipped++;
      stats.eventFiles.push({
        name: fileName,
        domain: domainName,
        path: filePath,
        status: 'skipped',
        reason: 'No direct event publishing found'
      });
      return;
    }
    
    log.info(`${fileName} uses direct event publishing, transforming`);
    
    // Transform event file
    const updatedContent = transformEventFile(content, domainName);
    
    // Check if content was actually changed
    if (content === updatedContent) {
      log.warn(`No changes made to ${fileName}, might need manual review`);
      stats.skipped++;
      stats.eventFiles.push({
        name: fileName,
        domain: domainName,
        path: filePath,
        status: 'skipped',
        reason: 'No changes after transformation'
      });
      return;
    }
    
    // Update file if not in dry run mode
    if (!options.dryRun) {
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      log.success(`Updated ${fileName}`);
    } else {
      log.success(`Would update ${fileName} (dry run)`);
    }
    
    stats.updated++;
    stats.eventFiles.push({
      name: fileName,
      domain: domainName,
      path: filePath,
      status: 'updated'
    });
  } catch (error) {
    log.error(`Error processing ${fileName}: ${error.message}`);
    stats.errors++;
    stats.eventFiles.push({
      name: fileName,
      domain: domainName,
      path: filePath,
      status: 'error',
      error: error.message
    });
  }
}

/**
 * Save report to file
 */
function saveReport() {
  try {
    const reportDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportPath = path.join(reportDir, `event-files-update-${timestamp}.json`);
    
    const report = {
      timestamp,
      options,
      stats: {
        total: stats.total,
        scanned: stats.scanned,
        updated: stats.updated,
        skipped: stats.skipped,
        errors: stats.errors
      },
      eventFiles: stats.eventFiles
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    log.info(`Report saved to ${reportPath}`);
    return reportPath;
  } catch (error) {
    log.error(`Failed to save report: ${error.message}`);
    return null;
  }
}

/**
 * Main script function
 */
async function main() {
  console.log(`\nEvent Files Update Script (${options.dryRun ? 'DRY RUN' : 'LIVE MODE'})\n`);
  
  try {
    // Find event files
    const files = await findEventFiles();
    
    // Process each event file
    for (const filePath of files) {
      await processEventFile(filePath);
    }
    
    // Print summary
    console.log('\nSummary:');
    console.log(`Total event files: ${stats.total}`);
    console.log(`Scanned: ${stats.scanned}`);
    console.log(`Updated: ${stats.updated}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    
    if (stats.updated > 0) {
      console.log(`\nUpdated event files:`);
      stats.eventFiles
        .filter(file => file.status === 'updated')
        .forEach(file => console.log(`- ${file.name} (${file.domain})`));
    }
    
    if (stats.errors > 0) {
      console.log(`\nEvent files with errors:`);
      stats.eventFiles
        .filter(file => file.status === 'error')
        .forEach(file => console.log(`- ${file.name}: ${file.error}`));
    }
    
    // Save report
    const reportPath = saveReport();
    if (reportPath) {
      console.log(`\nDetailed report saved to: ${reportPath}`);
    }
    
    console.log(`\nDone!\n`);
  } catch (error) {
    log.error(`Script failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main(); 