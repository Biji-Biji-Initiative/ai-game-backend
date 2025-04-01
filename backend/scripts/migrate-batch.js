#!/usr/bin/env node

// ES Module Migration Batch Script
// 
// This script takes a list of files as arguments and converts them from CommonJS to ES Modules.
// 
// Usage: 
//   node scripts/migrate-batch.js file1.js file2.js file3.js
//   node scripts/migrate-batch.js "src/core/common/**/*.js" (use quotes for glob patterns)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { glob } from 'glob';
import chalk from 'chalk';

// Get the directory name in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Convert a single file from CommonJS to ES Modules
async function convertFile(filePath) {
  console.log(chalk.blue(`Converting ${filePath}...`));
  
  const tempDir = path.join(rootDir, 'temp_esm_conversion');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  return new Promise((resolve, reject) => {
    const cjstoesm = spawn('npx', [
      'cjstoesm',
      filePath,
      tempDir
    ]);
    
    cjstoesm.stdout.on('data', (data) => {
      console.log(chalk.gray(data.toString().trim()));
    });
    
    cjstoesm.stderr.on('data', (data) => {
      console.error(chalk.red(data.toString().trim()));
    });
    
    cjstoesm.on('close', (code) => {
      if (code === 0) {
        // Copy the converted file back to its original location
        const filename = path.basename(filePath);
        const convertedFilePath = path.join(tempDir, filename);
        
        try {
          fs.copyFileSync(convertedFilePath, filePath);
          console.log(chalk.green(`✓ Successfully converted ${filePath}`));
          resolve();
        } catch (error) {
          console.error(chalk.red(`✗ Failed to copy converted file: ${error.message}`));
          reject(new Error(`Copy failed: ${error.message}`));
        }
      } else {
        console.error(chalk.red(`✗ Failed to convert ${filePath} with code ${code}`));
        reject(new Error(`Conversion failed with code ${code}`));
      }
    });
  });
}

// Process glob patterns to expand to file paths
async function expandGlobPatterns(patterns) {
  let allFiles = [];
  
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      // It's a glob pattern
      const files = await glob(pattern, { cwd: rootDir, absolute: true });
      allFiles = [...allFiles, ...files];
    } else {
      // It's a direct file path
      const absolutePath = path.isAbsolute(pattern) ? pattern : path.resolve(rootDir, pattern);
      allFiles.push(absolutePath);
    }
  }
  
  return [...new Set(allFiles)]; // Remove duplicates
}

// Main function to run the migration
async function main() {
  try {
    const filePatterns = process.argv.slice(2);
    
    if (filePatterns.length === 0) {
      console.error(chalk.red('No files specified. Please provide file paths or glob patterns.'));
      console.log(chalk.yellow('Usage: node scripts/migrate-batch.js file1.js file2.js "src/**/*.js"'));
      process.exit(1);
    }
    
    console.log(chalk.yellow('Starting ESM migration process...'));
    
    // Expand glob patterns to file paths
    const filesToConvert = await expandGlobPatterns(filePatterns);
    
    if (filesToConvert.length === 0) {
      console.error(chalk.red('No files match the specified patterns.'));
      process.exit(1);
    }
    
    console.log(chalk.blue(`Found ${filesToConvert.length} files to convert`));
    
    // Convert files in batches to avoid system resource issues
    const batchSize = 5;
    for (let i = 0; i < filesToConvert.length; i += batchSize) {
      const batch = filesToConvert.slice(i, i + batchSize);
      await Promise.all(batch.map(convertFile));
      console.log(chalk.blue(`Converted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(filesToConvert.length / batchSize)}`));
    }
    
    console.log(chalk.green('ES Module migration completed successfully!'));
    console.log(chalk.yellow('\nNext steps:'));
    console.log(chalk.yellow('1. Run tests to verify everything still works'));
    console.log(chalk.yellow('2. Fix any ESLint errors with: npm run migrate:esm:check'));
    console.log(chalk.yellow('3. Check for any issues with circular dependencies'));
    
  } catch (error) {
    console.error(chalk.red(`Migration failed: ${error.message}`));
    process.exit(1);
  }
}

main(); 