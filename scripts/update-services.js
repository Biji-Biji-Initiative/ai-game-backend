#!/usr/bin/env node

/**
 * Service Update Script
 * 
 * This script identifies and updates service files that use direct event publishing
 * to use the standardized entity-based event collection pattern instead.
 * 
 * Usage:
 *   node scripts/update-services.js [options]
 * 
 * Options:
 *   --dry-run       Run without making changes, show what would be updated
 *   --verbose       Show detailed logging
 *   --path=PATH     Only process services in the specified path
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
Service Update Script

This script identifies and updates service files that use direct event publishing
to use the standardized entity-based event collection pattern instead.

Usage:
  node scripts/update-services.js [options]

Options:
  --dry-run       Run without making changes, show what would be updated
  --verbose       Show detailed logging
  --path=PATH     Only process services in the specified path
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
  services: [] // Will store details about each service
};

// Timestamp for logging and reports
const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');

/**
 * Find service files
 * @returns {Promise<string[]>} Array of file paths
 */
async function findServiceFiles() {
  return new Promise((resolve, reject) => {
    const pattern = options.path || 'src/**/services/**/*Service.js';
    log.info(`Searching for service files: ${pattern}`);
    
    glob(pattern).then(files => {
      stats.total = files.length;
      log.info(`Found ${files.length} service files`);
      resolve(files);
    }).catch(err => {
      log.error(`Failed to find service files: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Check if a service file uses direct event publishing
 * @param {string} content - File content
 * @returns {boolean} True if service uses direct event publishing
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
    /domainEvents\.publishEvent\s*\(/,
    /publish[A-Z][a-zA-Z]+\s*\(/
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
 * Extract the domain name from the file path
 * @param {string} filePath - File path
 * @returns {string} Domain name
 */
function extractDomainName(filePath) {
  const parts = filePath.split(path.sep);
  const domainIndex = parts.indexOf('core') + 1;
  return domainIndex < parts.length ? parts[domainIndex] : 'unknown';
}

/**
 * Extract the entity name from the service name
 * @param {string} serviceName - Service name
 * @returns {string} Entity name
 */
function extractEntityName(serviceName) {
  return serviceName.replace('Service', '');
}

/**
 * Transform a service file to use entity-based event collection
 * @param {string} content - File content
 * @param {string} serviceName - Service name
 * @param {string} domainName - Domain name
 * @returns {string} Transformed content
 */
function transformService(content, serviceName, domainName) {
  log.verbose(`Transforming ${serviceName}`);
  
  let updatedContent = content;
  
  // Get entity name from service name
  const entityName = extractEntityName(serviceName);
  
  // Transform 1: Replace direct event publishing in create methods
  updatedContent = updatedContent.replace(
    /(async\s+create[A-Za-z]*\s*\([^)]*\)[\s\S]*?)(await\s+(?:this\.)?eventBus\.(?:publish|publishEvent)\s*\(\s*(?:EventTypes\.[A-Z_]+|['"][A-Z_]+['"])\s*,[\s\S]*?\)\s*;)([\s\S]*?return\s+[^;]*;)/g,
    (match, beforePublish, publishStatement, afterPublish) => {
      // Extract event type from the publish statement
      const eventTypeMatch = publishStatement.match(/EventTypes\.([A-Z_]+)|['"]([A-Z_]+)['"]/);
      const eventType = eventTypeMatch ? (eventTypeMatch[1] || eventTypeMatch[2]) : 'ENTITY_CREATED';
      
      // Extract payload data from publish statement
      const payloadMatch = publishStatement.match(/\{([\s\S]*?)\}/);
      const payloadData = payloadMatch ? payloadMatch[1].trim() : '';
      
      let transformedCode = beforePublish;
      
      // Add entity-based event collection
      transformedCode += `
    // Add domain event to entity
    entity.addDomainEvent(EventTypes.${eventType}, {
      ${payloadData}
    });
    
    // Save entity with events
    await this.${domainName.toLowerCase()}Repository.save(entity);`;
      
      transformedCode += afterPublish;
      return transformedCode;
    }
  );
  
  // Transform 2: Replace direct event publishing in update methods
  updatedContent = updatedContent.replace(
    /(async\s+update[A-Za-z]*\s*\([^)]*\)[\s\S]*?)(await\s+(?:this\.)?eventBus\.(?:publish|publishEvent)\s*\(\s*(?:EventTypes\.[A-Z_]+|['"][A-Z_]+['"])\s*,[\s\S]*?\)\s*;)([\s\S]*?return\s+[^;]*;)/g,
    (match, beforePublish, publishStatement, afterPublish) => {
      // Extract event type from the publish statement
      const eventTypeMatch = publishStatement.match(/EventTypes\.([A-Z_]+)|['"]([A-Z_]+)['"]/);
      const eventType = eventTypeMatch ? (eventTypeMatch[1] || eventTypeMatch[2]) : 'ENTITY_UPDATED';
      
      // Extract payload data from publish statement
      const payloadMatch = publishStatement.match(/\{([\s\S]*?)\}/);
      const payloadData = payloadMatch ? payloadMatch[1].trim() : '';
      
      // Extract ID parameter from method signature
      const methodParamsMatch = beforePublish.match(/async\s+update[A-Za-z]*\s*\(\s*([^,)]+)/);
      const idParam = methodParamsMatch ? methodParamsMatch[1].trim() : 'id';
      
      let transformedCode = beforePublish;
      
      // Add entity-based event collection
      transformedCode += `
    // Get entity to add domain event
    const entity = await this.${domainName.toLowerCase()}Repository.findById(${idParam});
    if (entity) {
      // Add domain event to entity
      entity.addDomainEvent(EventTypes.${eventType}, {
        ${payloadData}
      });
      
      // Save entity which will publish the event
      await this.${domainName.toLowerCase()}Repository.save(entity);
    }`;
      
      transformedCode += afterPublish;
      return transformedCode;
    }
  );
  
  // Transform 3: Replace direct event publishing in delete methods
  updatedContent = updatedContent.replace(
    /(async\s+(?:delete|remove)[A-Za-z]*\s*\([^)]*\)[\s\S]*?)(await\s+(?:this\.)?eventBus\.(?:publish|publishEvent)\s*\(\s*(?:EventTypes\.[A-Z_]+|['"][A-Z_]+['"])\s*,[\s\S]*?\)\s*;)([\s\S]*?return\s+[^;]*;)/g,
    (match, beforeDelete, publishStatement, afterDelete) => {
      // Extract event type from the publish statement
      const eventTypeMatch = publishStatement.match(/EventTypes\.([A-Z_]+)|['"]([A-Z_]+)['"]/);
      const eventType = eventTypeMatch ? (eventTypeMatch[1] || eventTypeMatch[2]) : 'ENTITY_DELETED';
      
      // Extract ID parameter from method signature
      const methodParamsMatch = beforeDelete.match(/async\s+(?:delete|remove)[A-Za-z]*\s*\(\s*([^,)]+)/);
      const idParam = methodParamsMatch ? methodParamsMatch[1].trim() : 'id';
      
      let transformedCode = beforeDelete;
      
      // Add entity-based event collection
      transformedCode += `
    // Get entity to add domain event before deleting
    const entity = await this.${domainName.toLowerCase()}Repository.findById(${idParam});
    if (entity) {
      // Add domain event to entity
      entity.addDomainEvent(EventTypes.${eventType}, {
        ${entityName.toLowerCase()}Id: ${idParam},
        timestamp: new Date().toISOString()
      });
      
      // Delete entity with events included
      await this.${domainName.toLowerCase()}Repository.delete(${idParam});
    }`;
      
      transformedCode += afterDelete;
      return transformedCode;
    }
  );
  
  return updatedContent;
}

/**
 * Process a service file
 * @param {string} filePath - Path to the service file
 */
async function processService(filePath) {
  const serviceName = path.basename(filePath, '.js');
  const domainName = extractDomainName(filePath);
  
  log.verbose(`Processing ${serviceName} (${domainName} domain)`);
  
  try {
    stats.scanned++;
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if service uses direct event publishing
    if (!usesDirectEventPublishing(content)) {
      log.verbose(`${serviceName} does not use direct event publishing, skipping`);
      stats.skipped++;
      stats.services.push({
        name: serviceName,
        domain: domainName,
        status: 'skipped',
        reason: 'No direct event publishing found'
      });
      return;
    }
    
    log.info(`${serviceName} uses direct event publishing, transforming`);
    
    // Transform service
    const updatedContent = transformService(content, serviceName, domainName);
    
    // Check if content was actually changed
    if (content === updatedContent) {
      log.warn(`No changes made to ${serviceName}, might need manual review`);
      stats.skipped++;
      stats.services.push({
        name: serviceName,
        domain: domainName,
        status: 'skipped',
        reason: 'No changes after transformation'
      });
      return;
    }
    
    // Update file if not in dry run mode
    if (!options.dryRun) {
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      log.success(`Updated ${serviceName}`);
    } else {
      log.success(`Would update ${serviceName} (dry run)`);
    }
    
    stats.updated++;
    stats.services.push({
      name: serviceName,
      domain: domainName,
      status: 'updated'
    });
  } catch (error) {
    log.error(`Error processing ${serviceName}: ${error.message}`);
    stats.errors++;
    stats.services.push({
      name: serviceName,
      domain: domainName,
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
    
    const reportPath = path.join(reportDir, `service-update-${timestamp}.json`);
    
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
      services: stats.services
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
  console.log(`\nService Update Script (${options.dryRun ? 'DRY RUN' : 'LIVE MODE'})\n`);
  
  try {
    // Find service files
    const files = await findServiceFiles();
    
    // Process each service file
    for (const filePath of files) {
      await processService(filePath);
    }
    
    // Print summary
    console.log('\nSummary:');
    console.log(`Total services: ${stats.total}`);
    console.log(`Scanned: ${stats.scanned}`);
    console.log(`Updated: ${stats.updated}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    
    if (stats.updated > 0) {
      console.log(`\nUpdated services:`);
      stats.services
        .filter(service => service.status === 'updated')
        .forEach(service => console.log(`- ${service.name} (${service.domain})`));
    }
    
    if (stats.errors > 0) {
      console.log(`\nServices with errors:`);
      stats.services
        .filter(service => service.status === 'error')
        .forEach(service => console.log(`- ${service.name}: ${service.error}`));
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