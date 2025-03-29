/**
 * Domain Events module - fixed version
 * Handles event registration and dispatch for the application
 */

// Simple event emitter implementation
/**
 *
 */
class DomainEvents {
  /**
   *
   */
  constructor() {
    this.handlers = {};
  }

  /**
   * Register an event handler
   * @param {string} eventName - Name of the event to listen for
   * @param {Function} handler - Event handler function
   */
  register(eventName, handler) {
    if (!this.handlers[eventName]) {
      this.handlers[eventName] = [];
    }
    this.handlers[eventName].push(handler);
    return this;
  }

  /**
   * Dispatch an event to all registered handlers
   * @param {string} eventName - Name of the event to dispatch
   * @param {Object} eventData - Data to pass to handlers
   * @returns {Promise<Array>} - Promises from all handlers
   */
  dispatch(eventName, eventData) {
    const handlers = this.handlers[eventName] || [];
    console.log(`Dispatching event: ${eventName} to ${handlers.length} handlers`);
    
    const promises = handlers.map(handler => {
      try {
        // Wrap handler execution in a promise
        return Promise.resolve(handler(eventData));
      } catch (error) {
        console.error(`Error in event handler for ${eventName}:`, error);
        return Promise.reject(error);
      }
    });
    
    return Promise.all(promises);
  }

  /**
   * Clear all event handlers
   */
  clear() {
    this.handlers = {};
  }
}

// Singleton instance
const domainEvents = new DomainEvents();

module.exports = domainEvents;
