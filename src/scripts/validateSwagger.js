#!/usr/bin/env node

/**
 * Swagger Validation Script
 * 
 * This script validates the Swagger/OpenAPI documentation for the API.
 * It uses swagger-parser to:
 * 1. Validate that the OpenAPI specification is valid
 * 2. Verify that all references resolve correctly
 * 3. Check for common issues in the documentation
 * 
 * Usage: node validateSwagger.js
 */

import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import SwaggerParser from '@apidevtools/swagger-parser';
import chalk from 'chalk';
import swaggerJsDoc from 'swagger-jsdoc';
import getSwaggerOptions from "@/config/swagger.js";

// Set up directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Get Swagger options and generate documentation
const swaggerOptions = getSwaggerOptions();
const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Log validation start
console.log(chalk.blue.bold('Starting Swagger validation...'));
console.log(chalk.gray(`OpenAPI Version: ${swaggerDocs.openapi}`));
console.log(chalk.gray(`API Title: ${swaggerDocs.info.title}`));
console.log(chalk.gray(`API Version: ${swaggerDocs.info.version}`));
console.log('');

// Track statistics
const stats = {
  endpoints: 0,
  paths: 0,
  schemas: 0,
  examples: 0,
  errors: 0,
  warnings: 0
};

/**
 * Validate and process the Swagger document
 */
async function validateSwagger() {
  try {
    // Validate the Swagger document
    console.log(chalk.blue('Validating Swagger document...'));
    
    // Deep validate (resolves all references)
    const api = await SwaggerParser.validate(swaggerDocs);
    
    // Count paths and operations
    stats.paths = Object.keys(api.paths).length;
    for (const path in api.paths) {
      for (const method in api.paths[path]) {
        if (method !== 'parameters') {
          stats.endpoints++;
        }
      }
    }
    
    // Count schemas
    if (api.components && api.components.schemas) {
      stats.schemas = Object.keys(api.components.schemas).length;
    }
    
    // Count examples
    function countExamples(obj) {
      if (!obj) return 0;
      let count = 0;
      
      // Count direct examples
      if (obj.examples) {
        count += Object.keys(obj.examples).length;
      }
      
      // Count example property
      if (obj.example) {
        count++;
      }
      
      // Recurse through properties
      if (obj.properties) {
        for (const prop in obj.properties) {
          count += countExamples(obj.properties[prop]);
        }
      }
      
      // Count items for arrays
      if (obj.items) {
        count += countExamples(obj.items);
      }
      
      // Count request bodies
      if (obj.requestBody && obj.requestBody.content) {
        for (const mediaType in obj.requestBody.content) {
          count += countExamples(obj.requestBody.content[mediaType]);
        }
      }
      
      // Count responses
      if (obj.responses) {
        for (const status in obj.responses) {
          if (obj.responses[status].content) {
            for (const mediaType in obj.responses[status].content) {
              count += countExamples(obj.responses[status].content[mediaType]);
            }
          }
        }
      }
      
      return count;
    }
    
    // Count examples in the API
    stats.examples = countExamples(api);
    
    // Perform additional checks
    console.log(chalk.blue('Performing additional checks...'));
    
    // Check for paths without operation IDs
    console.log(chalk.gray('- Checking for missing operationIds...'));
    for (const path in api.paths) {
      for (const method in api.paths[path]) {
        if (method !== 'parameters') {
          const operation = api.paths[path][method];
          if (!operation.operationId) {
            console.log(chalk.yellow(`  Warning: ${method.toUpperCase()} ${path} is missing an operationId`));
            stats.warnings++;
          }
        }
      }
    }
    
    // Check for operations without tags
    console.log(chalk.gray('- Checking for missing tags...'));
    for (const path in api.paths) {
      for (const method in api.paths[path]) {
        if (method !== 'parameters') {
          const operation = api.paths[path][method];
          if (!operation.tags || operation.tags.length === 0) {
            console.log(chalk.yellow(`  Warning: ${method.toUpperCase()} ${path} is missing tags`));
            stats.warnings++;
          }
        }
      }
    }
    
    // Check for operations without responses
    console.log(chalk.gray('- Checking for missing responses...'));
    for (const path in api.paths) {
      for (const method in api.paths[path]) {
        if (method !== 'parameters') {
          const operation = api.paths[path][method];
          if (!operation.responses || Object.keys(operation.responses).length === 0) {
            console.log(chalk.red(`  Error: ${method.toUpperCase()} ${path} is missing responses`));
            stats.errors++;
          }
        }
      }
    }
    
    // Check for POST/PUT operations without request bodies
    console.log(chalk.gray('- Checking for missing request bodies...'));
    for (const path in api.paths) {
      for (const method in api.paths[path]) {
        if ((method === 'post' || method === 'put') && method !== 'parameters') {
          const operation = api.paths[path][method];
          if (!operation.requestBody) {
            console.log(chalk.yellow(`  Warning: ${method.toUpperCase()} ${path} is missing a request body`));
            stats.warnings++;
          }
        }
      }
    }
    
    // Check for response schemas
    console.log(chalk.gray('- Checking for missing response schemas...'));
    for (const path in api.paths) {
      for (const method in api.paths[path]) {
        if (method !== 'parameters') {
          const operation = api.paths[path][method];
          if (operation.responses) {
            for (const status in operation.responses) {
              const response = operation.responses[status];
              if (
                status.match(/^2\d\d$/) && // Only check 2xx responses
                response.content && 
                response.content['application/json'] && 
                !response.content['application/json'].schema
              ) {
                console.log(chalk.yellow(`  Warning: ${method.toUpperCase()} ${path} has 2xx response without schema`));
                stats.warnings++;
              }
            }
          }
        }
      }
    }
    
    // Print validation success
    console.log('');
    console.log(chalk.green.bold('✓ Swagger documentation is valid!'));
    console.log('');
    
    // Print statistics
    console.log(chalk.blue.bold('Documentation Statistics:'));
    console.log(chalk.gray(`- API Paths: ${stats.paths}`));
    console.log(chalk.gray(`- API Endpoints: ${stats.endpoints}`));
    console.log(chalk.gray(`- Defined Schemas: ${stats.schemas}`));
    console.log(chalk.gray(`- Examples/Samples: ${stats.examples}`));
    console.log(chalk.gray(`- Warnings: ${stats.warnings}`));
    console.log(chalk.gray(`- Errors: ${stats.errors}`));
    console.log('');
    
    if (stats.errors > 0) {
      console.log(chalk.red.bold(`⚠️ Found ${stats.errors} errors that should be fixed.`));
      process.exit(1);
    } else if (stats.warnings > 0) {
      console.log(chalk.yellow.bold(`⚠️ Found ${stats.warnings} warnings that could be improved.`));
      process.exit(0);
    } else {
      console.log(chalk.green.bold('✓ No issues found in the documentation!'));
      process.exit(0);
    }
    
  } catch (err) {
    console.error(chalk.red.bold('× Swagger validation failed:'));
    console.error(chalk.red(err.message));
    if (err.details) {
      console.error(chalk.gray(JSON.stringify(err.details, null, 2)));
    }
    process.exit(1);
  }
}

// Run validation
validateSwagger().catch(err => {
  console.error(chalk.red.bold('An unexpected error occurred:'));
  console.error(err);
  process.exit(1);
}); 