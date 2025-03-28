const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Import container for dependency injection
const container = require('./config/container');

// Get dependencies from container
const config = container.get('config');
const logger = container.get('logger');
const { requestLogger, errorLogger, correlationIdMiddleware } = require('./core/infrastructure/logging/logger');
const { errorHandler, notFoundHandler } = require('./core/infrastructure/errors/errorHandler');
const { responseFormatterMiddleware } = require('./core/infrastructure/http/responseFormatter');
const RouteFactory = require('./core/infrastructure/http/routes/RouteFactory');

// Import domain events system
const { eventBus, eventTypes } = require('./core/infrastructure/messaging/domainEvents');

// Import domain event handlers
const { registerEvaluationEventHandlers } = require('./core/evaluation/events/evaluationEvents');
const { registerPersonalityEventHandlers } = require('./core/personality/events/personalityEvents');
const { registerProgressEventHandlers } = require('./core/progress/events/progressEvents');
const { registerAdaptiveEventHandlers } = require('./core/adaptive/events/adaptiveEvents');
const { registerUserJourneyEventHandlers } = require('./core/userJourney/events/userJourneyEvents');
const { registerFocusAreaEventHandlers } = require('./core/focusArea/events/focusAreaEvents');
const { registerChallengeEventHandlers } = require('./core/challenge/events/challengeEvents');
const { registerUserEventHandlers } = require('./core/user/events/userEvents');

// Register application event handlers
const { registerEventHandlers } = require('./application/EventHandlers');
registerEventHandlers(container);

// Initialize Express app
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

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Serve the API Tester UI static files
const testerUiPath = path.join(__dirname, '../api-tester-ui');
app.use('/tester', express.static(testerUiPath));
logger.info(`API Tester UI available at /tester`);

// Create a simple proxy for the UI to access the API through /api
app.use('/api/v1', (req, res, next) => {
  // Forward to the actual API routes
  next();
});

// Add response formatter middleware
app.use(responseFormatterMiddleware);

// Initialize Supabase (will be implemented when Supabase is integrated)
const { initializeSupabase } = require('./core/infrastructure/persistence/databaseConnection');

// Initialize domain event handlers - register all domain event handlers
function initializeDomainEventSystem() {
  // Register event handlers from each domain
  registerEvaluationEventHandlers();
  registerPersonalityEventHandlers();
  registerProgressEventHandlers();
  registerAdaptiveEventHandlers();
  registerUserJourneyEventHandlers();
  registerFocusAreaEventHandlers();
  registerChallengeEventHandlers();
  registerUserEventHandlers();
  
  logger.info('Domain event handlers registered successfully');
}

// Initialize the domain event system
initializeDomainEventSystem();

// Initialize route factory
const routeFactory = new RouteFactory(container);

// Mount all routes using the route factory - mount at both /api/v1 and /v1 for backward compatibility
routeFactory.mountAll(app, '/api/v1');
routeFactory.mountAll(app, '/v1');

// Handle 404 errors
app.use(notFoundHandler);

// Global error logging and handling
app.use(errorLogger);
app.use(errorHandler);

logger.info('Application initialized successfully');

module.exports = app;
