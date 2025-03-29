'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerOptions = require('./config/swagger');

// Import container for dependency injection
const { container } = require('./config/container');

// Get dependencies from container
const _config = container.get('config');
const { logger } = require('./core/infra/logging/logger');
const {
  requestLogger,
  errorLogger,
  correlationIdMiddleware,
} = require('./core/infra/logging/logger');
const { errorHandler, notFoundHandler } = require('./core/infra/errors/ErrorHandler');
const { responseFormatterMiddleware } = require('./core/infra/http/responseFormatter');
const RouteFactory = require('./core/infra/http/routes/RouteFactory');

// Import domain events system
const { eventBus: _eventBus, EventTypes: _EventTypes } = require('./core/common/events/domainEvents');

// Register application event handlers (moved from inline to a separate file)
const { registerEventHandlers } = require('./application/EventHandlers');
registerEventHandlers(container);

// Register domain event handlers (moved to a separate file)
const { registerAllDomainEventHandlers } = require('./core/infra/events/eventSetup');

// Import health check utilities (these are now used by the HealthCheckService)
// const { runDatabaseHealthCheck } = require('./core/infra/db/databaseConnection');
// const { checkOpenAIStatus } = require('./core/infra/openai/healthCheck');

// Create Express application
const app = express();

// Basic middleware
app.use(cors());
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
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'AI Fight Club API Documentation',
  })
);

// Add enhanced health check endpoint
// This health check endpoint is now provided by the healthRoutes module
// and mounted by the RouteFactory

// Serve the API Tester UI static files
const testerUiPath = path.join(__dirname, '../api-tester-ui');
app.use('/tester', express.static(testerUiPath));
logger.info(`API Tester UI available at /tester`);

// Add response formatter middleware
app.use(responseFormatterMiddleware);

// Register domain event handlers
registerAllDomainEventHandlers();

// Initialize route factory
const routeFactory = new RouteFactory(container);

// Mount all routes using the route factory - only using /api/v1 for consistent API path
routeFactory.mountAll(app, '/api/v1');

// Handle 404 errors
app.use(notFoundHandler);

// Global error logging and handling
app.use(errorLogger);
app.use(errorHandler);

logger.info('Application initialized successfully');

module.exports = app;
