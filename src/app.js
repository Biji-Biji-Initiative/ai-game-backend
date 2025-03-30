'use strict';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerOptions from './config/swagger.js';

// In development mode, use mock dependencies
let container;
let config;

// Always use the real container in production mode
console.log(`Running in ${process.env.NODE_ENV} mode`);

// Import container for dependency injection
try {
    ({ container } = await import('./config/container.js'));
    config = container.get('config');
    
    // Log the environment configuration
    console.log('Environment:', {
        NODE_ENV: process.env.NODE_ENV,
        SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'missing', 
        SUPABASE_KEY: process.env.SUPABASE_KEY ? 'set' : 'missing'
    });
    
    console.log('Using strict container in all environments - dependencies must be properly configured');
} catch (error) {
    console.error('Error loading container:', error);
    
    // This is a critical error in all environments
    throw new Error('Failed to load dependency container: ' + error.message);
}

// Get dependencies from container
import { logger } from './core/infra/logging/logger.js';
import {
  requestLogger,
  errorLogger,
  correlationIdMiddleware,
} from './core/infra/logging/logger.js';
import { errorHandler, notFoundHandler } from './core/infra/errors/ErrorHandler.js';
import { responseFormatterMiddleware } from './core/infra/http/responseFormatter.js';
import RouteFactory from './core/infra/http/routes/RouteFactory.js';

// Import domain events system
import { eventBus as _eventBus, EventTypes as _EventTypes } from './core/common/events/domainEvents.js';

// Register application event handlers (moved from inline to a separate file)
import { registerEventHandlers } from './application/EventHandlers.js';
registerEventHandlers(container);

// Register domain event handlers (moved to a separate file)
import { registerAllDomainEventHandlers } from './core/infra/events/eventSetup.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express application
const app = express();

// Basic middleware
app.use(cors({
  origin: '*',  // Allow all origins in development mode
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Request-Id', 'X-Response-Time'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Handle OPTIONS requests for CORS preflight
app.options('*', cors());

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Add request ID to each request
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Setup correlation ID context for logging
app.use(correlationIdMiddleware);

// Request logging
app.use(requestLogger);

// Initialize Swagger
try {
  // For development mode, use a simple static Swagger UI without depending on JSDoc
  if (config.isDevelopment) {
    // Create a minimal OpenAPI document
    const openApiDocument = {
      openapi: '3.0.0',
      info: {
        title: 'AI Fight Club API',
        version: '1.0.0',
        description: 'API Documentation (Development Mode)',
      },
      servers: [
        {
          url: config.api.prefix,
          description: 'Current server (relative path)',
        },
        {
          url: config.fullApiUrl,
          description: 'Complete API URL',
        }
      ],
      paths: {
        '/health': {
          get: {
            summary: 'Health check endpoint',
            description: 'Returns the health status of the API',
            tags: ['System'],
            parameters: [
              {
                name: 'format',
                in: 'query',
                description: 'Response format (json or text)',
                schema: {
                  type: 'string',
                  enum: ['json', 'text'],
                  default: 'json'
                }
              }
            ],
            responses: {
              '200': {
                description: 'API is healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: {
                          type: 'string',
                          example: 'ok'
                        },
                        mode: {
                          type: 'string',
                          example: config.server.environment
                        }
                      }
                    },
                    examples: {
                      success: {
                        value: {
                          status: "ok",
                          mode: config.server.environment
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/users': {
          get: {
            summary: 'Get all users',
            description: 'Retrieves a list of all users',
            tags: ['Users'],
            responses: {
              '200': {
                description: 'A list of users',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: {
                          type: 'boolean',
                          example: true
                        },
                        data: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              email: { type: 'string', format: 'email' },
                              name: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/challenges': {
          get: {
            summary: 'Get all challenges',
            description: 'Retrieves a list of all challenges',
            tags: ['Challenges'],
            responses: {
              '200': {
                description: 'A list of challenges',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: {
                          type: 'boolean',
                          example: true
                        },
                        data: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              title: { type: 'string' },
                              description: { type: 'string' },
                              difficulty: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
    
    // Set up the Swagger UI with static definition
    app.use(
      config.api.docsPath,
      swaggerUi.serve,
      swaggerUi.setup(openApiDocument, {
        explorer: true,
        customCss: `
          .swagger-ui .topbar { display: none }
          .swagger-ui .info { margin: 30px 0 }
          .swagger-ui .scheme-container { margin: 30px 0 }
          .swagger-ui .opblock-tag { font-size: 18px; margin: 10px 0 }
          .swagger-ui .opblock { margin: 10px 0 }
          .swagger-ui table tbody tr td { padding: 10px 0 }
        `,
        customSiteTitle: 'AI Fight Club API Documentation',
        swaggerOptions: {
          docExpansion: 'list',
          filter: true,
          displayRequestDuration: true,
          persistAuthorization: true,
          tryItOutEnabled: true
        }
      })
    );
    logger.info(`API documentation available at ${config.fullDocsUrl} (Development Mode)`);
  } else {
    // In non-development mode, use the full Swagger JSDoc implementation
    const swaggerDocs = swaggerJsDoc(swaggerOptions());
    app.use(
      config.api.docsPath,
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocs, {
        explorer: true,
        customCss: `.swagger-ui .topbar { display: none }`,
        customSiteTitle: 'AI Fight Club API Documentation',
        swaggerOptions: {
          persistAuthorization: true,
          tryItOutEnabled: true
        }
      })
    );
    logger.info(`API documentation available at ${config.fullDocsUrl}`);
  }
} catch (error) {
  logger.warn(`Failed to initialize Swagger UI: ${error.message}`);
  console.error('Swagger initialization error:', error);
  
  // Create a simple documentation page instead
  app.use(config.api.docsPath, (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>API Documentation</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
            h1 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            .error { color: #bf1650; background: #ffeff1; padding: 10px; border-radius: 4px; margin: 20px 0; }
            .message { margin: 20px 0; padding: 10px; background: #f9f9f9; border-radius: 4px; }
            .note { background: #fffde7; padding: 10px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #ffeb3b; }
            code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
            .stack { font-family: monospace; white-space: pre-wrap; font-size: 12px; background: #f5f5f5; padding: 10px; overflow: auto; max-height: 300px; }
          </style>
        </head>
        <body>
          <h1>API Documentation</h1>
          <p class="message">Swagger UI initialization failed. The API documentation will be available in production.</p>
          <div class="error">
            <strong>Error:</strong> ${error.message}
          </div>
          <div class="stack">
            ${error.stack || 'No stack trace available'}
          </div>
          <p class="note">
            <strong>Note:</strong> If you're running in development mode, make sure all required Swagger definition properties are properly initialized.
            Check the <code>src/config/swagger.js</code> file and ensure it's correctly configured.
          </p>
          <p>
            <strong>Available API endpoints:</strong> Check the <code>${config.api.prefix}</code> path for API endpoints.
          </p>
        </body>
      </html>
    `);
  });
}

// Serve the API Tester UI static files
const testerUiPath = path.join(__dirname, '../api-tester-ui');
app.use(config.api.testerPath, express.static(testerUiPath));
logger.info(`API Tester UI available at ${config.api.testerPath}`);

// Add API Tester specific endpoints for enhanced debugging
import createApiTesterRoutes from './core/infra/http/routes/apiTesterRoutes.js';

// Add middleware to make container available on request objects for API tester
app.use((req, res, next) => {
  req.container = container;
  next();
});

// Register API tester routes before the response formatter to ensure proper handling
const apiTesterPath = `${config.api.prefix}/api-tester`;
app.use(apiTesterPath, createApiTesterRoutes());
logger.info(`API Tester debugging endpoints available at ${apiTesterPath}`);

// Add response formatter middleware
app.use(responseFormatterMiddleware);

// Register domain event handlers
registerAllDomainEventHandlers();

// Initialize route factory
const routeFactory = new RouteFactory(container);

// Mount all routes using the route factory - this is now async
(async () => {
  try {
    await routeFactory.mountAll(app, config.api.prefix);
    logger.info(`Routes mounted successfully at ${config.api.prefix}`);
    
    // Handle 404 errors - moved inside to ensure routes are mounted first
    app.use(notFoundHandler);
    
    // Global error logging and handling
    app.use(errorLogger);
    app.use(errorHandler);
    
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error(`Failed to mount routes: ${error.message}`, { error });
    
    // Add fallback error handler
    app.use((req, res) => {
      res.status(500).json({
        error: 'Application initialization failed',
        message: 'The server encountered an error during startup'
      });
    });
  }
})().catch(error => {
  logger.error(`Critical error during application initialization: ${error.message}`, { 
    error,
    stack: error.stack 
  });
});

export default app;
