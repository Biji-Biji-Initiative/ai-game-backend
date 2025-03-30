'use strict';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeSwagger } from "./config/swaggerSetup.js";

// Import Sentry monitoring
import { initSentry, createSentryMiddleware } from './core/infra/monitoring/sentry.js';
import { getSentryConfig } from './config/monitoring.js';

// Import validation middleware
import { createValidationMiddleware } from './core/infra/http/middleware/validateApiRoutes.js';

// Import container for dependency injection
import { container } from "./config/container.js";
import { validateDependencies } from "./config/container/index.js";
const config = container.get('config');

// Initialize Sentry
const sentryConfig = getSentryConfig(process.env.NODE_ENV);
initSentry(sentryConfig);

// Validate that all critical dependencies can be resolved
// In production, fail fast to prevent partially initialized application
const isProduction = process.env.NODE_ENV === 'production';
const depsValid = validateDependencies(container, isProduction);
if (!depsValid && !isProduction) {
  logger.warn('WARNING: Some critical dependencies could not be resolved. The application may not function correctly.');
}

// Log application startup information
logger.info(`Running in ${process.env.NODE_ENV} mode`);
logger.info('Environment:', {
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
import { getCorsOptions } from "./core/infra/http/middleware/corsConfig.js";
import { createApiRedirectMiddleware } from "./core/infra/http/middleware/apiRedirects.js";

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

// Get Sentry middleware
const sentryMiddleware = createSentryMiddleware();

// Add Sentry request handler (must be first middleware)
app.use(sentryMiddleware.requestHandler);

// Get CORS options from our configuration helper
const corsOptions = getCorsOptions(config, logger);

// Basic middleware
app.use(cors(corsOptions));

// Handle OPTIONS requests for CORS preflight
app.options('*', cors(corsOptions));

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

// Apply validation middleware
const requestValidationMiddleware = createValidationMiddleware();

// Initialize Swagger UI
initializeSwagger(app, logger);

// Ensure the API Tester UI static files
const testerUiPath = path.join(__dirname, '../api-tester-ui');
app.use(config.api.testerPath, express.static(testerUiPath));
logger.info(`API Tester UI available at ${config.api.testerPath}`);

// Add API Tester specific endpoints for enhanced debugging
import createApiTesterRoutes from "./core/infra/http/routes/apiTesterRoutes.js";

// Register API tester routes before the response formatter to ensure proper handling
const apiTesterPath = `${config.api.prefix}/api-tester`;
app.use(apiTesterPath, createApiTesterRoutes());
logger.info(`API Tester debugging endpoints available at ${apiTesterPath}`);

// Add response formatter middleware
app.use(responseFormatterMiddleware);

// After response formatter middleware and before mounting routes 
// Register the Sentry error handler (before other error handlers)
app.use(sentryMiddleware.errorHandler);

// Register domain event handlers
registerAllDomainEventHandlers();

// Initialize route factory
const routeFactory = new RouteFactory(container);

// Add validation middleware (after CORS and body-parser, before route handling)
app.use(requestValidationMiddleware);

// Mount all routes and finalize application setup
async function mountRoutesAndFinalize() {
  // Ensure API prefix routes are mounted at root level as well
  app.use('/api', createApiRedirectMiddleware(config));

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
