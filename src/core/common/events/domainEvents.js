/**
 * Domain Events module
 * 
 * !!! IMPORTANT: This module now uses RobustEventBus internally !!!
 * 
 * This compatibility layer maintains the same API as the original DomainEvents
 * implementation while leveraging the more robust EventBus implementation.
 * 
 * For new code, consider using RobustEventBus directly from './RobustEventBus.js'
 * as it offers better error handling, metrics, and event history features.
 * 
 * Migration path:
 * 1. Continue using this module as-is for backward compatibility
 * 2. For new event types, register them with registerEventType for better documentation
 * 3. Gradually migrate to using robustEventBus directly in new code
 */
import robustEventBus from './RobustEventBus.js';
import { logger } from "../../infra/logging/logger.js";

// Standard event types used across the application
const EventTypes = {
  // User domain events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_PROFILE_COMPLETED: 'user.profile.completed',
  // Challenge domain events
  CHALLENGE_CREATED: 'challenge.created',
  CHALLENGE_COMPLETED: 'challenge.completed',
  CHALLENGE_EVALUATED: 'challenge.evaluated',
  // Evaluation domain events
  EVALUATION_CREATED: 'evaluation.created',
  EVALUATION_UPDATED: 'evaluation.updated',
  // Progress domain events
  PROGRESS_UPDATED: 'progress.updated',
  PROGRESS_MILESTONE_REACHED: 'progress.milestone.reached',
  // Personality domain events
  PERSONALITY_UPDATED: 'personality.updated',
  PERSONALITY_INSIGHT_GENERATED: 'personality.insight.generated',
  // Focus area domain events
  FOCUS_AREA_SELECTED: 'focus_area.selected',
  FOCUS_AREA_COMPLETED: 'focus_area.completed',
  // User journey domain events
  USER_JOURNEY_EVENT_RECORDED: 'user_journey.event.recorded',
  USER_JOURNEY_MILESTONE_REACHED: 'user_journey.milestone.reached',
  // Adaptive system events
  ADAPTIVE_RECOMMENDATION_GENERATED: 'adaptive.recommendation.generated',
  DIFFICULTY_ADJUSTED: 'adaptive.difficulty.adjusted'
};

// Register the standard event types with the robust event bus
Object.entries(EventTypes).forEach(([key, eventName]) => {
  robustEventBus.registerEventType(eventName, {
    description: `Standard event: ${eventName}`,
    category: eventName.split('.')[0]
  });
});

/**
 * Compatibility layer for the legacy DomainEvents API
 */
class DomainEventsCompatibility {
  constructor() {
    this.logger = logger.child({
      component: 'domain-events-compatibility'
    });
    this.EventTypes = EventTypes;
    this.handlers = {}; // Just for API compatibility

    this.logger.info('DomainEvents compatibility layer initialized');
  }

  /**
   * Register an event handler (compatibility method)
   * @param {string} eventName - Name of the event to listen for
   * @param {Function} handler - Event handler function
   */
  register(eventName, handler) {
    robustEventBus.on(eventName, handler);

    // Store in local handlers map for API compatibility
    if (!this.handlers[eventName]) {
      this.handlers[eventName] = [];
    }
    this.handlers[eventName].push(handler);
    return this;
  }

  /**
   * Dispatch an event to all registered handlers (compatibility method)
   * @param {string} eventName - Name of the event to dispatch
   * @param {Object} eventData - Data to pass to handlers
   * @returns {Promise<Array>} - Promises from all handlers
   */
  dispatch(eventName, eventData) {
    this.logger.debug(`Dispatching event: ${eventName} (via compatibility layer)`);

    // Use the robust event bus under the hood
    return robustEventBus.publish(eventName, eventData);
  }

  /**
   * Alias for dispatch to match other event systems
   * @param {string} eventName - Name of the event to publish
   * @param {Object} eventData - Data to pass to handlers
   * @returns {Promise<Array>} - Promises from all handlers
   */
  publish(eventName, eventData) {
    return this.dispatch(eventName, eventData);
  }

  /**
   * Clear all event handlers (compatibility method)
   */
  clear() {
    this.logger.warn('Clearing all event handlers (via compatibility layer)');

    // Clear handlers from the robust event bus
    Object.keys(this.handlers).forEach(eventName => {
      robustEventBus.removeAllListeners(eventName);
    });

    // Clear local handlers map
    this.handlers = {};
  }

  /**
   * Get metrics about event processing
   * @returns {Object} Event metrics
   */
  getMetrics() {
    return robustEventBus.getMetrics();
  }
}

// Create the compatibility singleton
const domainEvents = new DomainEventsCompatibility();

// Export for backward compatibility
export default domainEvents;

// Named exports for better import syntax
export const eventBus = domainEvents;
export { EventTypes };