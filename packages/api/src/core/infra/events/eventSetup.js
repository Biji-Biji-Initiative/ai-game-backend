"../../../infra/logging/logger.js;
""../../../common/events/domainEvents.js59;
""../../../evaluation/events/evaluationEvents.js126;
""../../../personality/events/personalityEvents.js224;
""../../../progress/events/progressEvents.js325;
""../../../adaptive/events/adaptiveEvents.js417;
""../../../userJourney/events/userJourneyEvents.js509;
""../../../focusArea/events/focusAreaEvents.js610;
""../../../challenge/events/challengeEvents.js705;
""../../../user/events/userEvents.js800;
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
};"
