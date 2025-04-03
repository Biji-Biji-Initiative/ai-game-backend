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
        this.logger = console; // Assuming console as default logger
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
     * @param {Function} registerFn - Registration function that takes this container and optionally a logger as arguments
     * @param {string} [moduleName] - Optional name for this module (used for logging)
     * @returns {DIContainer} This container instance for chaining
     */
    registerModule(registerFn, moduleName) {
        if (typeof registerFn !== 'function') {
            throw new Error('Module registrar must be a function');
        }
        
        let childLogger = this.logger; // Default to container's logger
        // Ensure the container HAS a logger and a child method before trying to use it
        if (moduleName && this.logger && typeof this.logger.child === 'function') {
            try {
                childLogger = this.logger.child(moduleName);
            } catch (e) {
                this.logger.error(`Failed to create child logger for module: ${moduleName}`, e);
                // Proceed with the parent logger
            }
        } else if (moduleName && (!this.logger || typeof this.logger.child !== 'function')) {
            this.logger?.warn?.(`Container logger doesn't support .child() method, cannot create specific logger for module: ${moduleName}`);
        }

        // Pass the container AND the potentially specific child logger to the registration function
        registerFn(this, childLogger); 
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

        // 1. Check for pre-registered instance FIRST
        if (this.services.has(normalizedName)) {
            this.logger.debug(`[DIContainer] Returning pre-registered instance for '${normalizedName}'`);
            return this.services.get(normalizedName);
        }

        // 2. Check for a factory registration
        const registration = this.factories.get(normalizedName);
        if (!registration) {
            // Log available factories AND instances for better debugging
            const availableFactories = Array.from(this.factories.keys());
            const availableInstances = Array.from(this.services.keys());
            this.logger.error(`[DIContainer] Service '${name}' not found. Factories:`, availableFactories, "Instances:", availableInstances);
            throw new Error(`Service '${name}' not registered`);
        }

        // Handle aliases (assuming alias target is registered via factory or instance)
        if (registration.isAlias) {
            this.logger.debug(`[DIContainer] Resolving alias '${name}' -> '${registration.target}'`);
            return this.get(registration.target); // Recursively resolve the target
        }

        // 3. Handle singleton creation (if factory exists but instance doesn't)
        if (this.singletons.get(normalizedName)) {
             // Instance should have been checked already, but double-check factory logic
            if (!this.services.has(normalizedName)) { 
                this.logger.debug(`[DIContainer] Creating SINGLETON instance for '${name}' via factory`);
                try {
                    const instance = registration(this); // Execute the factory
                    if (!instance) {
                        this.logger.error(`[DIContainer] Factory for SINGLETON '${name}' returned null or undefined!`);
                        throw new Error(`Factory for SINGLETON '${name}' returned null or undefined`);
                    }
                    this.services.set(normalizedName, instance); // Cache the new instance
                    return instance;
                } catch (error) {
                    this.logger.error(`[DIContainer] Error creating SINGLETON instance for '${name}'`, { error: error.message, stack: error.stack });
                    throw error; // Re-throw to propagate the failure
                }
            }
             // This case should theoretically be handled by step 1, but kept for safety
             return this.services.get(normalizedName); 
        }

        // 4. Handle transient creation (or other lifetimes)
        this.logger.debug(`[DIContainer] Creating TRANSIENT instance for '${name}'`);
        try {
            const instance = registration(this); // Execute the factory
             if (!instance) {
                this.logger.error(`[DIContainer] Factory for TRANSIENT '${name}' returned null or undefined!`);
                 throw new Error(`Factory for TRANSIENT '${name}' returned null or undefined`);
             }
            return instance;
        } catch (error) {
             this.logger.error(`[DIContainer] Error creating TRANSIENT instance for '${name}'`, { error: error.message, stack: error.stack });
             throw error; // Re-throw
        }
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
export { container };
export { DIContainer };
export default {
    container,
    DIContainer
};
