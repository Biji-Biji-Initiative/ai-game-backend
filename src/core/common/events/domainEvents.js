/**
 * Domain Events System
 * 
 * Implements an event bus for domain events following DDD principles.
 * This allows for loose coupling between domains through events.
 */
const { logger } = require('../../infra/logging/logger');

/**
 * Event types - Central registry of all domain events
 */
const EventTypes = {
  // Challenge domain events
  CHALLENGE_CREATED: 'challenge.created',
  CHALLENGE_UPDATED: 'challenge.updated',
  CHALLENGE_RESPONSE_SUBMITTED: 'challenge.response.submitted',
  CHALLENGE_EVALUATED: 'challenge.evaluated',
  
  // User domain events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_PROFILE_COMPLETED: 'user.profile.completed',
  
  // User journey domain events
  USER_JOURNEY_EVENT_RECORDED: 'userJourney.event.recorded',
  USER_MILESTONE_REACHED: 'userJourney.milestone.reached',
  
  // Focus area domain events
  FOCUS_AREA_CREATED: 'focusArea.created',
  FOCUS_AREA_UPDATED: 'focusArea.updated',
  USER_FOCUS_AREA_SET: 'focusArea.user.set',
  
  // Evaluation domain events
  EVALUATION_STARTED: 'evaluation.started',
  EVALUATION_COMPLETED: 'evaluation.completed',
  
  // Personality domain events
  PERSONALITY_TRAIT_IDENTIFIED: 'personality.trait.identified',
  PERSONALITY_PROFILE_UPDATED: 'personality.profile.updated',
  
  // Progress domain events
  PROGRESS_UPDATED: 'progress.updated',
  ACHIEVEMENT_UNLOCKED: 'progress.achievement.unlocked',
  
  // Adaptive domain events
  ADAPTIVE_RECOMMENDATION_GENERATED: 'adaptive.recommendation.generated'
};

/**
 * DomainEvent class represents an event that occurred in a domain
 */
class DomainEvent {
  constructor(type, payload, metadata = {}) {
    this.type = type;
    this.payload = payload;
    this.metadata = {
      timestamp: new Date().toISOString(),
      ...metadata
    };
  }
}

/**
 * EventSubscription represents a subscription to a specific event type
 */
class EventSubscription {
  constructor(eventType, handler, id) {
    this.eventType = eventType;
    this.handler = handler;
    this.id = id;
  }
}

/**
 * EventBus handles publishing and subscribing to domain events
 */
class EventBus {
  constructor() {
    // Map of event types to array of handlers
    this.subscriptions = new Map();
    
    // Counter for subscription IDs
    this.subscriptionCounter = 0;
  }
  
  /**
   * Subscribe to an event type
   * @param {string} eventType - Event type to subscribe to
   * @param {Function} handler - Handler function to call when event occurs
   * @returns {string} Subscription ID for later unsubscribing
   */
  subscribe(eventType, handler) {
    if (!eventType) {
      throw new Error('Event type is required for subscription');
    }
    
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }
    
    // Create a new subscription ID
    const subscriptionId = `sub_${++this.subscriptionCounter}`;
    
    // Create a subscription object
    const subscription = new EventSubscription(eventType, handler, subscriptionId);
    
    // Add to subscriptions map
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    
    this.subscriptions.get(eventType).push(subscription);
    
    logger.debug(`Subscribed to event: ${eventType}`, { subscriptionId });
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from an event
   * @param {string} subscriptionId - ID of subscription to remove
   * @returns {boolean} True if successfully unsubscribed
   */
  unsubscribe(subscriptionId) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required for unsubscribing');
    }
    
    let found = false;
    
    // Search through all event types and subscriptions
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      
      if (index !== -1) {
        subscriptions.splice(index, 1);
        found = true;
        logger.debug(`Unsubscribed from event: ${eventType}`, { subscriptionId });
        break;
      }
    }
    
    return found;
  }
  
  /**
   * Publish an event to all subscribers
   * @param {DomainEvent} event - Event to publish
   */
  async publish(event) {
    if (!event || !event.type) {
      throw new Error('Valid event with type is required for publishing');
    }
    
    // Log event
    logger.debug(`Publishing event: ${event.type}`, {
      eventType: event.type,
      payload: event.payload
    });
    
    // Get subscribers for this event type
    const subscribers = this.subscriptions.get(event.type) || [];
    logger.debug(`Found ${subscribers.length} subscribers for event ${event.type}`);
    
    // Call each subscriber handler with the event
    for (const subscription of subscribers) {
      try {
        logger.debug(`Calling handler for subscription ${subscription.id}`);
        await Promise.resolve(subscription.handler(event));
        logger.debug(`Handler completed for subscription ${subscription.id}`);
      } catch (error) {
        logger.error(`Error in event handler for ${event.type}`, {
          error: error.message,
          subscriptionId: subscription.id,
          stack: error.stack
        });
      }
    }
  }
  
  /**
   * Create and publish a domain event
   * @param {string} type - Event type from EventTypes
   * @param {Object} payload - Event data
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<void>}
   */
  async publishEvent(type, payload, metadata = {}) {
    const event = new DomainEvent(type, payload, metadata);
    await this.publish(event);
  }
  
  /**
   * Reset all subscriptions (for testing)
   */
  reset() {
    this.subscriptions.clear();
    this.subscriptionCounter = 0;
  }
}

// Create a singleton instance
const eventBus = new EventBus();

module.exports = {
  EventTypes,
  DomainEvent,
  eventBus
}; 