#!/usr/bin/env node

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

const ignoreDirs = [
  'node_modules',
  '.git',
  'disabled_scripts',
  'tests',
  'coverage',
  'logs',
  'api-tester-ui',
  'supabase'
];

/**
 * Convert a single file from CommonJS to ES Modules
 * @param {string} filePath - Path to the file to convert
 * @returns {Promise<void>}
 */
async function convertFile(filePath) {
  console.log(chalk.blue(`Converting ${filePath}...`));
  
  return new Promise((resolve, reject) => {
    const cjstoesm = spawn('npx', [
      'cjstoesm',
      filePath,
      '--output', filePath,
      '--force'
    ]);
    
    cjstoesm.stdout.on('data', (data) => {
      console.log(chalk.gray(data.toString()));
    });
    
    cjstoesm.stderr.on('data', (data) => {
      console.error(chalk.red(data.toString()));
    });
    
    cjstoesm.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green(`✓ Successfully converted ${filePath}`));
        resolve();
      } else {
        console.error(chalk.red(`✗ Failed to convert ${filePath} with code ${code}`));
        reject(new Error(`Conversion failed with code ${code}`));
      }
    });
  });
}

/**
 * Find all JS files that need to be converted
 * @returns {Promise<string[]>} - Array of file paths
 */
async function findJSFiles() {
  const ignorePattern = `**/{${ignoreDirs.join(',')}}/**`;
  return glob('**/*.js', {
    cwd: rootDir,
    ignore: [ignorePattern, 'eslint.config.js', 'jest.*.js'],
    absolute: true
  });
}

/**
 * Check if a file is using CommonJS patterns
 * @param {string} filePath - Path to the file to check
 * @returns {Promise<boolean>} - True if the file uses CommonJS
 */
async function isCommonJSFile(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const hasRequire = content.includes('require(');
    const hasModuleExports = content.includes('module.exports');
    const hasExportsAssignment = /exports\.\w+\s*=/.test(content);
    
    return hasRequire || hasModuleExports || hasExportsAssignment;
  } catch (error) {
    console.error(chalk.red(`Error reading file ${filePath}: ${error.message}`));
    return false;
  }
}

/**
 * Update package.json to include type: 'module'
 */
async function updatePackageJson() {
  const packageJsonPath = path.join(rootDir, 'package.json');
  
  try {
    const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));
    
    if (packageJson.type !== 'module') {
      packageJson.type = 'module';
      await fs.promises.writeFile(
        packageJsonPath, 
        JSON.stringify(packageJson, null, 2) + '\n',
        'utf8'
      );
      console.log(chalk.green('✓ Updated package.json with type: module'));
    } else {
      console.log(chalk.gray('package.json already has type: module'));
    }
  } catch (error) {
    console.error(chalk.red(`Error updating package.json: ${error.message}`));
  }
}

/**
 * Main function to run the migration
 */
async function main() {
  try {
    console.log(chalk.yellow('Starting ESM migration process...'));
    
    // Step 1: Find JS files
    console.log(chalk.yellow('Finding JS files...'));
    const allFiles = await findJSFiles();
    console.log(chalk.blue(`Found ${allFiles.length} JS files to analyze`));
    
    // Step 2: Filter for CommonJS files
    console.log(chalk.yellow('Identifying CommonJS files...'));
    const filesToConvert = [];
    
    for (const file of allFiles) {
      if (await isCommonJSFile(file)) {
        filesToConvert.push(file);
      }
    }
    
    console.log(chalk.blue(`Identified ${filesToConvert.length} CommonJS files to convert`));
    
    // Step 3: Convert each file
    console.log(chalk.yellow('Converting files to ES Modules...'));
    
    // Convert files in batches to avoid system resource issues
    const batchSize = 10;
    for (let i = 0; i < filesToConvert.length; i += batchSize) {
      const batch = filesToConvert.slice(i, i + batchSize);
      await Promise.all(batch.map(convertFile));
      console.log(chalk.blue(`Converted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(filesToConvert.length / batchSize)}`));
    }
    
    // Step 4: Update package.json
    await updatePackageJson();
    
    console.log(chalk.green('ESM migration completed successfully!'));
    console.log(chalk.yellow('\nNext steps:'));
    console.log(chalk.yellow('1. Run tests to verify everything still works'));
    console.log(chalk.yellow('2. Fix any ESLint errors'));
    console.log(chalk.yellow('3. Check for any issues with circular dependencies'));
    console.log(chalk.yellow('4. Verify dynamic imports are working correctly'));
    
  } catch (error) {
    console.error(chalk.red(`Migration failed: ${error.message}`));
    process.exit(1);
  }
}

main(); 