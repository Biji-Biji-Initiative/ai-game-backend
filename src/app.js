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

// Import container for dependency injection
import { container } from './config/container.js';
const config = container.get('config');

// Log application startup information
console.log(`Running in ${process.env.NODE_ENV} mode`);
console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'missing', 
    SUPABASE_KEY: process.env.SUPABASE_KEY ? 'set' : 'missing'
});

// Get dependencies from container
import { logger } from './core/infra/logging/logger.js';
import {
  requestLogger,
  errorLogger,
  correlationIdMiddleware,
} from './core/infra/logging/logger.js';
// eslint-disable-next-line import/no-unresolved
import { errorHandler, notFoundHandler } from './core/infra/errors/ErrorHandler.js';
import { responseFormatterMiddleware } from './core/infra/http/responseFormatter.js';
import RouteFactory from './core/infra/http/routes/RouteFactory.js';

// Import domain events system - now used directly in event handling registration
import { registerEventHandlers } from './application/EventHandlers.js';

// Register application event handlers (moved from inline to a separate file)
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
  origin: config.isProduction 
    ? (origin, callback) => {
        // In production, allow only whitelisted origins
        if (!origin || (Array.isArray(config.cors.allowedOrigins) && config.cors.allowedOrigins.includes(origin))) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    : config.cors.allowedOrigins, // In development, use the value from config (defaults to '*')
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
  exposedHeaders: config.cors.exposedHeaders,
  credentials: config.cors.credentials,
  maxAge: config.cors.maxAge
}));

// Handle OPTIONS requests for CORS preflight
app.options('*', cors(config.isProduction 
  ? {
      origin: (origin, callback) => {
        if (!origin || (Array.isArray(config.cors.allowedOrigins) && config.cors.allowedOrigins.includes(origin))) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    }
  : {
      origin: config.cors.allowedOrigins
    }
));

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
function initializeSwagger() {
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
}

try {
  initializeSwagger();
} catch (error) {
  logger.error(`Failed to initialize Swagger UI: ${error.message}`, { 
    error: error.message,
    stack: error.stack 
  });
  
  // Create a minimal error route instead of complex HTML
  app.use(config.api.docsPath, (req, res) => {
    res.status(500).json({
      error: 'API Documentation Unavailable',
      message: 'Swagger UI failed to initialize. Please check server logs.'
    });
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

// Mount all routes and finalize application setup
async function mountRoutesAndFinalize() {
  // Ensure API prefix routes are mounted at root level as well
  app.use('/api', (req, res, next) => {
    // Redirect to versioned API
    if (req.path === '/' || req.path === '') {
      return res.redirect(`${config.api.prefix}/health`);
    }
    
    // For docs, redirect to the docs path
    if (req.path === '/docs') {
      return res.redirect(config.api.docsPath);
    }
    
    // Otherwise pass through to the next handler (which will likely be 404)
    next();
  });

  // Make sure required tester static resources exist
  app.use('/tester', express.static(path.join(__dirname, '../public/tester')));
  logger.info('Tester UI static files mounted at /tester');
  
  // Mount the actual API routes
  await routeFactory.mountAll(app, config.api.prefix);
  logger.info(`Routes mounted successfully at ${config.api.prefix}`);
  
  // Handle 404 errors - moved inside to ensure routes are mounted first
  app.use(notFoundHandler);
  
  // Global error logging and handling
  app.use(errorLogger);
  app.use(errorHandler);
  
  logger.info('Application initialized successfully');
}

// Initialize routes and handle any errors
mountRoutesAndFinalize().catch(error => {
  logger.error(`Critical error during application initialization: ${error.message}`, { 
    error,
    stack: error.stack 
  });
  
  // Add critical failure handler
  app.use((req, res) => {
    res.status(500).json({
      error: 'Application initialization failed',
      message: 'The server encountered an error during startup'
    });
  });
});

export default app;
