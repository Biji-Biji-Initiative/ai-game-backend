/**
 * Dependency Injection Container
 * 
 * Infrastructure service for managing application dependencies.
 * Following Domain-Driven Design principles for clean infrastructure.
 */

class DIContainer {
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
  }

  /**
   * Register an instance directly
   * @param {string} name - Service name
   * @param {any} instance - Service instance
   */
  registerInstance(name, instance) {
    this.services.set(name.toLowerCase(), instance);
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
}

// Create and export singleton container
const container = new DIContainer();

module.exports = {
  container,
  DIContainer
}; 