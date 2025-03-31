/**
 * Setup script for integrating express-openapi-validator in app.js
 * 
 * This script updates app.js to include the OpenAPI validator middleware
 * after the body parser and before the routes are mounted.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appJsPath = path.resolve(__dirname, '../app.js');

// Read the existing app.js file
console.log(`Reading ${appJsPath}...`);
let appContent = fs.readFileSync(appJsPath, 'utf8');

// Check if the validator is already added
if (appContent.includes('OpenApiValidator')) {
  console.log('OpenAPI validator is already set up in app.js');
  process.exit(0);
}

// Add the import for express-openapi-validator
const importStatement = `import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeSwagger } from "./config/swaggerSetup.js";
import { OpenApiValidator } from 'express-openapi-validator';`;

appContent = appContent.replace(
  `import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeSwagger } from "./config/swaggerSetup.js";`,
  importStatement
);

// Add the validator middleware after the request logger
const validatorMiddleware = `// Request logging
app.use(requestLogger);

// Initialize Swagger UI
initializeSwagger(app, logger);

// Setup OpenAPI validation middleware
const apiSpecPath = path.join(__dirname, '../openapi-spec.json');
if (fs.existsSync(apiSpecPath)) {
  logger.info('Setting up OpenAPI validation middleware');
  app.use(
    new OpenApiValidator({
      apiSpec: apiSpecPath,
      validateRequests: true,
      validateResponses: config.isDevelopment, // Validate responses in development only
      ignoreUndocumented: true, // Don't validate paths not in the spec
      formats: {
        // Add custom formats if needed
        'uuid': /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      }
    }).middleware()
  );
} else {
  logger.warn('OpenAPI spec not found. Validation middleware not enabled.');
}`;

appContent = appContent.replace(
  `// Request logging
app.use(requestLogger);

// Initialize Swagger UI
initializeSwagger(app, logger);`,
  validatorMiddleware
);

// Add error handler for validation errors
const errorHandlerMiddleware = `// Global error logging and handling
  app.use(errorLogger);
  
  // OpenAPI Validation error handling - must be before the main error handler
  app.use((err, req, res, next) => {
    // Check if this is an OpenAPI validation error
    if (err.status === 400 && err.errors) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: err.errors.map(e => ({
          field: e.path || 'unknown',
          message: e.message
        }))
      });
    }
    // For other errors, pass to the main error handler
    next(err);
  });
  
  app.use(errorHandler);`;

appContent = appContent.replace(
  `// Global error logging and handling
  app.use(errorLogger);
  app.use(errorHandler);`,
  errorHandlerMiddleware
);

// Write the updated content back to app.js
console.log('Writing updated app.js with OpenAPI validator middleware...');
fs.writeFileSync(appJsPath, appContent);

console.log('OpenAPI validator middleware setup complete!');
console.log('Remember to run `npm run swagger:bundle` to generate the spec file before starting the server.'); 