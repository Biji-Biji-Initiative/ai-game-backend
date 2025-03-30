/**
 * Migration Script for Evaluation Flow Test
 * 
 * This script moves the evaluation-flow.test.js from domain to integration category
 * and updates the test semantics to correctly follow integration test guidelines.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function migrateEvaluationFlowTest() {
  try {
    console.log('Starting migration of evaluation-flow.test.js...');
    
    // Define source and destination paths
    const sourcePath = path.join(rootDir, 'tests', 'domain', 'challenge', 'evaluation-flow.test.js');
    const destPath = path.join(rootDir, 'tests', 'integration', 'evaluation-flow.test.js');
    
    // Read the file content
    const content = await fs.readFile(sourcePath, 'utf8');
    
    // Update the test description to correctly identify as an integration test
    // This is already correct as the test description already includes "Integration: Evaluation Flow"
    
    // Check for existing file at destination
    try {
      await fs.access(destPath);
      console.log(`Warning: File already exists at ${destPath}`);
      console.log('Renaming destination to avoid overwriting...');
      
      // Create a backup if file already exists
      const backupPath = `${destPath}.bak`;
      await fs.copyFile(destPath, backupPath);
      console.log(`Created backup at ${backupPath}`);
    } catch (err) {
      // File doesn't exist, which is good
    }
    
    // Write the updated content to the destination path
    await fs.writeFile(destPath, content, 'utf8');
    console.log(`Successfully wrote file to ${destPath}`);
    
    // Now we can delete the original file
    await fs.unlink(sourcePath);
    console.log(`Deleted original file at ${sourcePath}`);
    
    console.log('Test migration completed successfully!');
    console.log('-----------------------------------------');
    console.log('Next steps:');
    console.log('1. Review the migrated test file to ensure it follows integration test semantics');
    console.log('2. Run the test to verify it functions correctly in its new location');
    console.log('3. Run the verification tool to confirm correct categorization');
    
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

// Run the migration
migrateEvaluationFlowTest(); 