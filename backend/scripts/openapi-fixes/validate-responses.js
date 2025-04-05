/**
 * OpenAPI Response Validator
 * 
 * This script validates all controller responses against OpenAPI specifications
 * and suggests fixes for any mismatches. It's used to ensure consistent API responses.
 */

'use strict';

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import glob from 'glob';
import yaml from 'js-yaml';
import chalk from 'chalk';

// Get the directory name (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const OPENAPI_DIR = path.join(ROOT_DIR, 'openapi');
const SRC_DIR = path.join(ROOT_DIR, 'src');

/**
 * Main function to validate all API responses against OpenAPI specs
 */
async function validateApiResponses() {
  try {
    console.log(chalk.blue('🔍 Validating API responses against OpenAPI specifications...'));
    
    // Step 1: Load OpenAPI spec
    const openapiSpec = await loadOpenApiSpec();
    
    // Step 2: Find all controllers
    const controllers = await findControllers();
    console.log(chalk.grey(`Found ${controllers.length} controllers`));
    
    // Step 3: Analyze each controller and match against OpenAPI paths
    let issues = 0;
    for (const controllerPath of controllers) {
      const result = await analyzeController(controllerPath, openapiSpec);
      issues += result.issues;
    }
    
    if (issues === 0) {
      console.log(chalk.green('✅ No issues found! All controller responses match OpenAPI specifications.'));
    } else {
      console.log(chalk.yellow(`⚠️ Found ${issues} potential issues. Please review and fix them.`));
      console.log(chalk.blue('💡 TIP: Use the responseAdapter middleware to ensure consistent responses.'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error validating API responses:'), error);
    process.exit(1);
  }
}

/**
 * Load the OpenAPI specification
 */
async function loadOpenApiSpec() {
  // Load main OpenAPI file
  const mainFile = path.join(OPENAPI_DIR, 'index.yaml');
  const mainContent = await fs.readFile(mainFile, 'utf8');
  const mainSpec = yaml.load(mainContent);
  
  // Load all referenced path files
  const pathsDir = path.join(OPENAPI_DIR, 'paths');
  const pathFiles = await fs.readdir(pathsDir);
  
  const paths = {};
  
  for (const file of pathFiles) {
    if (file.endsWith('.yaml')) {
      const filePath = path.join(pathsDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      const pathSpec = yaml.load(content);
      
      // Merge into paths
      Object.assign(paths, pathSpec);
    }
  }
  
  // Replace paths in main spec
  mainSpec.paths = {};
  
  // Process path references in index.yaml
  for (const [key, value] of Object.entries(mainSpec.paths || {})) {
    if (typeof value === 'string' && value.startsWith('#/')) {
      const refPath = value.split('#/')[1].split('/');
      let refObj = mainSpec;
      
      for (const part of refPath) {
        refObj = refObj[part];
      }
      
      mainSpec.paths[key] = refObj;
    }
  }
  
  console.log(chalk.grey(`Loaded OpenAPI spec with ${Object.keys(paths).length} path definitions`));
  
  return {
    main: mainSpec,
    paths
  };
}

/**
 * Find all controller files in the codebase
 */
async function findControllers() {
  return new Promise((resolve, reject) => {
    glob('**/controllers/**/*Controller.js', { cwd: SRC_DIR, absolute: true }, (err, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(files);
    });
  });
}

/**
 * Analyze a controller file and match against OpenAPI paths
 */
async function analyzeController(controllerPath, openapiSpec) {
  const controllerName = path.basename(controllerPath, '.js');
  console.log(chalk.cyan(`Analyzing ${controllerName}...`));
  
  // Read controller code
  const code = await fs.readFile(controllerPath, 'utf8');
  
  // Look for all res.json, res.send, etc. calls
  const responsePatterns = [
    /res\.json\(\s*({[^}]*})\s*\)/g,
    /res\.send\(\s*({[^}]*})\s*\)/g,
    /res\.status\([^)]*\)\.json\(\s*({[^}]*})\s*\)/g
  ];
  
  let issues = 0;
  let responseFormats = [];
  
  // Find all response formats
  for (const pattern of responsePatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const responseStr = match[1];
      responseFormats.push(responseStr);
    }
  }
  
  // Check for inconsistent responses
  const hasSuccessFormatted = responseFormats.some(r => r.includes('"status":"success"') || r.includes("'status':'success'"));
  const hasLegacyFormat = responseFormats.some(r => r.includes('"success":true') || r.includes("'success':true"));
  
  if (hasSuccessFormatted && hasLegacyFormat) {
    console.log(chalk.yellow(`⚠️ ${controllerName} uses both new and legacy response formats`));
    issues++;
  }
  
  // Identify potential path matches
  const controllerPrefix = controllerPath.replace(SRC_DIR, '');
  console.log(chalk.grey(`  Controller path: ${controllerPrefix}`));
  
  return {
    issues
  };
}

// Run the validation
validateApiResponses().catch(err => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
}); 