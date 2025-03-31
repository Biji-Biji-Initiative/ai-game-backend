#!/usr/bin/env node

/**
 * Repository Update Script
 * 
 * This script automatically identifies and updates repositories that use direct event publishing
 * to use the standardized entity-based event collection pattern instead.
 * 
 * Usage:
 *   node scripts/update-repositories.js [options]
 * 
 * Options:
 *   --dry-run       Run without making changes, show what would be updated
 *   --verbose       Show detailed logging
 *   --path=PATH     Only process repositories in the specified path
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
Repository Update Script

This script automatically identifies and updates repositories that use direct event publishing
to use the standardized entity-based event collection pattern instead.

Usage:
  node scripts/update-repositories.js [options]

Options:
  --dry-run       Run without making changes, show what would be updated
  --verbose       Show detailed logging
  --path=PATH     Only process repositories in the specified path
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
  repositories: [] // Will store details about each repository
};

// Timestamp for logging and reports
const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');

/**
 * Find repository files
 * @returns {Promise<string[]>} Array of file paths
 */
async function findRepositoryFiles() {
  return new Promise((resolve, reject) => {
    const pattern = options.path || 'src/**/repositories/**/*Repository.js';
    log.info(`Searching for repository files: ${pattern}`);
    
    glob(pattern).then(files => {
      stats.total = files.length;
      log.info(`Found ${files.length} repository files`);
      resolve(files);
    }).catch(err => {
      log.error(`Failed to find repository files: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Check if a repository uses direct event publishing
 * @param {string} content - File content
 * @returns {boolean} True if repository uses direct event publishing
 */
function usesDirectEventPublishing(content) {
  // Check for various patterns of direct event publishing
  const patterns = [
    /eventBus\.publish\s*\(\s*['"]([^'"]+)['"]\s*,/,
    /eventBus\.publish\s*\(\s*\{/,
    /eventBus\.publish\s*\(\s*EventTypes\./,
    /await\s+this\.eventBus\.publish/,
    /eventBus\.publishEvent\s*\(/,
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
 * Transform a repository file to use entity-based event collection
 * @param {string} content - File content
 * @param {string} repositoryName - Repository name
 * @returns {string} Transformed content
 */
function transformRepository(content, repositoryName) {
  log.verbose(`Transforming ${repositoryName}`);
  
  let updatedContent = content;
  
  // Transform 1: Replace direct event publishing in update methods
  updatedContent = updatedContent.replace(
    /(async\s+update[A-Za-z]*\s*\([^)]*\)\s*\{[\s\S]*?)(await\s+this\.eventBus\.publish\s*\(\s*(?:EventTypes\.[A-Z_]+|['"][A-Z_]+['"])\s*,[\s\S]*?\)\s*;)([\s\S]*?return\s+[^;]*;)/g,
    (match, beforePublish, publishStatement, afterPublish) => {
      // Extract event type and entity ID from the publish statement
      const eventTypeMatch = publishStatement.match(/EventTypes\.([A-Z_]+)|['"]([A-Z_]+)['"]/);
      const entityIdMatch = publishStatement.match(/(\w+Id)\s*[:=]\s*['"]?([^'",}\s]+)['"]?/);
      
      const eventType = eventTypeMatch ? (eventTypeMatch[1] || eventTypeMatch[2]) : 'ENTITY_UPDATED';
      const entityIdVar = entityIdMatch ? entityIdMatch[1] : null;
      
      let transformedCode = beforePublish;
      
      if (entityIdVar) {
        // Add entity-based event collection
        transformedCode += `
    // Find entity to add domain event
    const entity = await this.findById(${entityIdVar});
    if (entity) {
      // Add domain event to entity
      entity.addDomainEvent(EventTypes.${eventType}, {
        // Add relevant event data
        ${entityIdVar}: ${entityIdVar}
      });
      
      // Save entity which will publish the event
      await this.save(entity);
    }`;
      } else {
        // If we can't identify the entity ID, add a comment to manually review
        transformedCode += `
    // TODO: Replace direct event publishing with entity-based event collection
    // ${publishStatement.trim()}
    // Get entity and add domain event:
    // entity.addDomainEvent(EventTypes.${eventType}, { entityId: entityId });
    // await this.save(entity);
    ${publishStatement}`;
      }
      
      transformedCode += afterPublish;
      return transformedCode;
    }
  );
  
  // Transform 2: Replace direct event publishing in delete methods
  updatedContent = updatedContent.replace(
    /(async\s+delete[A-Za-z]*\s*\([^)]*\)\s*\{[\s\S]*?)(await\s+this\.eventBus\.publish\s*\(\s*(?:EventTypes\.[A-Z_]+|['"][A-Z_]+['"])\s*,[\s\S]*?\)\s*;)([\s\S]*?return\s+[^;]*;)/g,
    (match, beforeDelete, publishStatement, afterDelete) => {
      return `${beforeDelete}
    // Use _deleteWithEvents helper to handle entity-based event collection
    return await this._deleteWithEvents(
      entityId,
      async (id) => await this.findById(id),
      EventTypes.ENTITY_DELETED,
      async (transaction) => {
        // Perform delete operation with transaction
        const { error } = await transaction
          .from(this.tableName)
          .delete()
          .eq('id', entityId);
          
        if (error) {
          throw new DatabaseError(\`Failed to delete entity: \${error.message}\`, {
            cause: error,
            entityType: this.domainName,
            operation: 'delete',
            metadata: { entityId }
          });
        }
        
        return true;
      }
    );${afterDelete}`;
    }
  );
  
  // Transform 3: Replace direct event publishing in create methods
  updatedContent = updatedContent.replace(
    /(async\s+create[A-Za-z]*\s*\([^)]*\)\s*\{[\s\S]*?)(await\s+this\.eventBus\.publish\s*\(\s*(?:EventTypes\.[A-Z_]+|['"][A-Z_]+['"])\s*,[\s\S]*?\)\s*;)([\s\S]*?return\s+[^;]*;)/g,
    (match, beforeCreate, publishStatement, afterCreate) => {
      return `${beforeCreate}
    // Entity should now have addDomainEvent to collect events during creation
    // Events will be published after successful transaction
    // Remove direct event publishing: ${publishStatement.trim()}${afterCreate}`;
    }
  );
  
  // Transform 4: Replace save methods to use _saveWithEvents
  if (updatedContent.includes('async save(') && !updatedContent.includes('_saveWithEvents')) {
    updatedContent = updatedContent.replace(
      /(async\s+save\s*\([^)]*\)\s*\{)/,
      `$1
    // Use _saveWithEvents helper to handle entity-based event collection
    return this._saveWithEvents(
      entity,
      async (transaction) => {
        // Rest of the save implementation...
`
    );
  }
  
  // Transform 5: Process special case for evaluationRepository.updateEvaluation
  if (repositoryName === 'evaluationRepository') {
    log.verbose('Manually checking evaluationRepository for direct event publishing');
    
    // Check if file includes direct event publishing in updateEvaluation
    if (content.includes('eventBus.publish') && content.includes('EVALUATION_UPDATED')) {
      log.success('Found direct event publishing in evaluationRepository');
      
      // Replace direct event publishing with entity-based collection
      updatedContent = updatedContent.replace(
        /(async\s+updateEvaluation\s*\([^)]*\)\s*\{[\s\S]*?)(await\s+this\.eventBus\.publish\s*\(\s*\{[\s\S]*?type\s*:\s*EventTypes\.EVALUATION_UPDATED[\s\S]*?\}\s*\)\s*;)([\s\S]*?return\s+updatedEvaluation\s*;)/g,
        (match, before, eventPublish, after) => {
          return `${before}
    // Find evaluation entity and add domain event
    const evaluationEntity = await this.findById(evaluationId);
    if (evaluationEntity) {
      evaluationEntity.addDomainEvent(EventTypes.EVALUATION_UPDATED, {
        evaluationId: updatedEvaluation.id,
        userId: updatedEvaluation.userId,
        challengeId: updatedEvaluation.challengeId,
        score: updatedEvaluation.score,
        timestamp: updatedEvaluation.updatedAt
      });
      
      // Save entity with events
      await this.save(evaluationEntity);
    }${after}`;
        }
      );
    }
  }
  
  return updatedContent;
}

/**
 * Process a repository file
 * @param {string} filePath - Path to the repository file
 */
async function processRepository(filePath) {
  const repositoryName = path.basename(filePath, '.js');
  log.verbose(`Processing ${repositoryName}`);
  
  try {
    stats.scanned++;
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if repository uses direct event publishing
    if (!usesDirectEventPublishing(content)) {
      log.verbose(`${repositoryName} does not use direct event publishing, skipping`);
      stats.skipped++;
      stats.repositories.push({
        name: repositoryName,
        status: 'skipped',
        reason: 'No direct event publishing found'
      });
      return;
    }
    
    log.info(`${repositoryName} uses direct event publishing, transforming`);
    
    // Transform repository
    const updatedContent = transformRepository(content, repositoryName);
    
    // Check if content was actually changed
    if (content === updatedContent) {
      log.warn(`No changes made to ${repositoryName}, might need manual review`);
      stats.skipped++;
      stats.repositories.push({
        name: repositoryName,
        status: 'skipped',
        reason: 'No changes after transformation'
      });
      return;
    }
    
    // Update file if not in dry run mode
    if (!options.dryRun) {
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      log.success(`Updated ${repositoryName}`);
    } else {
      log.success(`Would update ${repositoryName} (dry run)`);
    }
    
    stats.updated++;
    stats.repositories.push({
      name: repositoryName,
      status: 'updated'
    });
  } catch (error) {
    log.error(`Error processing ${repositoryName}: ${error.message}`);
    stats.errors++;
    stats.repositories.push({
      name: repositoryName,
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
    
    const reportPath = path.join(reportDir, `repository-update-${timestamp}.json`);
    
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
      repositories: stats.repositories
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
  console.log(`\nRepository Update Script (${options.dryRun ? 'DRY RUN' : 'LIVE MODE'})\n`);
  
  try {
    // Find repository files
    const files = await findRepositoryFiles();
    
    // Process each repository file
    for (const filePath of files) {
      await processRepository(filePath);
    }
    
    // Print summary
    console.log('\nSummary:');
    console.log(`Total repositories: ${stats.total}`);
    console.log(`Scanned: ${stats.scanned}`);
    console.log(`Updated: ${stats.updated}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    
    if (stats.updated > 0) {
      console.log(`\nUpdated repositories:`);
      stats.repositories
        .filter(repo => repo.status === 'updated')
        .forEach(repo => console.log(`- ${repo.name}`));
    }
    
    if (stats.errors > 0) {
      console.log(`\nRepositories with errors:`);
      stats.repositories
        .filter(repo => repo.status === 'error')
        .forEach(repo => console.log(`- ${repo.name}: ${repo.error}`));
    }
    
    // Save report
    const reportPath = saveReport();
    if (reportPath) {
      console.log(`\nDetailed report saved to: ${reportPath}`);
      console.log(`Run the checklist update script to update the migration status:`);
      console.log(`node scripts/update-repository-checklist.js ${reportPath}`);
    }
    
    console.log(`\nDone!\n`);
  } catch (error) {
    log.error(`Script failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main(); 