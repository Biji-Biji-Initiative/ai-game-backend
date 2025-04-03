'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates the Swagger UI HTML file based on the OpenAPI spec
 * @param {Object} config - The application configuration object
 * @param {Object} logger - The logger instance
 */
export async function generateSwaggerUI(config, logger) {
    try {
        logger.info('[Swagger] Generating Swagger UI files...');
        
        // Define paths
        const rootDir = path.resolve(__dirname, '../../');
        const swaggerUIDir = path.join(rootDir, 'openapi/generated/swagger-ui');
        const openApiSpecPath = path.join(rootDir, 'openapi/generated/openapi-spec.json');
        
        // Check if the spec file exists
        if (!fs.existsSync(openApiSpecPath)) {
            logger.warn('[Swagger] OpenAPI spec file not found at: ' + openApiSpecPath);
            logger.warn('[Swagger] Run "npm run swagger:bundle" to generate the spec.');
            return false;
        }
        
        // Create the Swagger UI directory if it doesn't exist
        if (!fs.existsSync(swaggerUIDir)) {
            logger.info('[Swagger] Creating Swagger UI directory: ' + swaggerUIDir);
            fs.mkdirSync(swaggerUIDir, { recursive: true });
        }
        
        // Create the index.html file
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation - AI Fight Club</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui.css" />
  <style>
    body {
      margin: 0;
      padding: 0;
    }
    #swagger-ui {
      max-width: 1460px;
      margin: 0 auto;
    }
    .topbar {
      display: none;
    }
    .swagger-ui .info .title {
      font-size: 2.5em;
    }
    .swagger-ui .scheme-container {
      box-shadow: none;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "/api-docs-json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        persistAuthorization: true
      });
      window.ui = ui;
    };
  </script>
</body>
</html>`;
        
        fs.writeFileSync(path.join(swaggerUIDir, 'index.html'), htmlContent);
        logger.info('[Swagger] Generated Swagger UI index.html');
        
        // Copy the OpenAPI spec to the Swagger UI directory for local reference
        fs.copyFileSync(openApiSpecPath, path.join(swaggerUIDir, 'openapi-spec.json'));
        logger.info('[Swagger] Copied OpenAPI spec to Swagger UI directory');
        
        return true;
    } catch (error) {
        logger.error('[Swagger] Error generating Swagger UI:', { error: error.message, stack: error.stack });
        return false;
    }
}

export default generateSwaggerUI; 