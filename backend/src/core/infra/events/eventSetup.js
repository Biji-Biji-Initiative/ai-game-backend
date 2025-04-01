import { logger } from "#app/core/infra/logging/logger.js";
import domainEvents from "#app/core/common/events/domainEvents.js";
import { registerEvaluationEventHandlers } from "#app/core/evaluation/events/evaluationEvents.js";
import { registerPersonalityEventHandlers } from "#app/core/personality/events/personalityEvents.js";
import { registerProgressEventHandlers } from "#app/core/progress/events/progressEvents.js";
import { registerAdaptiveEventHandlers } from "#app/core/adaptive/events/adaptiveEvents.js";
import { registerUserJourneyEventHandlers } from "#app/core/userJourney/events/userJourneyEvents.js";
import { registerFocusAreaEventHandlers } from "#app/core/focusArea/events/focusAreaEvents.js";
import { registerChallengeEventHandlers } from "#app/core/challenge/events/challengeEvents.js";
import { registerUserEventHandlers } from "#app/core/user/events/userEvents.js";
import { registerCacheInvalidationEventHandlers } from "#app/application/events/CacheInvalidationEventHandlers.js";
'use strict';
const {
  eventBus,
  EventTypes
} = domainEvents;
/**
 * Initializes and registers all domain event handlers across different modules.
 * This function orchestrates the setup of listeners for domain events.
 */
function registerAllDomainEventHandlers() {
  try {
    // Verify the event bus is available
    if (!eventBus || typeof eventBus.subscribe !== 'function') {
      logger.warn('Event bus not properly initialized, skipping event handler registration');
      return;
    }
    
    // Register event handlers from each domain
    registerUserEventHandlers();
    registerChallengeEventHandlers();
    registerEvaluationEventHandlers();
    registerProgressEventHandlers();
    registerPersonalityEventHandlers();
    registerAdaptiveEventHandlers();
    registerUserJourneyEventHandlers();
    registerFocusAreaEventHandlers();
    
    // Register cache invalidation event handlers
    registerCacheInvalidationEventHandlers(eventBus);
    
    logger.info('Domain event handlers registered successfully');
  } catch (error) {
    logger.error('Error registering domain event handlers', { 
      error: error.message,
      stack: error.stack
    });
  }
}
export { registerAllDomainEventHandlers };
export { eventBus };
export { EventTypes };
export default {
  registerAllDomainEventHandlers,
  eventBus,
  EventTypes
};