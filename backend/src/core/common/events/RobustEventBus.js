import { EventEmitter } from 'events';
import { logger } from "#app/core/infra/logging/logger.js";
import { deadLetterQueueService } from "#app/core/common/events/DeadLetterQueueService.js";
import { standardizeEvent } from "#app/core/common/events/eventUtils.js";

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
 * 6. Dead Letter Queue for failed events
 * 
 * This class uses Node's built-in EventEmitter as a foundation but extends
 * it with domain-specific functionality and error handling.
 */
class RobustEventBus {
  /**
   * Create a new RobustEventBus
   * @param {Object} options - Configuration options
   * @param {Object} options.logger - Logger instance
   * @param {boolean} options.captureRejections - Whether to capture promise rejections
   * @param {number} options.maxListeners - Maximum number of listeners per event
   * @param {boolean} options.recordHistory - Whether to record event history
   * @param {number} options.historyLimit - Maximum number of events to keep in history
   * @param {boolean} options.useDLQ - Whether to use the Dead Letter Queue for failed events
   * @param {Object} options.dlqService - Dead Letter Queue service to use
   */
  constructor(options = {}) {
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
    
    // Dead Letter Queue configuration
    this.useDLQ = options.useDLQ !== false;
    this.dlqService = options.dlqService || deadLetterQueueService;
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

    // Wrap handler with error handling, logging, and DLQ support
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

        // Store failed event in dead letter queue if enabled
        if (this.useDLQ && this.dlqService) {
          try {
            await this.dlqService.storeFailedEvent({
              event: eventData,
              handlerId,
              error
            });
            
            this.logger.info(`Event sent to Dead Letter Queue: ${eventName}`, {
              eventId: eventData.id,
              handlerId
            });
          } catch (dlqError) {
            this.logger.error(`Failed to store event in Dead Letter Queue: ${dlqError.message}`, {
              eventId: eventData.id,
              originalError: error.message
            });
          }
        }

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
   * @param {Object} event - The standardized event object with type, data, and metadata fields
   * @returns {Promise<void>} Resolves when all handlers complete
   */
  async publish(event) {
    try {
      // Apply standardization to ensure the event follows the expected structure
      const standardizedEvent = standardizeEvent(event);
      
      // Use standardized event from this point forward
      const eventName = standardizedEvent.type;
      const eventId = `${eventName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Add id to the event envelope for tracing
      const eventEnvelope = {
        id: eventId,
        ...standardizedEvent
      };

      // Record in history if enabled
      if (this.recordHistory) {
        this.eventHistory.unshift(eventEnvelope);
        if (this.eventHistory.length > this.historyLimit) {
          this.eventHistory.pop();
        }
      }

      // Log event
      this.logger.info(`Publishing event: ${eventName}`, {
        eventId,
        correlationId: eventEnvelope.metadata.correlationId,
        entityId: eventEnvelope.data.entityId,
        entityType: eventEnvelope.data.entityType
      });

      // Track metrics
      this.metrics.publishedEvents++;

      // Emit to all listeners
      this.emitter.emit(eventName, eventEnvelope);
      return Promise.resolve();
    } catch (error) {
      this.logger.error(`Error publishing event: ${error.message}`, {
        error: error.stack,
        event: typeof event === 'object' ? {
          type: event.type,
          entityId: event.data?.entityId
        } : event
      });
      throw error;
    }
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
   * Retry a failed event from the dead letter queue
   * @param {string} dlqEntryId - ID of the DLQ entry to retry
   * @returns {Promise<boolean>} True if retry was successful
   */
  async retryFromDLQ(dlqEntryId) {
    if (!this.useDLQ || !this.dlqService) {
      this.logger.warn('Dead letter queue is not enabled, cannot retry event');
      return false;
    }
    
    return this.dlqService.retryEvent(dlqEntryId, this);
  }
  
  /**
   * Retry all failed events matching criteria
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} Results of the retry operation
   */
  async retryFailedEvents(options = {}) {
    if (!this.useDLQ || !this.dlqService) {
      this.logger.warn('Dead letter queue is not enabled, cannot retry events');
      return { total: 0, successful: 0, failed: 0, details: [] };
    }
    
    return this.dlqService.retryEvents(options, this);
  }
  
  /**
   * Get failed events from the dead letter queue
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of DLQ entries
   */
  async getFailedEvents(options = {}) {
    if (!this.useDLQ || !this.dlqService) {
      this.logger.warn('Dead letter queue is not enabled, cannot get failed events');
      return [];
    }
    
    return this.dlqService.getFailedEvents(options);
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
}

// Create a singleton instance with DLQ enabled
const robustEventBus = new RobustEventBus({
  useDLQ: true,
  recordHistory: true
});

export { robustEventBus };
export default robustEventBus;