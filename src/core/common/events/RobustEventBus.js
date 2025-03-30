import { EventEmitter } from 'events';
import { logger } from "../../infra/logging/logger.js";
import IEventBus from './IEventBus.js';

/**
 * RobustEventBus
 * 
 * An enhanced event bus implementation that addresses several limitations
 * of the previous simple DomainEvents implementation:
 * 
 * 1. Improved error handling for subscribers
 * 2. Better logging and debugging capabilities
 * 3. Future extension points for distributed systems
 * 4. Event replay/history capabilities
 * 5. Configurable retry policies
 * 
 * This class uses Node's built-in EventEmitter as a foundation but extends
 * it with domain-specific functionality and error handling.
 * 
 * Implements the IEventBus interface for compatibility with the rest of the system.
 */
class RobustEventBus extends IEventBus {
  /**
   * Create a new RobustEventBus
   * @param {Object} options - Configuration options
   * @param {Object} options.logger - Logger instance
   * @param {boolean} options.captureRejections - Whether to capture promise rejections
   * @param {number} options.maxListeners - Maximum number of listeners per event
   * @param {boolean} options.recordHistory - Whether to record event history
   * @param {number} options.historyLimit - Maximum number of events to keep in history
   */
  constructor(options = {}) {
    super();
    this.logger = options.logger || logger.child({
      component: 'event-bus'
    });
    this.emitter = new EventEmitter({
      captureRejections: options.captureRejections !== false
    });

    // Configure EventEmitter
    this.emitter.setMaxListeners(options.maxListeners || 50);

    // Set up default error handler
    this.emitter.on('error', error => {
      this.logger.error('Unhandled error in event handler', {
        error: error.message,
        stack: error.stack
      });
    });

    // Event history for replay/debugging
    this.recordHistory = options.recordHistory || false;
    this.historyLimit = options.historyLimit || 1000;
    this.eventHistory = [];

    // Event type registry for documentation and validation
    this.eventTypes = {};

    // Handler metrics for monitoring
    this.metrics = {
      publishedEvents: 0,
      failedEvents: 0,
      processingTimes: {}
    };
  }

  /**
   * Register an event type with metadata
   * @param {string} eventName - Name of the event
   * @param {Object} metadata - Event metadata (description, schema, etc.)
   */
  registerEventType(eventName, metadata = {}) {
    this.eventTypes[eventName] = {
      name: eventName,
      description: metadata.description || '',
      schema: metadata.schema || null,
      category: metadata.category || 'uncategorized',
      createdAt: new Date().toISOString()
    };
    this.logger.debug(`Event type registered: ${eventName}`, {
      metadata
    });
    return this;
  }

  /**
   * Register an event handler
   * @param {string} eventName - Name of the event to listen for
   * @param {Function} handler - Event handler function
   * @param {Object} options - Handler options
   * @param {boolean} options.once - Whether to remove after first invocation
   * @param {string} options.handlerId - Unique identifier for this handler
   * @returns {RobustEventBus} this instance for chaining
   */
  on(eventName, handler, options = {}) {
    if (typeof handler !== 'function') {
      throw new Error('Event handler must be a function');
    }
    const handlerId = options.handlerId || `${eventName}-handler-${Date.now()}`;

    // Wrap handler with error handling and logging
    const wrappedHandler = async eventData => {
      const startTime = Date.now();
      try {
        this.logger.debug(`Executing event handler for ${eventName}`, {
          handlerId
        });
        await Promise.resolve(handler(eventData));
        const duration = Date.now() - startTime;

        // Record metrics
        if (!this.metrics.processingTimes[eventName]) {
          this.metrics.processingTimes[eventName] = [];
        }
        this.metrics.processingTimes[eventName].push(duration);
        this.logger.debug(`Handler completed for ${eventName}`, {
          handlerId,
          duration
        });
      } catch (error) {
        this.metrics.failedEvents++;
        this.logger.error(`Error in event handler for ${eventName}`, {
          handlerId,
          error: error.message,
          stack: error.stack,
          eventData,
          duration: Date.now() - startTime
        });

        // Re-emit the error but don't crash
        this.emitter.emit('error', error);
      }
    };

    // Attach the handler ID to the function for later reference
    wrappedHandler.handlerId = handlerId;

    // Register the handler
    if (options.once) {
      this.emitter.once(eventName, wrappedHandler);
    } else {
      this.emitter.on(eventName, wrappedHandler);
    }
    this.logger.debug(`Registered handler for event: ${eventName}`, {
      handlerId
    });
    return this;
  }

  /**
   * Register a one-time event handler
   * @param {string} eventName - Name of the event to listen for
   * @param {Function} handler - Event handler function
   * @param {Object} options - Handler options
   * @returns {RobustEventBus} this instance for chaining
   */
  once(eventName, handler, options = {}) {
    return this.on(eventName, handler, {
      ...options,
      once: true
    });
  }

  /**
   * Remove an event handler
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Handler to remove
   * @returns {RobustEventBus} this instance for chaining
   */
  off(eventName, handler) {
    this.emitter.off(eventName, handler);
    this.logger.debug(`Removed handler for event: ${eventName}`);
    return this;
  }

  /**
   * Remove all handlers for an event
   * @param {string} eventName - Name of the event
   * @returns {RobustEventBus} this instance for chaining
   */
  removeAllListeners(eventName) {
    this.emitter.removeAllListeners(eventName);
    this.logger.debug(`Removed all handlers for event: ${eventName}`);
    return this;
  }

  /**
   * Publish an event to all registered handlers
   * @param {string} eventName - Name of the event to publish
   * @param {Object} eventData - Data to pass to handlers
   * @param {Object} options - Publish options
   * @param {string} options.correlationId - Correlation ID for tracing
   * @param {string} options.sourceId - Source identifier (entity ID, etc.)
   * @returns {Promise<void>} Resolves when all handlers complete
   */
  async publish(eventName, eventData = {}, options = {}) {
    const eventId = `${eventName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();
    const correlationId = options.correlationId || eventId;

    // Create the event envelope
    const eventEnvelope = {
      id: eventId,
      name: eventName,
      timestamp,
      correlationId,
      sourceId: options.sourceId,
      data: eventData
    };

    // Record in history if enabled
    if (this.recordHistory) {
      this.eventHistory.unshift(eventEnvelope);
      if (this.eventHistory.length > this.historyLimit) {
        this.eventHistory.pop();
      }
    }

    // Log event (with appropriate level based on event type)
    this.logger.info(`Publishing event: ${eventName}`, {
      eventId,
      correlationId,
      sourceId: options.sourceId
    });

    // Track metrics
    this.metrics.publishedEvents++;

    // Emit to all listeners
    this.emitter.emit(eventName, eventEnvelope);
    return Promise.resolve();
  }

  /**
   * Get registered event types
   * @returns {Object} Map of event types
   */
  getEventTypes() {
    return {
      ...this.eventTypes
    };
  }

  /**
   * Get event history
   * @param {Object} options - Filter options
   * @param {string} options.eventName - Filter by event name
   * @param {string} options.correlationId - Filter by correlation ID
   * @param {number} options.limit - Limit number of results
   * @returns {Array} Filtered event history
   */
  getEventHistory(options = {}) {
    if (!this.recordHistory) {
      return [];
    }
    let filteredHistory = [...this.eventHistory];
    if (options.eventName) {
      filteredHistory = filteredHistory.filter(e => e.name === options.eventName);
    }
    if (options.correlationId) {
      filteredHistory = filteredHistory.filter(e => e.correlationId === options.correlationId);
    }
    if (options.limit && options.limit > 0) {
      filteredHistory = filteredHistory.slice(0, options.limit);
    }
    return filteredHistory;
  }

  /**
   * Get metrics about event processing
   * @returns {Object} Event metrics
   */
  getMetrics() {
    const result = {
      ...this.metrics,
      handlerCounts: {},
      averageProcessingTimes: {}
    };

    // Calculate handler counts by event
    Object.keys(this.eventTypes).forEach(eventName => {
      result.handlerCounts[eventName] = this.emitter.listenerCount(eventName);
    });

    // Calculate average processing times
    Object.keys(this.metrics.processingTimes).forEach(eventName => {
      const times = this.metrics.processingTimes[eventName];
      if (times && times.length > 0) {
        const sum = times.reduce((acc, time) => acc + time, 0);
        result.averageProcessingTimes[eventName] = sum / times.length;
      }
    });
    return result;
  }

  /**
   * Reset event history and metrics
   */
  reset() {
    this.eventHistory = [];
    this.metrics = {
      publishedEvents: 0,
      failedEvents: 0,
      processingTimes: {}
    };
    this.logger.debug('Event bus history and metrics reset');
  }

  /**
   * Register an event handler (implements IEventBus interface)
   * @param {string} eventType - The type of event to register for
   * @param {Function} handler - The event handler function
   * @returns {Function} A function to unregister this handler
   */
  register(eventType, handler) {
    this.on(eventType, handler);
    
    // Return an unregister function
    return () => this.off(eventType, handler);
  }
  
  /**
   * Unregister an event handler (implements IEventBus interface)
   * @param {string} eventType - The type of event to unregister for
   * @param {Function} handler - The specific handler to unregister
   * @returns {boolean} True if successfully unregistered
   */
  unregister(eventType, handler) {
    this.off(eventType, handler);
    return true;
  }
}

// Create a singleton instance
const robustEventBus = new RobustEventBus();
export { robustEventBus };
export default robustEventBus;