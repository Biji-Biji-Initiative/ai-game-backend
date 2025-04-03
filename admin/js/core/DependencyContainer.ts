/**
 * Dependency Container
 * 
 * Implements a dependency injection system for the application
 */

import { logger } from '../utils/logger';

/**
 * Factory function type
 */
export type Factory<T> = () => T;

/**
 * Registration options
 */
export interface RegistrationOptions {
  /**
   * Whether to register as a singleton
   */
  singleton?: boolean;
  
  /**
   * Use existing instance
   */
  instance?: unknown;
}

/**
 * Dependency Container for dependency injection
 */
export class DependencyContainer {
  private static instance: DependencyContainer;
  private registrations: Map<string, { factory: Factory<unknown>; options: RegistrationOptions }>;
  private singletons: Map<string, unknown>;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.registrations = new Map();
    this.singletons = new Map();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    
    return DependencyContainer.instance;
  }
  
  /**
   * Register a dependency
   * @param name Dependency name
   * @param factory Factory function to create the dependency
   * @param options Registration options
   */
  public register<T>(name: string, factory: Factory<T>, options: RegistrationOptions = {}): void {
    // Ensure we don't override existing registrations
    if (this.registrations.has(name)) {
      logger.warn(`Dependency '${name}' is already registered. Overriding previous registration.`);
    }
    
    // Store the registration
    this.registrations.set(name, { factory, options });
    
    // If an instance is provided, store it as singleton
    if (options.instance) {
      this.singletons.set(name, options.instance);
    }
    
    logger.debug(`Registered dependency: ${name}`);
  }
  
  /**
   * Get a dependency
   * @param name Dependency name
   * @returns Resolved dependency
   */
  public get<T>(name: string): T {
    // Check if the dependency is registered
    const registration = this.registrations.get(name);
    
    if (!registration) {
      throw new Error(`Dependency '${name}' is not registered.`);
    }
    
    // Handle singleton
    if (registration.options.singleton) {
      // Check if we already have an instance
      if (this.singletons.has(name)) {
        return this.singletons.get(name) as T;
      }
      
      // Create and store instance
      const instance = registration.factory() as T;
      this.singletons.set(name, instance);
      
      return instance;
    }
    
    // Create new instance
    return registration.factory() as T;
  }
  
  /**
   * Check if a dependency is registered
   * @param name Dependency name
   * @returns Whether the dependency is registered
   */
  public has(name: string): boolean {
    return this.registrations.has(name);
  }
  
  /**
   * Remove a dependency registration
   * @param name Dependency name
   */
  public remove(name: string): void {
    this.registrations.delete(name);
    this.singletons.delete(name);
    
    logger.debug(`Removed dependency: ${name}`);
  }
  
  /**
   * Get all registered dependency names
   * @returns Array of dependency names
   */
  public getRegisteredNames(): string[] {
    return Array.from(this.registrations.keys());
  }
  
  /**
   * Clear all registrations
   */
  public clear(): void {
    this.registrations.clear();
    this.singletons.clear();
    
    logger.debug('Cleared all dependency registrations');
  }
  
  /**
   * Get a singleton instance (same as get for singletons)
   * @param name Dependency name
   * @returns Singleton instance
   */
  public getSingleton<T>(name: string): T {
    const registration = this.registrations.get(name);
    
    if (!registration) {
      throw new Error(`Dependency '${name}' is not registered.`);
    }
    
    if (!registration.options.singleton) {
      throw new Error(`Dependency '${name}' is not registered as a singleton.`);
    }
    
    // Get or create singleton instance
    if (!this.singletons.has(name)) {
      this.singletons.set(name, registration.factory());
    }
    
    return this.singletons.get(name) as T;
  }
}
