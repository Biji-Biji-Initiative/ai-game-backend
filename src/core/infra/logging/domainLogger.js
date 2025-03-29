'use strict';

/**
 * Domain Loggers
 *
 * Provides specific loggers for each domain in the application.
 * Helps with consistent logging patterns across domains.
 */

const { Logger } = require('./logger');

// Create domain-specific loggers
const userLogger = new Logger('domain:user');
const personalityLogger = new Logger('domain:personality');
const challengeLogger = new Logger('domain:challenge');
const evaluationLogger = new Logger('domain:evaluation');
const focusAreaLogger = new Logger('domain:focusArea');
const progressLogger = new Logger('domain:progress');
const adaptiveLogger = new Logger('domain:adaptive');
const userJourneyLogger = new Logger('domain:userJourney');

// Create infrastructure loggers
const infraLogger = new Logger('infra');
const httpLogger = new Logger('infra:http');
const dbLogger = new Logger('infra:db');
const apiLogger = new Logger('infra:api');
const eventsLogger = new Logger('infra:events');

// Create application-level logger
const appLogger = new Logger('app');

module.exports = {
  // Domain loggers
  userLogger,
  personalityLogger,
  challengeLogger,
  evaluationLogger,
  focusAreaLogger,
  progressLogger,
  adaptiveLogger,
  userJourneyLogger,

  // Infrastructure loggers
  infraLogger,
  httpLogger,
  dbLogger,
  apiLogger,
  eventsLogger,

  // Application logger
  appLogger,
};
