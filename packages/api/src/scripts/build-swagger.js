#!/usr/bin/env node

/**
 * Swagger Documentation Generator
 *
 * This script builds and exports Swagger/OpenAPI documentation for the API.
 * It creates both JSON and YAML versions of the OpenAPI spec that can be
 * used by external tools or shared with API consumers.
 *
 * Usage: node build-swagger.js
 */

import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import swaggerJsDoc from 'swagger-jsdoc';
import fs from 'fs/promises';
import YAML from 'yaml';

// Import Swagger configuration
import getSwaggerOptions from "../config/swagger.js";
import { logger } from '../core/infra/logging/logger.js';

// Set up directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');
const docsDir = resolve(rootDir, 'docs/api');
const publicDir = resolve(rootDir, 'public');

async function buildSwaggerDocs() {
  try {
    logger.info('Starting Swagger documentation build...');

    // Get Swagger options and generate documentation
    const swaggerOptions = getSwaggerOptions();

    // Generate docs
    const swaggerDocs = swaggerJsDoc(swaggerOptions);

    // Make sure directories exist
    await fs.mkdir(docsDir, { recursive: true });
    await fs.mkdir(publicDir, { recursive: true });

    // Create JSON and YAML versions
    const jsonContent = JSON.stringify(swaggerDocs, null, 2);
    const yamlContent = YAML.stringify(swaggerDocs);

    // Write the files
    await fs.writeFile(resolve(docsDir, 'openapi.json'), jsonContent);
    await fs.writeFile(resolve(docsDir, 'openapi.yaml'), yamlContent);

    // Also save a copy to the public directory for easy download
    await fs.writeFile(resolve(publicDir, 'openapi.json'), jsonContent);

    // Log documentation statistics
    logger.info('Swagger documentation built successfully');
    logger.info(`API: ${swaggerDocs.info.title} v${swaggerDocs.info.version}`);
    logger.info(`Endpoints: ${Object.keys(swaggerDocs.paths || {}).length}`);

    // Count operations (GET, POST, etc.)
    let operationCount = 0;
    let operationsByTag = {};

    for (const path in swaggerDocs.paths || {}) {
      for (const method in swaggerDocs.paths[path]) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          operationCount++;

          // Count by tag
          const operation = swaggerDocs.paths[path][method];
          const tags = operation.tags || ['untagged'];

          tags.forEach(tag => {
            operationsByTag[tag] = (operationsByTag[tag] || 0) + 1;
          });
        }
      }
    }

    logger.info(`Total operations: ${operationCount}`);
    logger.info('Operations by tag:');
    Object.entries(operationsByTag).forEach(([tag, count]) => {
      logger.info(`- ${tag}: ${count}`);
    });

    // Count schemas
    const schemaCount = Object.keys(swaggerDocs.components?.schemas || {}).length;
    logger.info(`Schema definitions: ${schemaCount}`);

    // Output file locations
    logger.info('Documentation files generated at:');
    logger.info(`- ${resolve(docsDir, 'openapi.json')}`);
    logger.info(`- ${resolve(docsDir, 'openapi.yaml')}`);
    logger.info(`- ${resolve(publicDir, 'openapi.json')} (public download)`);

    return true;
  } catch (error) {
    logger.error('Error building Swagger documentation:', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

// Run directly if not imported
if (import.meta.url === `file://${fileURLToPath(import.meta.url)}`) {
  const result = await buildSwaggerDocs();
  process.exit(result ? 0 : 1);
}

export default buildSwaggerDocs;
