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
export async function setupEventHandlers(container) {
  if (!container) {
    throw new Error('Container is required for event setup');
  }
  
  logger.info('Setting up event handlers...');
  
  try {
    // Get the eventBus first to ensure it's properly resolved
    const eventBus = await container.get('eventBus');
    
    if (!eventBus || typeof eventBus.on !== 'function') {
      throw new Error('Invalid eventBus: missing .on() method');
    }
    
    // Create a container wrapper that provides a synchronous eventBus
    const containerWithEventBus = {
      ...container,
      get: (name) => {
        if (name === 'eventBus') return eventBus;
        return container.get(name);
      }
    };
    
    // Register all domain event handlers with the wrapped container
    registerEvaluationEventHandlers(containerWithEventBus);
    registerPersonalityEventHandlers(containerWithEventBus);
    registerProgressEventHandlers(containerWithEventBus);
    registerAdaptiveEventHandlers(containerWithEventBus);
    registerUserJourneyEventHandlers(containerWithEventBus);
    registerFocusAreaEventHandlers(containerWithEventBus);
    registerChallengeEventHandlers(containerWithEventBus);
    registerUserEventHandlers(containerWithEventBus);
    
    // Register application event handlers
    registerCacheInvalidationEventHandlers(containerWithEventBus);
    
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