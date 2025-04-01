'use strict';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeSwagger } from "#app/config/swaggerSetup.js";
import OpenApiValidator from 'express-openapi-validator';

// Import container for dependency injection
import { container } from "#app/config/container.js";
const config = container.get('config');

// Import container and route creator for direct mounting test
import createHealthRoutes from "#app/core/infra/http/routes/healthRoutes.js";

// Import container and specific health check dependencies
import { infraLogger as logger } from "#app/core/infra/logging/domainLogger.js"; // Use a specific logger
import { runDatabaseHealthCheck } from "#app/core/infra/db/databaseConnection.js";
import { checkOpenAIStatus } from "#app/core/infra/openai/healthCheck.js";

// Log application startup information
console.log(`Running in ${process.env.NODE_ENV} mode`);
console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'missing', 
    SUPABASE_KEY: process.env.SUPABASE_KEY ? 'set' : 'missing'
});

// Get dependencies from container
import {
  requestLogger,
  errorLogger,
  correlationIdMiddleware,
} from "#app/core/infra/logging/logger.js";
// eslint-disable-next-line import/no-unresolved
import { errorHandler, notFoundHandler } from "#app/core/infra/errors/ErrorHandler.js";
import { responseFormatterMiddleware } from "#app/core/infra/http/responseFormatter.js";
import RouteFactory from "#app/core/infra/http/routes/RouteFactory.js";
import { applyRateLimiting } from "#app/core/infra/http/middleware/rateLimit.js";

// Import domain events system - now used directly in event handling registration
import { registerEventHandlers } from "#app/application/EventHandlers.js";

// Register application event handlers (moved from inline to a separate file)
registerEventHandlers(container);

// Register domain event handlers (moved to a separate file)
import { registerAllDomainEventHandlers } from "#app/core/infra/events/eventSetup.js";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express application
const app = express();

// Create reusable CORS options function to avoid duplication
const getCorsOptions = () => {
  const corsOptions = {
    origin: (origin, callback) => {
      // Skip origin check if no origin (like same-origin requests)
      if (!origin) {
        return callback(null, true);
      }
      
      // In production, strictly check against allowed origins list
      if (config.isProduction) {
        if (Array.isArray(config.cors.allowedOrigins) && config.cors.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS policy`));
        }
      } else {
        // In development, use the configured value (typically '*')
        callback(null, true);
      }
    },
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

// Setup OpenAPI validation middleware
const apiSpecPath = path.join(process.cwd(), 'openapi-spec.json');
if (fs.existsSync(apiSpecPath)) {
  logger.info('Setting up OpenAPI validation middleware');
  app.use(
    OpenApiValidator.middleware({
      apiSpec: apiSpecPath,
      validateRequests: true,
      validateResponses: config.isDevelopment,
      ignoreUndocumented: true,
      formats: {
        'uuid': /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      }
    })
  );
} else {
  logger.warn('OpenAPI spec not found. Validation middleware not enabled.');
}

// Ensure the API Tester UI static files
// NOTE: This is the only place where API tester UI static files should be served.
// The application uses the admin directory for UI assets, not public/tester.
// See JIRA-1 for history on this decision.
const testerUiPath = path.join(process.cwd(), 'admin');
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
import createApiTesterRoutes from "#app/core/infra/http/routes/apiTesterRoutes.js";

// Add middleware to make container available on request objects for API tester
app.use((req, res, next) => {
  req.container = container;
  next();
});

// Register API tester routes before the response formatter to ensure proper handling
const apiTesterPath = `${config.api.prefix}/api-tester`;
app.use(apiTesterPath, createApiTesterRoutes());
logger.info(`API Tester debugging endpoints available at ${apiTesterPath}`);

// --- Direct Health Route Mounting (Production Ready) ---
let healthRouteMountedDirectly = false;
try {
    console.log('[App.js] Mounting /health directly...');
    const healthRouter = express.Router();
    
    healthRouter.get('', async (req, res) => {
        // Simplified health check logic directly here
        // Avoids depending on HealthCheckService/Controller DI
        let dbHealth = { status: 'unknown', message: 'DB check not run' };
        let openAIHealth = { status: 'unknown', message: 'OpenAI check not run' };
        let overallStatus = 'unhealthy';
        let httpStatus = 503;

        try {
            const dbCheckFn = runDatabaseHealthCheck;
            const aiCheckFn = checkOpenAIStatus;
            let aiClient = null;
            try { aiClient = container.get('openAIClient'); } catch { /* ignore */ }

            if (typeof dbCheckFn === 'function') {
                dbHealth = await dbCheckFn();
            } else {
                 logger.error('[Direct Health] runDatabaseHealthCheck is not available');
                 dbHealth = { status: 'error', message: 'Database check function unavailable' };
            }
            
            if (aiClient && typeof aiCheckFn === 'function') {
                 if (typeof aiClient.checkHealth === 'function') {
                     openAIHealth = await aiClient.checkHealth(); // Use client's method
                 } else {
                     openAIHealth = await aiCheckFn(aiClient); // Use separate function
                 }
            } else {
                logger.warn('[Direct Health] OpenAI client or check function unavailable', { hasClient: !!aiClient, hasCheckFn: typeof aiCheckFn === 'function' });
                 openAIHealth = { status: 'unknown', message: 'OpenAI client/check unavailable' };
            }

            const isHealthy = dbHealth.status === 'healthy'; // Only DB is critical for this simple check
            overallStatus = isHealthy ? 'healthy' : 'unhealthy';
            httpStatus = isHealthy ? 200 : 503;

        } catch (checkError) {
             logger.error('[Direct Health] Error during health check execution:', checkError);
             httpStatus = 500;
             overallStatus = 'error';
        }
        
        res.status(httpStatus).json({
            status: httpStatus === 200 ? 'success' : 'error',
            message: `Server is ${overallStatus}`,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            dependencies: { database: dbHealth, openai: openAIHealth }
        });
    });

    app.use(`${config.api.prefix}/health`, healthRouter);
    healthRouteMountedDirectly = true;
    console.log(`[App.js] Successfully mounted direct /health route at ${config.api.prefix}/health`);

} catch (error) {
    console.error('[App.js] CRITICAL Error mounting direct /health route:', error);
    app.use(`${config.api.prefix}/health`, (req, res) => res.status(500).send(`Internal Server Error - Health Check Mount Failed: ${error.message}`));
}
// --- End Direct Health Route Mounting ---

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

  // Mount the actual API routes using the factory
  console.log('[App.js] Calling routeFactory.mountAll...');
  await routeFactory.mountAll(app, config.api.prefix);
  console.log('[App.js] routeFactory.mountAll completed.');
  logger.info(`Routes mounted via RouteFactory at ${config.api.prefix}`);
  
  // Handle 404 errors - moved inside to ensure routes are mounted first
  app.use(notFoundHandler);
  
  // Global error logging and handling
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
