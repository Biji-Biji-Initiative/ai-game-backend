'use strict';

/**
 * Dependency Injection Container
 *
 * Infrastructure service for managing application dependencies.
 * Following Domain-Driven Design principles for clean infrastructure.
 * 
 * This implementation includes helper methods for easier registration and better modularity.
 */

/**
 * Dependency Injection Container Class
 * Manages service registration, creation, and retrieval
 */
class DIContainer {
  /**
   * Create a new DIContainer
   */
  constructor() {
    this.services = new Map();
    this.factories = new Map();
    this.singletons = new Map();
  }

  /**
   * Register a service factory
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that creates the service
   * @param {boolean} singleton - Whether to cache the instance
   * @returns {DIContainer} This container instance for chaining
   */
  register(name, factory, singleton = false) {
    if (typeof factory !== 'function') {
      throw new Error(`Factory for ${name} must be a function`);
    }

    const normalizedName = name.toLowerCase();
    this.factories.set(normalizedName, factory);

    if (singleton) {
      // Register for later resolution as a singleton
      this.singletons.set(normalizedName, true);
    }
    
    return this; // For method chaining
  }

  /**
   * Register an instance directly
   * @param {string} name - Service name
   * @param {any} instance - Service instance
   * @returns {DIContainer} This container instance for chaining
   */
  registerInstance(name, instance) {
    this.services.set(name.toLowerCase(), instance);
    return this; // For method chaining
  }
  
  /**
   * Register multiple components from a module
   * @param {Function} registerFn - Registration function that takes this container as an argument
   * @returns {DIContainer} This container instance for chaining
   */
  registerModule(registerFn) {
    if (typeof registerFn !== 'function') {
      throw new Error('Module registrar must be a function');
    }
    
    registerFn(this);
    return this;
  }
  
  /**
   * Register a service class directly with automatic dependency resolution
   * @param {string} name - Service name
   * @param {Class} ServiceClass - Service class to instantiate
   * @param {Object} options - Registration options
   * @param {string[]} options.dependencies - Array of dependency names to inject
   * @param {boolean} options.singleton - Whether to cache the instance
   * @returns {DIContainer} This container instance for chaining
   */
  registerClass(name, ServiceClass, options = {}) {
    const { dependencies = [], singleton = false } = options;
    
    this.register(name, container => {
      // Resolve dependencies from container
      const resolvedDeps = dependencies.reduce((deps, depName) => {
        deps[depName] = container.get(depName);
        return deps;
      }, {});
      
      // Create new instance with dependencies
      return new ServiceClass(resolvedDeps);
    }, singleton);
    
    return this;
  }

  /**
   * Get a service by name
   * @param {string} name - Service name
   * @returns {any} The resolved service
   */
  get(name) {
    const normalizedName = name.toLowerCase();

    // Return cached instance if available
    if (this.services.has(normalizedName)) {
      return this.services.get(normalizedName);
    }

    // Check if factory exists
    if (!this.factories.has(normalizedName)) {
      throw new Error(`Service '${name}' not registered`);
    }

    // Create new instance
    const factory = this.factories.get(normalizedName);
    const instance = factory(this);

    // Cache if singleton
    if (this.singletons.get(normalizedName)) {
      this.services.set(normalizedName, instance);
    }

    return instance;
  }

  /**
   * Alias for get() to maintain backward compatibility
   * @param {string} name - Service name
   * @returns {any} The resolved service
   */
  resolve(name) {
    return this.get(name);
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean} True if service is registered
   */
  has(name) {
    const normalizedName = name.toLowerCase();
    return this.services.has(normalizedName) || this.factories.has(normalizedName);
  }

  /**
   * Create a new container with all registered services
   * @returns {DIContainer} New container instance with same registrations
   */
  createChild() {
    const child = new DIContainer();

    // Copy all registrations
    this.factories.forEach((factory, name) => {
      child.register(name, factory, this.singletons.get(name));
    });

    // Copy singletons
    this.services.forEach((service, name) => {
      child.registerInstance(name, service);
    });

    return child;
  }
  
  /**
   * Remove a service from the container
   * @param {string} name - Service name
   * @returns {boolean} True if the service was removed
   */
  remove(name) {
    const normalizedName = name.toLowerCase();
    const hadService = this.services.delete(normalizedName);
    const hadFactory = this.factories.delete(normalizedName);
    this.singletons.delete(normalizedName);
    
    return hadService || hadFactory;
  }
}

// Create and export singleton container
const container = new DIContainer();

module.exports = {
  container,
  DIContainer,
};
