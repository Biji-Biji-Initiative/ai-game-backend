/**
 * Script to remove JSDoc @swagger annotations from controller files.
 * 
 * This script searches for all controller files in the codebase and
 * removes the @swagger JSDoc blocks, as we've moved to a schema-first
 * approach with separate YAML files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the core directory containing controllers
const coreDir = path.resolve(__dirname, '..', 'core');

// Statistics
let filesScanned = 0;
let annotationsRemoved = 0;
let filesModified = 0;

/**
 * Remove @swagger JSDoc annotations from a file
 * @param {string} filePath - Path to the file
 * @returns {boolean} - Whether the file was modified
 */
function removeSwaggerAnnotations(filePath) {
  try {
    console.log(`Processing ${filePath}`);
    
    // Read the file content
    let content = fs.readFileSync(filePath, 'utf8');
    filesScanned++;
    
    // Define regex to match @swagger JSDoc blocks
    const swaggerRegex = /\/\*\*[\s\S]*?@swagger[\s\S]*?\*\//g;
    
    // Count how many annotations we'll remove
    const matches = content.match(swaggerRegex);
    const countBefore = matches ? matches.length : 0;
    
    if (countBefore === 0) {
      console.log(`  No @swagger annotations found`);
      return false;
    }
    
    // Remove the @swagger blocks
    content = content.replace(swaggerRegex, (match) => {
      // If the JSDoc block only contains @swagger, remove it entirely
      if (!match.includes('@param') && !match.includes('@returns') && 
          !match.includes('@description') && !match.includes('@deprecated')) {
        annotationsRemoved++;
        return '';
      }
      
      // Otherwise, keep the JSDoc block but remove the @swagger part
      const lines = match.split('\n');
      const filteredLines = lines.filter(line => !line.includes('@swagger'));
      annotationsRemoved++;
      return filteredLines.join('\n');
    });
    
    // Check if content was modified
    const countAfter = (content.match(/@swagger/g) || []).length;
    
    if (countBefore > countAfter) {
      // Write the modified content back
      fs.writeFileSync(filePath, content, 'utf8');
      filesModified++;
      console.log(`  Removed ${countBefore - countAfter} @swagger annotations`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Main function to process all controller files
 */
async function main() {
  console.log('Removing @swagger JSDoc annotations from controller files...');
  
  try {
    // Find all controller files
    const controllerFiles = await glob('**/controllers/**/*.js', { 
      cwd: coreDir, 
      absolute: true 
    });
    
    // Also check for routes with JSDoc swagger annotations
    const routeFiles = await glob('**/routes/**/*.js', { 
      cwd: coreDir, 
      absolute: true 
    });
    
    const allFiles = [...controllerFiles, ...routeFiles];
    
    if (allFiles.length === 0) {
      console.log('No controller or route files found');
      return;
    }
    
    console.log(`Found ${allFiles.length} controller and route files`);
    
    // Process each file
    for (const file of allFiles) {
      removeSwaggerAnnotations(file);
    }
    
    // Report results
    console.log('\nRemoval complete!');
    console.log(`Files scanned: ${filesScanned}`);
    console.log(`@swagger annotations removed: ${annotationsRemoved}`);
    console.log(`Files modified: ${filesModified}`);
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main(); 