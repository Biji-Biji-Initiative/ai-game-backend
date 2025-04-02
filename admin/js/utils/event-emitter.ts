// Types improved by ts-improve-types
/**
 * Event Emitter
 *
 * Simple event emitter for component communication
 */

type EventCallback = (...args: unknown[]) => void;

/**
 * Basic event emitter implementation for component communication
 */
export class EventEmitter {
  private events: Map<string, EventCallback[]>;

  /**
   * Constructor
   */
  constructor() {
    this.events = new Map(); // Property added
  }

  /**
   * Add an event listener
   * @param event Event name
   * @param callback Function to call when event is emitted
   */
  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event)?.push(callback);
  }

  /**
   * Remove an event listener
   * @param event Event name
   * @param callback Function to remove
   */
  off(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) return;

    const callbacks = this.events.get(event);
    if (!callbacks) return;

    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }

    // Remove empty event lists
    if (callbacks.length === 0) {
      this.events.delete(event);
    }
  }

  /**
   * Emit an event
   * @param event Event name
   * @param args Arguments to pass to callback functions
   */
  emit(event: string, ...args: unknown[]): void {
    if (!this.events.has(event)) return;

    const callbacks = this.events.get(event);
    if (!callbacks) return;

    for (const callback of callbacks) {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    }
  }

  /**
   * Add a one-time event listener
   * @param event Event name
   * @param callback Function to call when event is emitted
   */
  once(event: string, callback: EventCallback): void {
    const onceCallback = (...args: unknown[]) => {
      this.off(event, onceCallback);
      callback(...args);
    };

    this.on(event, onceCallback);
  }

  /**
   * Remove all listeners for an event
   * @param event Event name (optional, if not provided all events are cleared)
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}
