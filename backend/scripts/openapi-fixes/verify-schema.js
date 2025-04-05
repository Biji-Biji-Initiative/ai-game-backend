/**
 * OpenAPI Schema Verifier
 * 
 * This script checks all OpenAPI schema files to ensure they use 
 * the standard response format with status/data structure.
 */

'use strict';

import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import chalk from 'chalk';

const OPENAPI_PATH = path.join(process.cwd(), 'openapi');
const PATHS_DIR = path.join(OPENAPI_PATH, 'paths');

/**
 * Main function that verifies all schemas in the OpenAPI paths directory
 */
async function verifySchemas() {
  console.log(chalk.cyan('🔍 Verifying OpenAPI schemas for standard response format...'));
  
  try {
    // Get all YAML files from the paths directory
    const files = await fs.readdir(PATHS_DIR);
    const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
    
    console.log(chalk.gray(`Found ${yamlFiles.length} schema files to check`));
    
    const results = {
      total: yamlFiles.length,
      consistent: 0,
      inconsistent: 0,
      issues: []
    };
    
    // Process each YAML file
    for (const file of yamlFiles) {
      const filePath = path.join(PATHS_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');
      
      try {
        const spec = yaml.load(content);
        const fileIssues = checkPathSpec(spec, file);
        
        if (fileIssues.length === 0) {
          results.consistent++;
          console.log(chalk.green(`✅ ${file}: Uses standard response format`));
        } else {
          results.inconsistent++;
          console.log(chalk.yellow(`⚠️ ${file}: Has ${fileIssues.length} response format issues`));
          
          for (const issue of fileIssues) {
            console.log(chalk.gray(`   - ${issue}`));
          }
          
          results.issues.push({
            file,
            issues: fileIssues
          });
        }
      } catch (err) {
        console.error(chalk.red(`❌ Error parsing ${file}: ${err.message}`));
        results.issues.push({
          file,
          issues: [`Failed to parse YAML: ${err.message}`]
        });
        results.inconsistent++;
      }
    }
    
    // Print summary
    console.log('\n' + chalk.cyan('📊 Verification Summary:'));
    console.log(chalk.white(`Total files checked: ${results.total}`));
    console.log(chalk.green(`Files with consistent format: ${results.consistent}`));
    console.log(chalk.yellow(`Files with inconsistent format: ${results.inconsistent}`));
    
    if (results.inconsistent > 0) {
      console.log('\n' + chalk.yellow('🛠️ Recommendations:'));
      console.log(chalk.white('1. Update all response schemas to follow the standard format:'));
      console.log(chalk.gray('   - Success responses should use "status" and "data" properties'));
      console.log(chalk.gray('   - Error responses should use "status", "message", and "code" properties'));
      console.log(chalk.white('2. Use the response adapter middleware to transform actual responses'));
    } else {
      console.log('\n' + chalk.green('🎉 All schemas are using the standard response format!'));
    }
    
    return results;
  } catch (err) {
    console.error(chalk.red(`❌ Error verifying schemas: ${err.message}`));
    throw err;
  }
}

/**
 * Checks a single path specification for standard response format
 * @param {Object} spec - The OpenAPI path specification
 * @param {string} fileName - The file name for reporting
 * @returns {Array<string>} Array of issues found, empty if none
 */
function checkPathSpec(spec, fileName) {
  const issues = [];
  
  // Check each path
  for (const path in spec) {
    const pathObj = spec[path];
    
    // Check each operation (GET, POST, etc.)
    for (const method in pathObj) {
      if (method === 'parameters') continue; // Skip path parameters
      
      const operation = pathObj[method];
      
      // Skip if no responses defined
      if (!operation.responses) continue;
      
      // Check each response
      for (const statusCode in operation.responses) {
        // Only check success responses (2xx)
        if (!statusCode.startsWith('2')) continue;
        
        const response = operation.responses[statusCode];
        
        // Skip if no content or schema defined
        if (!response.content || 
            !response.content['application/json'] || 
            !response.content['application/json'].schema) {
          issues.push(`${path} ${method.toUpperCase()} ${statusCode} response: Missing schema`);
          continue;
        }
        
        const schema = response.content['application/json'].schema;
        
        // Check for $ref
        if (schema.$ref) {
          // We don't directly check references, but could be added in a future version
          continue;
        }
        
        // Check properties
        if (schema.type === 'object' && schema.properties) {
          const props = schema.properties;
          
          // Check for status property
          if (!props.status) {
            issues.push(`${path} ${method.toUpperCase()} ${statusCode} response: Missing 'status' property`);
          }
          
          // Check for data property for success responses
          if (!props.data) {
            issues.push(`${path} ${method.toUpperCase()} ${statusCode} response: Missing 'data' property`);
          }
        } else {
          issues.push(`${path} ${method.toUpperCase()} ${statusCode} response: Schema is not an object with properties`);
        }
      }
    }
  }
  
  return issues;
}

// Run the verification if script is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  verifySchemas()
    .then(results => {
      process.exit(results.inconsistent > 0 ? 1 : 0);
    })
    .catch(() => {
      process.exit(1);
    });
}

export { verifySchemas }; 