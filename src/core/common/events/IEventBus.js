'use strict';

/**
 * Event Bus Interface
 * 
 * Defines the standard interface that all event bus implementations must follow.
 * This allows for different implementations to be used interchangeably,
 * supporting dependency inversion and testability.
 */
class IEventBus {
  /**
   * Register an event handler for a specific event type
   * @param {string} eventType - The type of event to register for
   * @param {Function} handler - The event handler function
   * @returns {Function} A function to unregister this handler (if supported)
   */
  register(eventType, handler) {
    throw new Error('Method not implemented: register must be implemented by subclasses');
  }

  /**
   * Publish an event to registered handlers
   * @param {string} eventType - The type of event to publish
   * @param {Object} payload - The event payload data
   * @returns {Promise<void>} A promise that resolves when all handlers have been called
   */
  publish(eventType, payload) {
    throw new Error('Method not implemented: publish must be implemented by subclasses');
  }

  /**
   * Unregister an event handler
   * @param {string} eventType - The type of event to unregister for
   * @param {Function} handler - The specific handler to unregister
   * @returns {boolean} True if successfully unregistered, false otherwise
   */
  unregister(eventType, handler) {
    throw new Error('Method not implemented: unregister must be implemented by subclasses');
  }

  /**
   * Get event types supported by this event bus
   * @returns {Object} An object with event type constants
   */
  getEventTypes() {
    throw new Error('Method not implemented: getEventTypes must be implemented by subclasses');
  }
}

export default IEventBus; 