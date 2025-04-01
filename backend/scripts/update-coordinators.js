#!/usr/bin/env node

/**
 * Coordinator Update Script
 * 
 * This script identifies and updates coordinator files that use direct event publishing
 * to use the standardized entity-based event collection pattern instead.
 * 
 * Usage:
 *   node scripts/update-coordinators.js [options]
 * 
 * Options:
 *   --dry-run       Run without making changes, show what would be updated
 *   --verbose       Show detailed logging
 *   --path=PATH     Only process coordinators in the specified path
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
Coordinator Update Script

This script identifies and updates coordinator files that use direct event publishing
to use the standardized entity-based event collection pattern instead.

Usage:
  node scripts/update-coordinators.js [options]

Options:
  --dry-run       Run without making changes, show what would be updated
  --verbose       Show detailed logging
  --path=PATH     Only process coordinators in the specified path
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
  coordinators: [] // Will store details about each coordinator
};

// Timestamp for logging and reports
const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');

/**
 * Find coordinator files
 * @returns {Promise<string[]>} Array of file paths
 */
async function findCoordinatorFiles() {
  return new Promise((resolve, reject) => {
    const pattern = options.path || 'src/**/application/**/*Coordinator.js';
    log.info(`Searching for coordinator files: ${pattern}`);
    
    glob(pattern).then(files => {
      stats.total = files.length;
      log.info(`Found ${files.length} coordinator files`);
      resolve(files);
    }).catch(err => {
      log.error(`Failed to find coordinator files: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Check if a coordinator file uses direct event publishing
 * @param {string} content - File content
 * @returns {boolean} True if coordinator uses direct event publishing
 */
function usesDirectEventPublishing(content) {
  // Check for various patterns of direct event publishing
  const patterns = [
    /eventBus\.publish\s*\(\s*['"]([^'"]+)['"]\s*,/,
    /eventBus\.publish\s*\(\s*\{/,
    /eventBus\.publish\s*\(\s*EventTypes\./,
    /this\.eventBus\.publish\s*\(/,
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
 * Extract the domain name from the coordinator name
 * @param {string} coordinatorName - Coordinator name
 * @returns {string} Domain name
 */
function extractDomainFromCoordinatorName(coordinatorName) {
  // Try to extract domain from the coordinator name
  // E.g., UserProgressCoordinator -> user
  const nameWithoutCoordinator = coordinatorName.replace('Coordinator', '');
  // Use a regex to find camel case parts
  const parts = nameWithoutCoordinator.match(/[A-Z][a-z]+/g) || [];
  return parts.length > 0 ? parts[0].toLowerCase() : 'unknown';
}

/**
 * Guess the associated service from the coordinator file
 * @param {string} filePath - File path
 * @param {string} content - File content
 * @returns {string} Service name
 */
function guessAssociatedService(filePath, content) {
  // Try to extract from import statements
  const importMatches = content.match(/import\s+\{\s*([A-Za-z]+Service)\s*\}/);
  if (importMatches && importMatches[1]) {
    return importMatches[1];
  }
  
  // Try to extract from constructor injection
  const injectionMatches = content.match(/this\.([a-zA-Z]+Service)\s*=/);
  if (injectionMatches && injectionMatches[1]) {
    return injectionMatches[1];
  }
  
  // Guess from the filename
  const filename = path.basename(filePath, '.js');
  const domainName = extractDomainFromCoordinatorName(filename);
  return `${domainName.charAt(0).toUpperCase() + domainName.slice(1)}Service`;
}

/**
 * Transform a coordinator file to use entity-based event collection
 * @param {string} content - File content
 * @param {string} coordinatorName - Coordinator name
 * @param {string} serviceName - Associated service name
 * @returns {string} Transformed content
 */
function transformCoordinator(content, coordinatorName, serviceName) {
  log.verbose(`Transforming ${coordinatorName} (associated service: ${serviceName})`);
  
  let updatedContent = content;
  
  // Determine the naming style for accessing the service
  const serviceNameLower = serviceName.charAt(0).toLowerCase() + serviceName.slice(1);
  const serviceAccessor = content.includes(`this.${serviceNameLower}`) 
    ? `this.${serviceNameLower}` 
    : content.includes(`this._${serviceNameLower}`) 
      ? `this._${serviceNameLower}` 
      : `this.${serviceNameLower}`;
  
  // Extract domain from service name
  const domainName = serviceName.replace('Service', '').toLowerCase();
  
  // Transform pattern 1: Direct event publishing with this.eventBus.publish
  updatedContent = updatedContent.replace(
    /(async\s+[a-zA-Z]+[^(]*\([^)]*\)[^{]*\{[\s\S]*?)(await\s+this\.eventBus\.(?:publish|publishEvent)\s*\(\s*(?:this\.EventTypes\.[A-Z_]+|EventTypes\.[A-Z_]+|['"][A-Z_]+['"])\s*,[\s\S]*?\)\s*;)/g,
    (match, beforePublish, publishStatement) => {
      // Extract event type from the publish statement
      const eventTypeMatch = publishStatement.match(/this\.EventTypes\.([A-Z_]+)|EventTypes\.([A-Z_]+)|['"]([A-Z_]+)['"]/);
      const eventType = eventTypeMatch ? (eventTypeMatch[1] || eventTypeMatch[2] || eventTypeMatch[3]) : 'ENTITY_UPDATED';
      
      // Extract payload data from publish statement
      const payloadMatch = publishStatement.match(/\{([\s\S]*?)\}/);
      const payloadData = payloadMatch ? payloadMatch[1].trim() : '';
      
      // Try to find ID parameter in the method signature or in the payload
      const methodMatch = beforePublish.match(/async\s+[a-zA-Z]+[^(]*\(\s*(?:const\s+)?([^,)]+)/);
      let idParam = methodMatch ? methodMatch[1].trim() : null;
      
      if (!idParam) {
        // Try to find id in the payload
        const idMatch = payloadData.match(/([a-zA-Z]+Id):/);
        idParam = idMatch ? idMatch[1] : `${domainName}Id`;
      }
      
      // Begin building the transformed code
      let transformedCode = beforePublish;
      
      // Add entity-based event collection
      transformedCode += `
    // Get entity to add domain event
    const entity = await ${serviceAccessor}.get${domainName.charAt(0).toUpperCase() + domainName.slice(1)}Entity(${idParam});
    if (entity) {
      // Add domain event to entity
      entity.addDomainEvent(this.EventTypes.${eventType}, {
        ${payloadData}
      });
      
      // Save entity which will publish the event
      await ${serviceAccessor}.save${domainName.charAt(0).toUpperCase() + domainName.slice(1)}(entity);
    }`;
      
      return transformedCode;
    }
  );
  
  // Transform pattern 2: Multiple event.publish calls
  updatedContent = updatedContent.replace(
    /(async\s+[a-zA-Z]+[^(]*\([^)]*\)[^{]*\{[\s\S]*?)(const\s+[a-zA-Z]+\s*=[\s\S]*?await[\s\S]*?;[\s\S]*?)(await\s+this\.eventBus\.(?:publish|publishEvent)\s*\(\s*(?:this\.EventTypes\.[A-Z_]+|EventTypes\.[A-Z_]+|['"][A-Z_]+['"])\s*,[\s\S]*?\)\s*;)/g,
    (match, beforeResult, resultAssignment, publishStatement) => {
      // Extract event type from the publish statement
      const eventTypeMatch = publishStatement.match(/this\.EventTypes\.([A-Z_]+)|EventTypes\.([A-Z_]+)|['"]([A-Z_]+)['"]/);
      const eventType = eventTypeMatch ? (eventTypeMatch[1] || eventTypeMatch[2] || eventTypeMatch[3]) : 'ENTITY_CREATED';
      
      // Extract payload data from publish statement
      const payloadMatch = publishStatement.match(/\{([\s\S]*?)\}/);
      const payloadData = payloadMatch ? payloadMatch[1].trim() : '';
      
      // Check if resultAssignment contains the entity created
      const entityVarMatch = resultAssignment.match(/const\s+([a-zA-Z]+)\s*=/);
      const entityVar = entityVarMatch ? entityVarMatch[1] : null;
      
      let transformedCode = beforeResult + resultAssignment;
      
      if (entityVar) {
        // The previous operation likely created an entity we can use
        transformedCode += `
    // Add domain event to the created entity
    if (${entityVar}) {
      ${entityVar}.addDomainEvent(this.EventTypes.${eventType}, {
        ${payloadData}
      });
      
      // Save entity with events
      await ${serviceAccessor}.save${domainName.charAt(0).toUpperCase() + domainName.slice(1)}(${entityVar});
    }`;
      } else {
        // Try to find entity ID in the payload
        const idMatch = payloadData.match(/([a-zA-Z]+Id):\s*([^,}]+)/);
        const idParam = idMatch ? idMatch[2] : `${domainName}Id`;
        
        transformedCode += `
    // Get entity to add domain event
    const entity = await ${serviceAccessor}.get${domainName.charAt(0).toUpperCase() + domainName.slice(1)}Entity(${idParam});
    if (entity) {
      // Add domain event to entity
      entity.addDomainEvent(this.EventTypes.${eventType}, {
        ${payloadData}
      });
      
      // Save entity which will publish the event
      await ${serviceAccessor}.save${domainName.charAt(0).toUpperCase() + domainName.slice(1)}(entity);
    }`;
      }
      
      return transformedCode;
    }
  );
  
  return updatedContent;
}

/**
 * Process a coordinator file
 * @param {string} filePath - Path to the coordinator file
 */
async function processCoordinator(filePath) {
  const coordinatorName = path.basename(filePath, '.js');
  
  log.verbose(`Processing ${coordinatorName}`);
  
  try {
    stats.scanned++;
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if coordinator uses direct event publishing
    if (!usesDirectEventPublishing(content)) {
      log.verbose(`${coordinatorName} does not use direct event publishing, skipping`);
      stats.skipped++;
      stats.coordinators.push({
        name: coordinatorName,
        status: 'skipped',
        reason: 'No direct event publishing found'
      });
      return;
    }
    
    // Guess associated service
    const serviceName = guessAssociatedService(filePath, content);
    
    log.info(`${coordinatorName} uses direct event publishing, transforming (associated service: ${serviceName})`);
    
    // Transform coordinator
    const updatedContent = transformCoordinator(content, coordinatorName, serviceName);
    
    // Check if content was actually changed
    if (content === updatedContent) {
      log.warn(`No changes made to ${coordinatorName}, might need manual review`);
      stats.skipped++;
      stats.coordinators.push({
        name: coordinatorName,
        status: 'skipped',
        reason: 'No changes after transformation',
        associatedService: serviceName
      });
      return;
    }
    
    // Update file if not in dry run mode
    if (!options.dryRun) {
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      log.success(`Updated ${coordinatorName}`);
    } else {
      log.success(`Would update ${coordinatorName} (dry run)`);
    }
    
    stats.updated++;
    stats.coordinators.push({
      name: coordinatorName,
      status: 'updated',
      associatedService: serviceName
    });
  } catch (error) {
    log.error(`Error processing ${coordinatorName}: ${error.message}`);
    stats.errors++;
    stats.coordinators.push({
      name: coordinatorName,
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
    
    const reportPath = path.join(reportDir, `coordinator-update-${timestamp}.json`);
    
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
      coordinators: stats.coordinators
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
  console.log(`\nCoordinator Update Script (${options.dryRun ? 'DRY RUN' : 'LIVE MODE'})\n`);
  
  try {
    // Find coordinator files
    const files = await findCoordinatorFiles();
    
    // Process each coordinator file
    for (const filePath of files) {
      await processCoordinator(filePath);
    }
    
    // Print summary
    console.log('\nSummary:');
    console.log(`Total coordinators: ${stats.total}`);
    console.log(`Scanned: ${stats.scanned}`);
    console.log(`Updated: ${stats.updated}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    
    if (stats.updated > 0) {
      console.log(`\nUpdated coordinators:`);
      stats.coordinators
        .filter(coordinator => coordinator.status === 'updated')
        .forEach(coordinator => console.log(`- ${coordinator.name} (service: ${coordinator.associatedService})`));
    }
    
    if (stats.errors > 0) {
      console.log(`\nCoordinators with errors:`);
      stats.coordinators
        .filter(coordinator => coordinator.status === 'error')
        .forEach(coordinator => console.log(`- ${coordinator.name}: ${coordinator.error}`));
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