/**
 * Event Bus
 * 
 * Provides a publish-subscribe mechanism for communication between components
 */

import { logger } from '../utils/logger';

/**
 * Event handler function type
 */
export type EventHandler = (data: unknown) => void;

/**
 * Event subscription object
 */
interface EventSubscription {
  /**
   * Event handler function
   */
  handler: EventHandler;
  
  /**
   * Event scope for filtering
   */
  scope?: string;
}

/**
 * Event bus for publish-subscribe pattern
 */
export class EventBus {
  private static instance: EventBus;
  private events: Map<string, EventSubscription[]>;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.events = new Map();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    
    return EventBus.instance;
  }
  
  /**
   * Subscribe to an event
   * @param eventName Event name to subscribe to
   * @param handler Event handler function
   * @param scope Optional scope for filtering events
   * @returns Unsubscribe function
   */
  public on(eventName: string, handler: EventHandler, scope?: string): () => void {
    // Get or create event subscribers list
    const subscribers = this.events.get(eventName) || [];
    
    // Create subscription
    const subscription: EventSubscription = { handler, scope };
    
    // Add to subscribers
    subscribers.push(subscription);
    
    // Update events map
    this.events.set(eventName, subscribers);
    
    logger.debug(`Subscribed to event: ${eventName}${scope ? ` with scope: ${scope}` : ''}`);
    
    // Return unsubscribe function
    return () => this.off(eventName, handler);
  }
  
  /**
   * Unsubscribe from an event
   * @param eventName Event name to unsubscribe from
   * @param handler Event handler function to remove
   */
  public off(eventName: string, handler: EventHandler): void {
    // Get subscribers for this event
    const subscribers = this.events.get(eventName);
    
    if (!subscribers || subscribers.length === 0) {
      return;
    }
    
    // Filter out the handler
    const filteredSubscribers = subscribers.filter(sub => sub.handler !== handler);
    
    // Update events map
    if (filteredSubscribers.length === 0) {
      this.events.delete(eventName);
    } else {
      this.events.set(eventName, filteredSubscribers);
    }
    
    logger.debug(`Unsubscribed from event: ${eventName}`);
  }
  
  /**
   * Subscribe to an event for one invocation
   * @param eventName Event name to subscribe to
   * @param handler Event handler function
   * @param scope Optional scope for filtering events
   */
  public once(eventName: string, handler: EventHandler, scope?: string): void {
    // Create a wrapper handler that unsubscribes itself
    const wrappedHandler: EventHandler = (data: unknown) => {
      // Unsubscribe first to prevent recursion if the handler emits the same event
      this.off(eventName, wrappedHandler);
      
      // Call the original handler
      handler(data);
    };
    
    // Register the wrapped handler
    this.on(eventName, wrappedHandler, scope);
  }
  
  /**
   * Emit an event with data
   * @param eventName Event name to emit
   * @param data Data to pass to handlers
   * @param scope Optional scope for filtering which handlers receive the event
   */
  public emit(eventName: string, data?: unknown, scope?: string): void {
    // Get subscribers for this event
    const subscribers = this.events.get(eventName);
    
    if (!subscribers || subscribers.length === 0) {
      return;
    }
    
    // Call each subscriber handler
    subscribers.forEach(subscription => {
      // Filter by scope if provided
      if (scope && subscription.scope && subscription.scope !== scope) {
        return;
      }
      
      try {
        subscription.handler(data);
      } catch (error) {
        logger.error(`Error in event handler for '${eventName}':`, error);
      }
    });
  }
  
  /**
   * Remove all subscribers for a specific event
   * @param eventName Event name to clear
   */
  public clearEvent(eventName: string): void {
    this.events.delete(eventName);
    logger.debug(`Cleared all subscribers for event: ${eventName}`);
  }
  
  /**
   * Remove all subscribers
   */
  public clearAll(): void {
    this.events.clear();
    logger.debug('Cleared all event subscribers');
  }
  
  /**
   * Get the number of subscribers for an event
   * @param eventName Event name
   * @returns Number of subscribers
   */
  public getSubscriberCount(eventName: string): number {
    const subscribers = this.events.get(eventName);
    return subscribers ? subscribers.length : 0;
  }
  
  /**
   * Check if an event has subscribers
   * @param eventName Event name
   * @returns Whether the event has subscribers
   */
  public hasSubscribers(eventName: string): boolean {
    return this.getSubscriberCount(eventName) > 0;
  }
  
  /**
   * Get all registered event names
   * @returns Array of event names
   */
  public getEventNames(): string[] {
    return Array.from(this.events.keys());
  }
}

