// Types improved by ts-improve-types
/**
 * Base Component Interfaces
 *
 * This file defines the base interfaces for all components in the application.
 */

import { EventBus } from '../core/EventBus';

/**
 * Base component interface
 * Provides common methods and properties for all components
 */

/**
 * Base Component Interface
 *
 * Defines the basic contract for all components in the application
 */
export interface Component {
  /**
   * Initialize the component
   */
  initialize?(): void | Promise<void>;

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
  addEventListener(event: string, handler: (data?: unknown) => void): void;

  /**
   * Remove an event listener
   * @param event Event name
   * @param handler Event handler function to remove
   */
  removeEventListener(event: string, handler: (data?: unknown) => void): void;
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
  config?: Record<string, unknown>;

  /**
   * Event bus instance
   */
  eventBus?: EventBus;
}

// Type for event handler functions
export type EventHandler<T = unknown> = (data: T) => void;

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
  getById(i: string): T | null;

  /**
   * Add a new data item
   * @param data New item data
   */
  add(dat: Partial<T>): T;

  /**
   * Update an existing data item
   * @param id Item ID
   * @param data Updated item data
   */
  update(i: string, data: Partial<T>): T | null;

  /**
   * Remove a data item
   * @param id Item ID
   */
  remove(i: string): boolean;

  /**
   * Clear all data
   */
  clear(): void;
}

/**
 * Base class for implementing components with events
 */
export abstract class BaseComponent implements Component, EventEmitter {
  protected readonly eventListeners: Map<string, Set<(data?: unknown) => void>> = new Map();
  protected initialized = false;
  protected eventBus: EventBus;
  protected componentName: string;

  constructor(options?: ComponentOptions) {
    this.eventListeners = new Map();
    this.eventBus = options?.eventBus || EventBus.getInstance();
    this.componentName = this.constructor.name;
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
  addEventListener(event: string, handler: (data?: unknown) => void): void {
    // For backward compatibility, we register with both systems
    // Internal event system (deprecated)
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(handler);
    }
    
    // New EventBus system
    this.eventBus.on(event, handler);
  }

  /**
   * Remove an event listener
   * @param event Event name
   * @param handler Event handler function to remove
   */
  removeEventListener(event: string, handler: (data?: unknown) => void): void {
    // Internal event system (deprecated)
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(handler);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
    
    // New EventBus system
    this.eventBus.off(event, handler);
  }

  /**
   * Emit an event
   * @param event Event name
   * @param data Event data
   * @deprecated Use this.eventBus.emit() instead
   */
  protected emit(event: string, data: Record<string, unknown> | null = null): void {
    // Internal event system (deprecated)
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
    
    // Also emit on the EventBus
    this.eventBus.emit(event, data);
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    this.eventListeners.clear();
    this.initialized = false;
  }
}

/**
 * ComponentBase class that components can extend
 * Provides common functionality for all components
 */
export class ComponentBase extends BaseComponent {
  protected options: ComponentOptions;
  protected element: HTMLElement | null = null;

  /**
   * Create a new component
   * @param options Component options
   */
  constructor(options: ComponentOptions = {}) {
    super(options);
    this.options = {
      debug: false,
      ...options,
    };

    if (this.options.containerId) {
      this.element = document.getElementById(this.options.containerId);
    }
  }

  /**
   * Initialize the component
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    if (this.options.debug) {
      console.debug(`Initializing ${this.componentName}`);
    }

    this.initialized = true;
    this.eventBus.emit('initialized', { component: this });
  }
}
