/**
 * Debug Swagger Configuration
 * 
 * This script helps diagnose issues with Swagger configuration by:
 * 1. Loading the swagger options
 * 2. Validating the structure
 * 3. Identifying any null/undefined properties that might cause issues
 */

import swaggerOptions from './src/config/swagger.js';

// Process the Swagger options
try {
  console.log('--- Swagger Configuration Debug ---');
  
  // Get the options
  const options = swaggerOptions();
  
  // Check top-level properties
  console.log('\n1. Top-level Properties:');
  console.log(`- swaggerDefinition: ${typeof options.swaggerDefinition === 'object' ? 'Object' : 'MISSING'}`);
  console.log(`- apis: ${Array.isArray(options.apis) ? `Array(${options.apis.length})` : 'MISSING'}`);
  
  // Check main sections of the OpenAPI spec
  if (options.swaggerDefinition) {
    const def = options.swaggerDefinition;
    
    console.log('\n2. OpenAPI Main Sections:');
    console.log(`- openapi: ${def.openapi || 'MISSING'}`);
    console.log(`- info: ${typeof def.info === 'object' ? 'Object' : 'MISSING'}`);
    console.log(`- servers: ${Array.isArray(def.servers) ? `Array(${def.servers.length})` : 'MISSING'}`);
    console.log(`- paths: ${typeof def.paths === 'object' ? 'Object' : 'MISSING'}`);
    console.log(`- components: ${typeof def.components === 'object' ? 'Object' : 'MISSING'}`);
  }
  
  // Check components structure
  if (options.swaggerDefinition?.components) {
    const components = options.swaggerDefinition.components;
    
    console.log('\n3. Components Structure:');
    console.log(`- schemas: ${typeof components.schemas === 'object' ? `Object(${Object.keys(components.schemas).length} items)` : 'MISSING'}`);
    console.log(`- responses: ${typeof components.responses === 'object' ? `Object(${Object.keys(components.responses).length} items)` : 'MISSING'}`);
    console.log(`- parameters: ${typeof components.parameters === 'object' ? `Object(${Object.keys(components.parameters).length} items)` : 'MISSING'}`);
    console.log(`- securitySchemes: ${typeof components.securitySchemes === 'object' ? `Object(${Object.keys(components.securitySchemes).length} items)` : 'MISSING'}`);
  }
  
  // Deep scan for undefined/null properties
  console.log('\n4. Problematic Values:');
  const issues = [];
  
  function scanForIssues(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (value === null) {
        issues.push(`${currentPath}: null`);
      } else if (value === undefined) {
        issues.push(`${currentPath}: undefined`);
      } else if (typeof value === 'object') {
        scanForIssues(value, currentPath);
      }
    }
  }
  
  scanForIssues(options);
  
  if (issues.length > 0) {
    console.log('Found problematic values:');
    issues.forEach(issue => console.log(`- ${issue}`));
  } else {
    console.log('No undefined or null values found in the configuration');
  }
  
  console.log('\n--- Swagger Configuration Debug Complete ---');
  
} catch (error) {
  console.error('Error processing Swagger configuration:');
  console.error(error);
} 