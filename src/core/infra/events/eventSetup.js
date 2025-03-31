import { logger } from "@/core/infra/logging/logger.js";
import domainEvents from "@/core/common/events/domainEvents.js";
import { registerEvaluationEventHandlers } from "@/core/evaluation/events/evaluationEvents.js";
import { registerPersonalityEventHandlers } from "@/core/personality/events/personalityEvents.js";
import { registerProgressEventHandlers } from "@/core/progress/events/progressEvents.js";
import { registerAdaptiveEventHandlers } from "@/core/adaptive/events/adaptiveEvents.js";
import { registerUserJourneyEventHandlers } from "@/core/userJourney/events/userJourneyEvents.js";
import { registerFocusAreaEventHandlers } from "@/core/focusArea/events/focusAreaEvents.js";
import { registerChallengeEventHandlers } from "@/core/challenge/events/challengeEvents.js";
import { registerUserEventHandlers } from "@/core/user/events/userEvents.js";
import { registerCacheInvalidationEventHandlers } from "@/application/events/CacheInvalidationEventHandlers.js";
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