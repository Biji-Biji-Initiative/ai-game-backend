#!/usr/bin/env node

/**
 * Simple Swagger Generation Script
 * 
 * This script generates Swagger/OpenAPI documentation for the API
 * without the full validation logic to test our annotations.
 * 
 * Usage: node checkSwagger.js
 */

import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import swaggerJsDoc from 'swagger-jsdoc';
import getSwaggerOptions from "#app/config/swagger.js";
import fs from 'fs';

// Set up directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

try {
  // Get Swagger options and generate documentation
  const swaggerOptions = getSwaggerOptions();
  
  console.log('Generating Swagger documentation...');
  
  // Generate docs
  const swaggerDocs = swaggerJsDoc(swaggerOptions);
  
  // Create a log directory if it doesn't exist
  const logDir = resolve(rootDir, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Write the Swagger spec to a file
  fs.writeFileSync(
    resolve(logDir, 'swagger-spec.json'), 
    JSON.stringify(swaggerDocs, null, 2)
  );
  
  console.log('Swagger documentation generated successfully!');
  console.log(`Swagger spec saved to ${resolve(logDir, 'swagger-spec.json')}`);
  
  // Log basic documentation statistics
  console.log('\nBasic Documentation Statistics:');
  console.log(`- API Title: ${swaggerDocs.info.title}`);
  console.log(`- API Version: ${swaggerDocs.info.version}`);
  console.log(`- Endpoints: ${Object.keys(swaggerDocs.paths || {}).length}`);
  
  // Count operations (GET, POST, etc.)
  let operationCount = 0;
  for (const path in swaggerDocs.paths || {}) {
    for (const method in swaggerDocs.paths[path]) {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
        operationCount++;
      }
    }
  }
  console.log(`- Operations: ${operationCount}`);
  
  // Count schemas
  const schemaCount = Object.keys(swaggerDocs.components?.schemas || {}).length;
  console.log(`- Schemas: ${schemaCount}`);
  
} catch (error) {
  console.error('Error generating Swagger documentation:');
  console.error(error);
  process.exit(1);
} 