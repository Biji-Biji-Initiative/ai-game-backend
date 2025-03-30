'use strict';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeSwagger } from "./config/swaggerSetup.js";

// Import container for dependency injection
import { container } from "./config/container.js";
const config = container.get('config');

// Log application startup information
console.log(`Running in ${process.env.NODE_ENV} mode`);
console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'missing', 
    SUPABASE_KEY: process.env.SUPABASE_KEY ? 'set' : 'missing'
});

// Get dependencies from container
import { logger } from "./core/infra/logging/logger.js";
import {
  requestLogger,
  errorLogger,
  correlationIdMiddleware,
} from "./core/infra/logging/logger.js";
// eslint-disable-next-line import/no-unresolved
import { errorHandler, notFoundHandler } from "./core/infra/errors/ErrorHandler.js";
import { responseFormatterMiddleware } from "./core/infra/http/responseFormatter.js";
import RouteFactory from "./core/infra/http/routes/RouteFactory.js";
import { applyRateLimiting } from "./core/infra/http/middleware/rateLimit.js";

// Import domain events system - now used directly in event handling registration
import { registerEventHandlers } from "@/application/EventHandlers.js";

// Register application event handlers (moved from inline to a separate file)
registerEventHandlers(container);

// Register domain event handlers (moved to a separate file)
import { registerAllDomainEventHandlers } from "./core/infra/events/eventSetup.js";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express application
const app = express();

// Create reusable CORS options function to avoid duplication
const getCorsOptions = () => {
  const corsOptions = {
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
  };
  
  return corsOptions;
};

// Basic middleware
app.use(cors(getCorsOptions()));

// Handle OPTIONS requests for CORS preflight
app.options('*', cors(getCorsOptions()));

// Apply API rate limiting based on configuration
applyRateLimiting(app);

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

// Initialize Swagger UI
initializeSwagger(app, logger);

// Ensure the API Tester UI static files
const testerUiPath = path.join(__dirname, '../api-tester-ui');
app.use(config.api.testerPath, express.static(testerUiPath));
logger.info(`API Tester UI available at ${config.api.testerPath}`);

// Add a direct auth status endpoint early in the middleware stack to ensure it's always available
app.get(`${config.api.prefix}/auth/status`, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Auth service is running',
    authenticated: false
  });
});

// Add API Tester specific endpoints for enhanced debugging
import createApiTesterRoutes from "./core/infra/http/routes/apiTesterRoutes.js";

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
