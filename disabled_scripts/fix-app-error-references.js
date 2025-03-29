#!/usr/bin/env node

/**
 * Script to fix undefined AppError references
 * This script adds missing import statements for AppError references
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Config
const DRY_RUN = false; // Set to true to just see what would be fixed

/**
 * Main function
 */
async function main() {
  console.log('Starting fix for undefined AppError references...');

  // Find all JavaScript files
  const files = await glob('src/**/*.js');
  console.log(`Found ${files.length} JavaScript files to process`);

  let totalFilesChanged = 0;
  let totalImportsAdded = 0;

  // Process each file
  for (const file of files) {
    const result = processFile(file);
    if (result.changed) {
      totalFilesChanged++;
      totalImportsAdded += result.importsAdded;
    }
  }

  console.log('\nSummary:');
  console.log(`Files changed: ${totalFilesChanged}`);
  console.log(`Import statements added: ${totalImportsAdded}`);

  if (DRY_RUN) {
    console.log('\nThis was a dry run. No files were modified.');
  }
}

/**
 * Process a single file to fix AppError references
 * @param {string} filePath - Path to the file
 * @returns {Object} - Statistics about changes made
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Skip files that don't use AppError
    if (!content.includes('AppError')) {
      return { changed: false, importsAdded: 0 };
    }
    
    // Check if AppError is already imported
    const hasAppErrorImport = /require\(['"].*AppError['"]\)/.test(content) ||
                             /import.*AppError.*from/.test(content);
    
    // If AppError is used but not imported, add the import
    if (!hasAppErrorImport && /\bAppError\b/.test(content)) {
      // Determine the appropriate path for the import
      let importStatement = null;
      
      // Determine the relative path to AppError based on the file's location
      const fileParts = filePath.split(path.sep);
      const domainLevel = fileParts.findIndex(part => part === 'core') + 1;
      
      if (domainLevel > 0) {
        const pathToInfra = '../'.repeat(fileParts.length - domainLevel) + 'core/infra/errors/AppError';
        importStatement = `const { AppError } = require('${pathToInfra}');\n`;
      } else {
        // Default path if we can't determine the correct relative path
        importStatement = "const { AppError } = require('../core/infra/errors/AppError');\n";
      }
      
      // Add the import statement after other imports
      let newContent = content;
      const lines = content.split('\n');
      let lastImportLine = -1;
      
      // Find the last import line
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('require(') || lines[i].includes('import ')) {
          lastImportLine = i;
        }
      }
      
      // If we found imports, add after the last one
      if (lastImportLine >= 0) {
        lines.splice(lastImportLine + 1, 0, importStatement);
        newContent = lines.join('\n');
      } else {
        // If no imports found, add at the beginning of the file
        newContent = importStatement + content;
      }
      
      console.log(`Adding AppError import to ${path.basename(filePath)}`);
      
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
      }
      
      return { changed: true, importsAdded: 1 };
    }
    
    return { changed: false, importsAdded: 0 };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { changed: false, importsAdded: 0 };
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 