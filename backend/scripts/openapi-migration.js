#!/usr/bin/env node

/**
 * OpenAPI Schema-First Migration Completion Script
 * 
 * This script completes the migration from JSDoc-based Swagger documentation
 * to a schema-first YAML approach with runtime validation.
 * 
 * It will:
 * 1. Check if the OpenAPI directories are set up correctly
 * 2. Bundle the OpenAPI specification
 * 3. Remove JSDoc @swagger annotations from controllers
 * 4. Set up the OpenAPI validator middleware
 * 5. Copy the new swaggerSetup.js file
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Run a command and log output
 * @param {string} command - Command to run
 * @param {string} label - Label for the command
 */
function runCommand(command, label) {
  console.log(`\n${colors.bright}${colors.cyan}=== ${label} ===${colors.reset}\n`);
  try {
    execSync(command, { stdio: 'inherit', cwd: rootDir });
    console.log(`\n${colors.green}✓ ${label} completed successfully${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`\n${colors.red}✗ ${label} failed: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Check if a directory exists
 * @param {string} dir - Directory to check
 * @returns {boolean} - Whether the directory exists
 */
function directoryExists(dir) {
  try {
    return fs.statSync(dir).isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Main function to migrate OpenAPI documentation
 */
async function main() {
  console.log(`\n${colors.bright}${colors.magenta}========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}  OpenAPI Schema-First Migration Script  ${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}========================================${colors.reset}\n`);
  
  // Step 1: Verify directory structure
  console.log(`${colors.bright}${colors.cyan}Step 1: Verifying OpenAPI directory structure${colors.reset}`);
  const openApiDir = path.join(rootDir, 'openapi');
  const requiredDirs = [
    path.join(openApiDir, 'components'),
    path.join(openApiDir, 'components', 'schemas'),
    path.join(openApiDir, 'components', 'parameters'),
    path.join(openApiDir, 'components', 'responses'),
    path.join(openApiDir, 'paths')
  ];
  
  const missingDirs = requiredDirs.filter(dir => !directoryExists(dir));
  
  if (missingDirs.length > 0) {
    console.error(`${colors.red}Error: The following directories are missing:${colors.reset}`);
    missingDirs.forEach(dir => console.error(`${colors.red}- ${dir}${colors.reset}`));
    console.error(`${colors.red}Please set up the OpenAPI directory structure before running this script.${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.green}✓ OpenAPI directory structure verified${colors.reset}`);
  
  // Step 2: Bundle the OpenAPI specification
  if (!runCommand('npm run swagger:bundle', 'Step 2: Bundle OpenAPI specification')) {
    console.error(`${colors.red}Error: Failed to bundle OpenAPI specification.${colors.reset}`);
    process.exit(1);
  }
  
  // Step 3: Remove JSDoc @swagger annotations
  if (!runCommand('npm run swagger:remove-jsdoc', 'Step 3: Remove JSDoc @swagger annotations')) {
    console.warn(`${colors.yellow}Warning: Failed to remove JSDoc @swagger annotations. Continuing...${colors.reset}`);
  }
  
  // Step 4: Set up the OpenAPI validator middleware
  if (!runCommand('npm run swagger:setup-validator', 'Step 4: Set up OpenAPI validator middleware')) {
    console.error(`${colors.red}Error: Failed to set up OpenAPI validator middleware.${colors.reset}`);
    process.exit(1);
  }
  
  // Step 5: Copy new swaggerSetup.js file if it exists
  console.log(`\n${colors.bright}${colors.cyan}Step 5: Update Swagger UI setup${colors.reset}\n`);
  const newSwaggerSetupPath = path.join(rootDir, 'src', 'config', 'swaggerSetup.new.js');
  const swaggerSetupPath = path.join(rootDir, 'src', 'config', 'swaggerSetup.js');
  
  if (fs.existsSync(newSwaggerSetupPath)) {
    try {
      fs.copyFileSync(newSwaggerSetupPath, swaggerSetupPath);
      console.log(`${colors.green}✓ Updated Swagger UI setup${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}✗ Failed to update Swagger UI setup: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  } else {
    console.warn(`${colors.yellow}Warning: New swagger setup file not found (${newSwaggerSetupPath}). Skipping...${colors.reset}`);
  }
  
  // Done!
  console.log(`\n${colors.bright}${colors.green}===============================================${colors.reset}`);
  console.log(`${colors.bright}${colors.green}  OpenAPI Schema-First Migration Completed!    ${colors.reset}`);
  console.log(`${colors.bright}${colors.green}===============================================${colors.reset}\n`);
  console.log(`${colors.cyan}What's been done:${colors.reset}`);
  console.log(`${colors.cyan}1. OpenAPI specification has been bundled${colors.reset}`);
  console.log(`${colors.cyan}2. JSDoc @swagger annotations have been removed${colors.reset}`);
  console.log(`${colors.cyan}3. OpenAPI validator middleware has been set up${colors.reset}`);
  console.log(`${colors.cyan}4. Swagger UI has been updated to use the bundled specification${colors.reset}\n`);
  
  console.log(`${colors.cyan}Next steps:${colors.reset}`);
  console.log(`${colors.cyan}1. Start the server to test the new documentation${colors.reset}`);
  console.log(`${colors.cyan}2. Check the API documentation at /api-docs${colors.reset}`);
  console.log(`${colors.cyan}3. Verify that runtime validation is working${colors.reset}`);
  console.log(`${colors.cyan}4. Review the API documentation guide at docs/api-documentation-guide.md${colors.reset}\n`);
}

main().catch(error => {
  console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
  process.exit(1);
}); 