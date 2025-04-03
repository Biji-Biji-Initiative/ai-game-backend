/**
 * Service Manager
 * 
 * Manages service lifecycle including initialization, dependencies, and disposal
 */

import { EventBus } from './EventBus';
import { logger } from '../utils/logger';

/**
 * Service interface
 */
export interface Service {
  /**
   * Initialize the service
   */
  init(): Promise<void>;
  
  /**
   * Dispose of the service
   */
  dispose?(): Promise<void>;
}

/**
 * Service registration options
 */
export interface ServiceOptions {
  /**
   * Dependencies required by this service
   */
  dependencies?: string[];
  
  /**
   * Whether to initialize automatically
   */
  autoInit?: boolean;
  
  /**
   * Service priority (higher priority services initialize first)
   */
  priority?: number;
}

/**
 * Service states
 */
export enum ServiceState {
  /**
   * Service is registered but not initialized
   */
  REGISTERED = 'registered',
  
  /**
   * Service is currently initializing
   */
  INITIALIZING = 'initializing',
  
  /**
   * Service is initialized and ready
   */
  READY = 'ready',
  
  /**
   * Service initialization failed
   */
  ERROR = 'error',
  
  /**
   * Service is disposed
   */
  DISPOSED = 'disposed',
}

/**
 * Service registration information
 */
interface ServiceRegistration {
  /**
   * Factory function to create the service
   */
  factory: () => Service;
  
  /**
   * Service instance
   */
  instance?: Service;
  
  /**
   * Service options
   */
  options: ServiceOptions;
  
  /**
   * Current service state
   */
  state: ServiceState;
  
  /**
   * Error that occurred during initialization (if any)
   */
  error?: Error;
}

/**
 * Service manager for handling service lifecycle
 */
export class ServiceManager {
  private static instance: ServiceManager;
  private services: Map<string, ServiceRegistration>;
  private eventBus: EventBus;
  private initializing: Set<string>;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.services = new Map();
    this.eventBus = EventBus.getInstance();
    this.initializing = new Set();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    
    return ServiceManager.instance;
  }
  
  /**
   * Register a service
   * @param name Service name
   * @param factory Factory function to create the service
   * @param options Service options
   */
  public register(name: string, factory: () => Service, options: ServiceOptions = {}): void {
    if (this.services.has(name)) {
      logger.warn(`Service '${name}' is already registered. Overriding previous registration.`);
    }
    
    // Set default options
    const defaultOptions: ServiceOptions = {
      dependencies: [],
      autoInit: false,
      priority: 0,
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Register the service
    this.services.set(name, {
      factory,
      options: mergedOptions,
      state: ServiceState.REGISTERED,
    });
    
    logger.debug(`Registered service: ${name}`);
    this.eventBus.emit('service:registered', { name, options: mergedOptions });
    
    // Auto-initialize if requested
    if (mergedOptions.autoInit) {
      // Initialize in next tick to allow all registrations to complete
      setTimeout(() => {
        this.initService(name).catch(error => {
          logger.error(`Auto-initialization of service '${name}' failed:`, error);
        });
      }, 0);
    }
  }
  
  /**
   * Initialize a service
   * @param name Service name
   * @returns Promise that resolves when the service is initialized
   */
  public async initService(name: string): Promise<Service> {
    // Check if service exists
    const registration = this.services.get(name);
    if (!registration) {
      throw new Error(`Service '${name}' is not registered.`);
    }
    
    // Return already initialized service
    if (registration.state === ServiceState.READY && registration.instance) {
      return registration.instance;
    }
    
    // Check for circular dependencies
    if (this.initializing.has(name)) {
      throw new Error(`Circular dependency detected while initializing '${name}'.`);
    }
    
    // Mark as initializing
    registration.state = ServiceState.INITIALIZING;
    this.initializing.add(name);
    
    this.eventBus.emit('service:initializing', { name });
    
    try {
      // Initialize dependencies first
      const dependencies = registration.options.dependencies || [];
      
      // Initialize all dependencies in parallel
      await Promise.all(
        dependencies.map(dep => this.initService(dep)),
      );
      
      // Create service instance if needed
      if (!registration.instance) {
        registration.instance = registration.factory();
      }
      
      // Initialize the service
      await registration.instance.init();
      
      // Mark as ready
      registration.state = ServiceState.READY;
      this.eventBus.emit('service:ready', { name });
      
      logger.debug(`Service initialized: ${name}`);
      
      return registration.instance;
    } catch (error) {
      // Handle initialization error
      registration.state = ServiceState.ERROR;
      registration.error = error instanceof Error ? error : new Error(String(error));
      
      this.eventBus.emit('service:error', { 
        name,
        error: registration.error,
      });
      
      logger.error(`Failed to initialize service '${name}':`, error);
      
      throw registration.error;
    } finally {
      // Remove from initializing set
      this.initializing.delete(name);
    }
  }
  
  /**
   * Dispose of a service
   * @param name Service name
   */
  public async disposeService(name: string): Promise<void> {
    const registration = this.services.get(name);
    if (!registration || !registration.instance) {
      return;
    }
    
    // Check if already disposed
    if (registration.state === ServiceState.DISPOSED) {
      return;
    }
    
    this.eventBus.emit('service:disposing', { name });
    
    try {
      // Call dispose if implemented
      if (registration.instance.dispose) {
        await registration.instance.dispose();
      }
      
      registration.state = ServiceState.DISPOSED;
      this.eventBus.emit('service:disposed', { name });
      
      logger.debug(`Service disposed: ${name}`);
    } catch (error) {
      registration.state = ServiceState.ERROR;
      registration.error = error instanceof Error ? error : new Error(String(error));
      
      this.eventBus.emit('service:error', { 
        name,
        error: registration.error,
      });
      
      logger.error(`Failed to dispose service '${name}':`, error);
      
      throw registration.error;
    }
  }
  
  /**
   * Get a service instance
   * @param name Service name
   * @returns Service instance
   */
  public getService<T extends Service>(name: string): T {
    const registration = this.services.get(name);
    
    if (!registration || !registration.instance) {
      throw new Error(`Service '${name}' is not initialized.`);
    }
    
    if (registration.state === ServiceState.ERROR) {
      throw new Error(`Service '${name}' is in error state: ${registration.error?.message}`);
    }
    
    if (registration.state === ServiceState.DISPOSED) {
      throw new Error(`Service '${name}' has been disposed.`);
    }
    
    return registration.instance as T;
  }
  
  /**
   * Check if a service is registered
   * @param name Service name
   * @returns Whether the service is registered
   */
  public hasService(name: string): boolean {
    return this.services.has(name);
  }
  
  /**
   * Get a service's current state
   * @param name Service name
   * @returns Service state
   */
  public getServiceState(name: string): ServiceState | undefined {
    return this.services.get(name)?.state;
  }
  
  /**
   * Get all registered service names
   * @returns Array of service names
   */
  public getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }
  
  /**
   * Get services by state
   * @param state Service state to filter by
   * @returns Array of service names
   */
  public getServicesByState(state: ServiceState): string[] {
    return Array.from(this.services.entries())
      .filter(([_, registration]) => registration.state === state)
      .map(([name]) => name);
  }
  
  /**
   * Initialize all registered services
   * @returns Promise that resolves when all services are initialized
   */
  public async initAllServices(): Promise<Service[]> {
    // Get all services sorted by priority
    const serviceNames = this.getServiceNames().sort((a, b) => {
      const priorityA = this.services.get(a)?.options.priority || 0;
      const priorityB = this.services.get(b)?.options.priority || 0;
      return priorityB - priorityA; // Higher priority first
    });
    
    // Initialize each service
    const services = await Promise.all(
      serviceNames.map(name => this.initService(name)),
    );
    
    logger.info(`Initialized ${services.length} services`);
    return services;
  }
  
  /**
   * Dispose all services
   */
  public async disposeAllServices(): Promise<void> {
    // Dispose in reverse priority order
    const serviceNames = this.getServiceNames().sort((a, b) => {
      const priorityA = this.services.get(a)?.options.priority || 0;
      const priorityB = this.services.get(b)?.options.priority || 0;
      return priorityA - priorityB; // Lower priority first (reverse)
    });
    
    // Dispose each service
    for (const name of serviceNames) {
      await this.disposeService(name);
    }
    
    logger.info('All services disposed');
  }
  
  /**
   * Reset the service manager (dispose and clear all services)
   */
  public async reset(): Promise<void> {
    await this.disposeAllServices();
    this.services.clear();
    this.initializing.clear();
    
    logger.info('Service manager reset');
  }
} 