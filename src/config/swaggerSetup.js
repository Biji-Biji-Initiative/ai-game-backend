import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import config from "@/config/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize Swagger UI for the Express application
 * 
 * @param {Object} app - Express application instance
 * @param {Object} logger - Logger instance
 * @returns {void}
 */
export function initializeSwagger(app, logger) {
  try {
    // Load the bundled OpenAPI specification
    const specPath = path.resolve(__dirname, '../../openapi-spec.json');
    
    // Check if the file exists
    if (!fs.existsSync(specPath)) {
      logger.warn(`Bundled OpenAPI specification not found at ${specPath}. Please run 'npm run swagger:bundle' first.`);
      
      // Use a simple message instead of Swagger UI when the spec is missing
      app.use(config.api.docsPath, (req, res) => {
        res.status(404).send(`
          <h1>API Documentation Not Found</h1>
          <p>The OpenAPI specification has not been bundled yet.</p>
          <p>Please run <code>npm run swagger:bundle</code> to generate it.</p>
        `);
      });
      
      return false;
    }
    
    // Read and parse the bundled specification
    const swaggerSpec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

    // Setup options for Swagger UI display
    const uiOptions = {
      explorer: true,
      customCss: `.swagger-ui .topbar { display: none }`,
      customSiteTitle: 'AI Fight Club API Documentation',
      swaggerOptions: {
        docExpansion: 'list',
        filter: true,
        displayRequestDuration: true,
        persistAuthorization: true,
        tryItOutEnabled: true
      }
    };

    // Add additional styling and options for development mode
    if (config.isDevelopment) {
      uiOptions.customCss += `
        .swagger-ui .info { margin: 30px 0 }
        .swagger-ui .scheme-container { margin: 30px 0 }
        .swagger-ui .opblock-tag { font-size: 18px; margin: 10px 0 }
        .swagger-ui .opblock { margin: 10px 0 }
        .swagger-ui table tbody tr td { padding: 10px 0 }
      `;
    }

    // Mount the Swagger UI
    app.use(
      config.api.docsPath,
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, uiOptions)
    );

    logger.info(`API documentation available at ${config.fullDocsUrl}${config.isDevelopment ? ' (Development Mode)' : ''}`);
    
    // Provide direct access to the raw spec file
    app.get(`${config.api.docsPath}/spec`, (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
    
    return true;
  } catch (error) {
    logger.error(`Failed to initialize Swagger UI: ${error.message}`, { 
      error: error.message,
      stack: error.stack 
    });

    // Set up a simple error handler for the docs path
    app.use(config.api.docsPath, (req, res) => {
      res.status(500).json({
        error: 'API Documentation Unavailable',
        message: 'Swagger UI failed to initialize. Please check server logs.'
      });
    });
    return false;
  }
}

export default initializeSwagger; 