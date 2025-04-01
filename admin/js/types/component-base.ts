/**
 * Base Component Interfaces
 * 
 * This file defines the base interfaces for all components in the application.
 */

/**
 * Basic component interface that all components should implement
 */
export interface Component {
  /**
   * Initialize the component
   */
  initialize(): void | Promise<void>;
  
  /**
   * Destroy/cleanup the component
   */
  destroy?(): void;
}

/**
 * Interface for components that support events
 */
export interface EventEmitter {
  /**
   * Add an event listener
   * @param event Event name
   * @param handler Event handler function
   */
  addEventListener(event: string, handler: Function): void;
  
  /**
   * Remove an event listener
   * @param event Event name
   * @param handler Event handler function to remove
   */
  removeEventListener(event: string, handler: Function): void;
}

/**
 * Interface for components that can be rendered
 */
export interface Renderable {
  /**
   * Render the component
   */
  render(): void;
  
  /**
   * Clear/reset the component
   */
  clear(): void;
}

/**
 * Base options interface that all component options should extend
 */
export interface ComponentOptions {
  /**
   * Debug mode flag
   */
  debug?: boolean;
  
  /**
   * Container ID or element
   */
  containerId?: string;
  
  /**
   * Additional configuration
   */
  config?: any;
}

/**
 * Event handler type for components
 */
export type EventHandler<T = any> = (data: T) => void;

/**
 * Event bus interface for communication between components
 */
export interface EventBus {
  /**
   * Subscribe to an event
   * @param event Event name
   * @param handler Event handler
   */
  subscribe<T = any>(event: string, handler: EventHandler<T>): void;
  
  /**
   * Unsubscribe from an event
   * @param event Event name
   * @param handler Event handler to remove
   */
  unsubscribe<T = any>(event: string, handler: EventHandler<T>): void;
  
  /**
   * Publish an event
   * @param event Event name
   * @param data Event data
   */
  publish<T = any>(event: string, data?: T): void;
  
  /**
   * Emit an event (alias for publish)
   * @param event Event name
   * @param data Event data
   */
  emit<T = any>(event: string, data?: T): void;
}

/**
 * Base interface for data managers
 */
export interface DataManager<T> extends Component, EventEmitter {
  /**
   * Get all data items
   */
  getAll(): T[];
  
  /**
   * Get a specific data item by ID
   * @param id Item ID
   */
  getById(id: string): T | null;
  
  /**
   * Add a new data item
   * @param data New item data
   */
  add(data: Partial<T>): T;
  
  /**
   * Update an existing data item
   * @param id Item ID
   * @param data Updated item data
   */
  update(id: string, data: Partial<T>): T | null;
  
  /**
   * Remove a data item
   * @param id Item ID
   */
  remove(id: string): boolean;
  
  /**
   * Clear all data
   */
  clear(): void;
}

/**
 * Base class for implementing components with events
 */
export abstract class BaseComponent implements Component, EventEmitter {
  protected readonly eventListeners: Map<string, Set<Function>> = new Map();
  protected initialized: boolean = false;
  
  constructor() {
    // Initialize event listeners map
    this.eventListeners = new Map();
  }
  
  /**
   * Initialize the component
   */
  abstract initialize(): void | Promise<void>;
  
  /**
   * Add an event listener
   * @param event Event name
   * @param handler Event handler function
   */
  addEventListener(event: string, handler: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(handler);
    }
  }
  
  /**
   * Remove an event listener
   * @param event Event name
   * @param handler Event handler function to remove
   */
  removeEventListener(event: string, handler: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(handler);
    }
  }
  
  /**
   * Emit an event
   * @param event Event name
   * @param data Event data
   */
  protected emit(event: string, data: any = null): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
  
  /**
   * Destroy the component
   */
  destroy(): void {
    // Clear all event listeners
    this.eventListeners.clear();
    this.initialized = false;
  }
} 