'use strict';

/**
 * Domain Event Setup
 * 
 * Centralizes the registration of all domain event handlers
 * following the Single Responsibility Principle
 */

const { logger } = require('../logging/logger');
const { eventBus, EventTypes } = require('../../common/events/domainEvents');

// Import domain event handlers from each domain
const { registerEvaluationEventHandlers } = require('../../evaluation/events/evaluationEvents');
const { registerPersonalityEventHandlers } = require('../../personality/events/personalityEvents');
const { registerProgressEventHandlers } = require('../../progress/events/progressEvents');
const { registerAdaptiveEventHandlers } = require('../../adaptive/events/adaptiveEvents');
const { registerUserJourneyEventHandlers } = require('../../userJourney/events/userJourneyEvents');
const { registerFocusAreaEventHandlers } = require('../../focusArea/events/focusAreaEvents');
const { registerChallengeEventHandlers } = require('../../challenge/events/challengeEvents');
const { registerUserEventHandlers } = require('../../user/events/userEvents');

/**
 * Initializes and registers all domain event handlers across different modules.
 * This function orchestrates the setup of listeners for domain events.
 */
function registerAllDomainEventHandlers() {
  // Register event handlers from each domain
  registerUserEventHandlers();
  registerChallengeEventHandlers();
  registerEvaluationEventHandlers();
  registerProgressEventHandlers();
  registerPersonalityEventHandlers();
  registerAdaptiveEventHandlers();
  registerUserJourneyEventHandlers();
  registerFocusAreaEventHandlers();

  logger.info('Domain event handlers registered successfully');
}

module.exports = {
  registerAllDomainEventHandlers,
  eventBus,
  EventTypes
}; 