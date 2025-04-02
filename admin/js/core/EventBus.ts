// Types improved by ts-improve-types
import { EventBus as IEventBus, EventHandler } from '../types/component-base';

/**
 * Simple event bus implementation for component communication
 */
export class EventBus implements IEventBus {
  private events: Map<string, Set<EventHandler>> = new Map();
  private static instance: EventBus;

  /**
   * Get the singleton instance of EventBus
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Private constructor to prevent direct creation
   */
  private constructor() {
    this.events = new Map(); // Property added
  }

  /**
   * Subscribe to an event
   * @param event Event name
   * @param handler Event handler
   */
  public subscribe<T = unknown>(event: string, handler: EventHandler<T>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    const handlers = this.events.get(event);
    if (handlers) {
      handlers.add(handler as EventHandler);
    }
  }

  /**
   * Unsubscribe from an event
   * @param event Event name
   * @param handler Event handler to remove
   */
  public unsubscribe<T = unknown>(event: string, handler: EventHandler<T>): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * Publish an event
   * @param event Event name
   * @param data Event data
   */
  public publish<T = unknown>(event: string, data?: T): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Emit an event (alias for publish)
   * @param event Event name
   * @param data Event data
   */
  public emit<T = unknown>(event: string, data?: T): void {
    this.publish(event, data);
  }

  /**
   * Check if an event has subscribers
   * @param event Event name
   * @returns True if the event has subscribers
   */
  public hasSubscribers(event: string): boolean {
    const handlers = this.events.get(event);
    return !!handlers && handlers.size > 0;
  }

  /**
   * Clear all subscriptions for an event
   * @param event Event name
   */
  public clearEvent(event: string): void {
    this.events.delete(event);
  }

  /**
   * Clear all events and subscriptions
   */
  public clearAll(): void {
    this.events.clear();
  }
}
