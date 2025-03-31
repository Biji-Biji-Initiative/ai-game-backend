import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerOptions from ".//swagger.js";
import config from ".//config.js";

/**
 * Initialize Swagger UI for the Express application
 * 
 * @param {Object} app - Express application instance
 * @param {Object} logger - Logger instance
 * @returns {void}
 */
export function initializeSwagger(app, logger) {
  try {
    // Use the same configuration for both dev and production modes
    // swagger-jsdoc will generate the spec from the configuration and JSDoc comments
    const swaggerDocs = swaggerJsDoc(swaggerOptions());

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
      swaggerUi.setup(swaggerDocs, uiOptions)
    );

    logger.info(`API documentation available at ${config.fullDocsUrl}${config.isDevelopment ? ' (Development Mode)' : ''}`);
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