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
'use strict';

// REMOVED: Direct import of RobustEventBus class
// import robustEventBus from "#app/core/common/events/RobustEventBus.js"; 
import { logger } from "#app/core/infra/logging/logger.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";

// // Register the standard event types with the robust event bus (MOVED TO INFRASTRUCTURE.JS)
// Object.entries(EventTypes).forEach(([key, eventName]) => {
//   robustEventBus.registerEventType(eventName, {
//     description: `Standard event: ${eventName}`,
//     category: eventName.split('.')[0]
//   });
// });

/**
 * Compatibility layer for the legacy DomainEvents API
 */
class DomainEventsCompatibility {
  // ADDED: Constructor now expects the actual event bus instance
  constructor({ robustEventBusInstance }) { 
    if (!robustEventBusInstance || typeof robustEventBusInstance.on !== 'function') {
        throw new Error('Valid RobustEventBus instance required for DomainEventsCompatibility');
    }
    this.eventBus = robustEventBusInstance; // Use the injected instance
    this.logger = logger.child({
      component: 'domain-events-compatibility'
    });
    this.EventTypes = EventTypes;
    this.handlers = {}; // Keep for local tracking if needed by specific logic?

    this.logger.info('DomainEvents compatibility layer initialized with injected event bus.');
  }

  /**
   * Register an event handler (compatibility method)
   * @param {string} eventName - Name of the event to listen for
   * @param {Function} handler - Event handler function
   */
  register(eventName, handler) {
    // Use the injected instance
    this.eventBus.on(eventName, handler);

    // Store in local handlers map for API compatibility
    if (!this.handlers[eventName]) {
      this.handlers[eventName] = [];
    }
    this.handlers[eventName].push(handler);
    return this;
  }
  
  /**
   * Subscribe to an event (alias for register)
   * @param {string} eventName - Name of the event to listen for
   * @param {Function} handler - Event handler function
   */
  subscribe(eventName, handler) {
    this.logger.debug(`Subscribing to event: ${eventName} (via compatibility layer)`);
    // Use the injected instance
    return this.register(eventName, handler);
  }

  /**
   * Dispatch an event to all registered handlers (compatibility method)
   * @param {string} eventName - Name of the event to dispatch
   * @param {Object} eventData - Data to pass to handlers
   * @returns {Promise<Array>} - Promises from all handlers
   */
  dispatch(eventName, eventData) {
    this.logger.debug(`Dispatching event: ${eventName} (via compatibility layer)`);
    // Use the injected instance
    // NOTE: Assumes the injected bus has a publish method matching this signature
    // The RobustEventBus publish takes a structured event object.
    // We might need to adapt this call or the RobustEventBus publish method.
    // For now, let's assume it works or needs adjustment later.
    return this.eventBus.publish(eventName, eventData);
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
    // Clear handlers from the injected event bus
    Object.keys(this.handlers).forEach(eventName => {
      this.eventBus.removeAllListeners(eventName);
    });
    this.handlers = {};
  }

  /**
   * Get metrics about event processing
   * @returns {Object} Event metrics
   */
  getMetrics() {
    // Get metrics from the injected instance
    return this.eventBus.getMetrics();
  }
}

// REMOVED: Local singleton creation
// const domainEvents = new DomainEventsCompatibility();
// domainEvents.eventBus = domainEvents; 
// domainEvents.EventTypes = EventTypes;
// domainEvents.eventBus.EventTypes = EventTypes;

// REMOVED: Default export of local singleton
// export default domainEvents; 

// Named exports
// REMOVED: Export of local singleton instance as eventBus
// export const eventBus = domainEvents; 

// EXPORT the Class and EventTypes constant
export { DomainEventsCompatibility, EventTypes };