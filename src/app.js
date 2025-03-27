const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Import container for dependency injection
const container = require('./config/container');

// Get dependencies from container
const config = container.get('config');
const logger = container.get('logger');
const { requestLogger, errorLogger } = require('./core/infra/logging/logger');
const { errorHandler, notFoundHandler } = require('./core/infra/errors/errorHandler');

// Import routes
const apiRoutes = require('./routes/index');

// Import domain events system
const { eventBus, EventTypes } = require('./core/shared/domainEvents');

// Import domain event handlers
const { registerEvaluationEventHandlers } = require('./core/evaluation/events/evaluationEvents');
const { registerPersonalityEventHandlers } = require('./core/personality/events/personalityEvents');
const { registerProgressEventHandlers } = require('./core/progress/events/progressEvents');
const { registerAdaptiveEventHandlers } = require('./core/adaptive/events/adaptiveEvents');
const { registerUserJourneyEventHandlers } = require('./core/userJourney/events/userJourneyEvents');
const { registerFocusAreaEventHandlers } = require('./core/focusArea/events/focusAreaEvents');
const { registerChallengeEventHandlers } = require('./core/challenge/events/challengeEvents');
const { registerUserEventHandlers } = require('./core/user/events/userEvents');

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

// Request logging
app.use(requestLogger);

// Initialize Supabase (will be implemented when Supabase is integrated)
const { initializeSupabase } = require('./core/infra/db/databaseConnection');

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

// Mount API routes under /api
app.use('/api', apiRoutes);

// Handle 404 errors
app.use(notFoundHandler);

// Global error logging and handling
app.use(errorLogger);
app.use(errorHandler);

logger.info('Application initialized successfully');

module.exports = app;
