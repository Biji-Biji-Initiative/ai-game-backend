// Types improved by ts-improve-types
import { Component } from '../types/component-base';
import { ComponentLogger } from '../core/Logger';

/**
 * Factory function type for creating service instances
 */
export type ServiceFactory<T = unknown> = (container: DependencyContainer) => T;

/**
 * Service registration options
 */
export interface ServiceOptions {
  /**
   * Whether the service should be a singleton (default: true)
   */
  singleton?: boolean;

  /**
   * Tags to categorize the service
   */
  tags?: string[];

  /**
   * Service priority (for tagged services)
   */
  priority?: number;
}

/**
 * Service registration record
 */
interface ServiceRegistration {
  /**
   * Service factory function
   */
  factory: ServiceFactory<unknown>;

  /**
   * Service options
   */
  options: ServiceOptions;

  /**
   * Cached instance (for singletons)
   */
  instance?: unknown;
}

/**
 * Dependency Container for managing application services
 */
export class DependencyContainer implements Component {
  private static instance: DependencyContainer;
  private services: Map<string, ServiceRegistration>;
  private aliases: Map<string, string>;
  private tags: Map<string, Set<string>>;
  private initialized = false;
  private logger = ComponentLogger.getLogger('DependencyContainer');

  /**
   * Get the singleton instance of DependencyContainer
   */
  public static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }

  /**
   * Private constructor to prevent direct creation
   */
  private constructor() {
    this.services = new Map(); // Property added
    this.aliases = new Map(); // Property added
    this.tags = new Map(); // Property added
  }

  /**
   * Initialize the container
   */
  public initialize(): void {
    this.logger.info('Dependency container initialized');
    this.initialized = true; // Property added
  }

  /**
   * Register a service with the container
   * @param id Service ID
   * @param factory Factory function to create the service
   * @param options Service options
   */
  public register<T>(id: string, factory: ServiceFactory<T>, options: ServiceOptions = {}): void {
    if (this.services.has(id)) {
      this.logger.warn(`Service '${id}' is already registered. Overwriting.`);
    }

    const serviceOptions: ServiceOptions = {
      singleton: true,
      tags: [],
      priority: 0,
      ...options,
    };

    this.services.set(id, {
      factory,
      options: serviceOptions,
    });

    // Register service tags
    if (serviceOptions.tags && serviceOptions.tags.length > 0) {
      for (const tag of serviceOptions.tags) {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, new Set());
        }

        const taggedServices = this.tags.get(tag);
        if (taggedServices) {
          taggedServices.add(id);
        }
      }
    }

    this.logger.debug(`Registered service '${id}'`);
  }

  /**
   * Check if a service is registered
   * @param id Service ID
   * @returns True if the service is registered
   */
  public has(id: string): boolean {
    // Check for direct service
    if (this.services.has(id)) {
      return true;
    }

    // Check for alias
    if (this.aliases.has(id)) {
      const aliasedId = this.aliases.get(id);
      return aliasedId !== undefined && this.services.has(aliasedId);
    }

    return false;
  }

  /**
   * Get a service instance
   * @param id Service ID
   * @returns Service instance
   * @throws Error if service not found
   */
  public get<T = unknown>(id: string): T {
    // Check for alias
    if (this.aliases.has(id)) {
      const aliasedId = this.aliases.get(id);
      if (aliasedId) {
        return this.get<T>(aliasedId);
      }
    }

    // Get the service
    const registration = this.services.get(id);

    if (!registration) {
      // Enhanced error diagnostics - log available services
      const availableServices = Array.from(this.services.keys()).join(', ');
      const errorMsg = `Service '${id}' not found in container. Available services: ${availableServices || 'none'}`;
      this.logger.error(errorMsg);

      // Try to provide helpful guidance
      if (id === 'mainApiClient') {
        this.logger.warn(
          'mainApiClient is not registered yet. Make sure to wait for bootstrap to complete.',
        );
        if (this.has('apiClient')) {
          this.logger.info(
            'ApiClient is available - you might want to register it as mainApiClient',
          );
          try {
            const apiClient = this.get('apiClient');
            this.register('mainApiClient', () => apiClient);
            this.logger.info('Automatically registered apiClient as mainApiClient');
            return this.get<T>('mainApiClient');
          } catch (registrationError) {
            this.logger.error('Failed to auto-register mainApiClient', registrationError);
          }
        }
      }

      throw new Error(errorMsg);
    }

    // Return cached instance for singletons
    if (registration.options.singleton && registration.instance !== undefined) {
      return registration.instance as T;
    }

    // Create a new instance
    try {
      const instance = registration.factory(this);

      // Cache instance if singleton
      if (registration.options.singleton) {
        registration.instance = instance;
      }

      return instance as T;
    } catch (error) {
      this.logger.error(`Error creating service '${id}':`, error);
      throw new Error(
        `Error creating service '${id}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create a new instance of a service, ignoring singleton status
   * @param id Service ID
   * @returns Service instance
   * @throws Error if service not found
   */
  public create<T = unknown>(id: string): T {
    // Check for alias
    if (this.aliases.has(id)) {
      const aliasedId = this.aliases.get(id);
      if (aliasedId) {
        return this.create<T>(aliasedId);
      }
    }

    // Get the service
    const registration = this.services.get(id);

    if (!registration) {
      throw new Error(`Service '${id}' not found in container`);
    }

    // Create a new instance
    try {
      return registration.factory(this) as T;
    } catch (error) {
      this.logger.error(`Error creating service '${id}':`, error);
      throw new Error(
        `Error creating service '${id}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Register a service alias
   * @param alias Alias name
   * @param id Target service ID
   */
  public alias(alias: string, id: string): void {
    if (!this.services.has(id)) {
      this.logger.warn(`Cannot create alias '${alias}' for unknown service '${id}'`);
      return;
    }

    this.aliases.set(alias, id);
    this.logger.debug(`Registered alias '${alias}' for service '${id}'`);
  }

  /**
   * Get all services with a specific tag
   * @param tag Tag to filter by
   * @returns Array of service instances
   */
  public getByTag<T = unknown>(tag: string): T[] {
    const serviceIds = this.tags.get(tag);

    if (!serviceIds || serviceIds.size === 0) {
      return [];
    }

    // Sort services by priority if provided
    const sortedIds = Array.from(serviceIds).sort((a, b) => {
      const serviceA = this.services.get(a);
      const serviceB = this.services.get(b);

      if (!serviceA || !serviceB) {
        return 0;
      }

      const priorityA = serviceA.options.priority || 0;
      const priorityB = serviceB.options.priority || 0;

      return priorityB - priorityA; // Higher priority first
    });

    return sortedIds.map(id => this.get<T>(id));
  }

  /**
   * Remove a service from the container
   * @param id Service ID
   * @returns True if service was removed
   */
  public remove(id: string): boolean {
    if (!this.services.has(id)) {
      return false;
    }

    // Get service to remove its tags
    const service = this.services.get(id);

    if (service && service.options.tags) {
      for (const tag of service.options.tags) {
        const taggedServices = this.tags.get(tag);
        if (taggedServices) {
          taggedServices.delete(id);

          // Remove tag if empty
          if (taggedServices.size === 0) {
            this.tags.delete(tag);
          }
        }
      }
    }

    // Remove service
    this.services.delete(id);

    // Remove aliases pointing to this service
    for (const [alias, targetId] of this.aliases.entries()) {
      if (targetId === id) {
        this.aliases.delete(alias);
      }
    }

    this.logger.debug(`Removed service '${id}'`);
    return true;
  }

  /**
   * Register a service factory
   * @param id Service ID
   * @param factory Factory function
   * @param options Service options
   */
  public factory<T>(id: string, factory: ServiceFactory<T>, options: ServiceOptions = {}): void {
    // Ensure the service is not a singleton by default
    const factoryOptions: ServiceOptions = {
      ...options,
      singleton: options.singleton === true,
    };

    this.register(id, factory, factoryOptions);
  }

  /**
   * Register a value directly
   * @param id Service ID
   * @param value Value to register
   */
  public value<T>(id: string, value: T): void {
    this.register(id, () => value, { singleton: true });
  }

  /**
   * Get all registered service IDs
   * @returns Array of service IDs
   */
  public getServiceIds(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get all registered tags
   * @returns Array of tags
   */
  public getTags(): string[] {
    return Array.from(this.tags.keys());
  }

  /**
   * Reset the container, removing all services
   */
  public reset(): void {
    this.services.clear();
    this.aliases.clear();
    this.tags.clear();
    this.logger.info('Dependency container reset');
  }
}
