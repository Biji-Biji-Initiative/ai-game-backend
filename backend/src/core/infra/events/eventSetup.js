'use strict';

import { logger } from "#app/core/infra/logging/logger.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { registerEvaluationEventHandlers } from "#app/core/evaluation/events/evaluationEvents.js";
import { registerPersonalityEventHandlers } from "#app/core/personality/events/personalityEvents.js";
import { registerProgressEventHandlers } from "#app/core/progress/events/progressEvents.js";
import { registerAdaptiveEventHandlers } from "#app/core/adaptive/events/adaptiveEvents.js";
import { registerUserJourneyEventHandlers } from "#app/core/userJourney/events/userJourneyEvents.js";
import { registerFocusAreaEventHandlers } from "#app/core/focusArea/events/focusAreaEvents.js";
import { registerChallengeEventHandlers } from "#app/core/challenge/events/challengeEvents.js";
import { registerUserEventHandlers } from "#app/core/user/events/userEvents.js";
import { registerCacheInvalidationEventHandlers } from "#app/application/events/CacheInvalidationEventHandlers.js";

/**
 * Setup all event handlers for the application
 * This function wires up all domain event handlers when the application starts
 * 
 * @param {Object} container - Dependency injection container
 */
export function setupEventHandlers(container) {
  if (!container) {
    throw new Error('Container is required for event setup');
  }
  
  logger.info('Setting up event handlers...');
  
  try {
    // Register all domain event handlers
    registerEvaluationEventHandlers(container);
    registerPersonalityEventHandlers(container);
    registerProgressEventHandlers(container);
    registerAdaptiveEventHandlers(container);
    registerUserJourneyEventHandlers(container);
    registerFocusAreaEventHandlers(container);
    registerChallengeEventHandlers(container);
    registerUserEventHandlers(container);
    
    // Register application event handlers
    registerCacheInvalidationEventHandlers(container);
    
    logger.info('Event handlers setup complete');
  } catch (error) {
    logger.error('Error setting up event handlers', { error: error.message });
    throw error;
  }
}

export default {
  setupEventHandlers,
  EventTypes // Export EventTypes for convenience
};