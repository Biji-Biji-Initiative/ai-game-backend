// Types improved by ts-improve-types
/**
 * Simple Dependency Container
 * Provides basic dependency injection functionality
 */

import { logger } from './logger';

/**
 * Dependency Container class
 * Manages dependencies and their lifecycle
 */
export class DependencyContainer {
  private static instance: DependencyContainer;
  private dependencies: Map<string, any> = new Map();

  private constructor() {
    logger.debug('DependencyContainer initialized');
  }

  /**
   * Get singleton instance
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
   * @param dependency Dependency instance or factory
   */
  register(name: string, dependency: any): void {
    if (this.dependencies.has(name)) {
      logger.warn(`Dependency "${name}" already registered. Overwriting.`);
    }
    this.dependencies.set(name, dependency);
    logger.debug(`Registered dependency: ${name}`);
  }

  /**
   * Get a dependency
   * @param key Dependency key/name
   * @returns Dependency instance
   * @throws Error if dependency not found
   */
  get(key: string): any {
    if (!this.dependencies.has(key)) {
      throw new Error(`Dependency '${key}' not found`);
    }
    return this.dependencies.get(key);
  }

  /**
   * Check if a dependency exists
   * @param key The key to check
   * @returns True if the key is registered
   */
  has(key: string): boolean {
    return this.dependencies.has(key);
  }

  /**
   * Remove a dependency
   * @param key The key to remove
   * @returns True if the key was removed
   */
  remove(key: string): boolean {
    return this.dependencies.delete(key);
  }

  /**
   * Clear all dependencies
   */
  clear(): void {
    this.dependencies.clear();
    logger.debug('Cleared all dependencies');
  }

  /**
   * Resolves dependencies for a class constructor
   * @param target Class constructor
   * @returns Array of resolved dependencies
   */
  resolveDependencies(target: Function): any[] {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target);

    // Implementation of resolveDependencies method
    // This method should return an array of resolved dependencies
    // For now, we'll return an empty array
    return [];
  }

  /**
   * Requires reflect-metadata and decorators
   * @param dependencies Array of classes to register
   */
  autoRegister(dependencies: any[]): void {
    dependencies.forEach(dep => {
      // Use class name as the registration key
      // Implementation of autoRegister method
    });
  }

  /**
   * Decorator for injecting dependencies
   * @param key Dependency key
   */
  static Inject(key: string) {
    return function (target: any, propertyKey: string | symbol): void {
      const instance = DependencyContainer.getInstance();
      target[propertyKey] = instance.get(key);
    };
  }

  /**
   * Decorator for marking a class as injectable
   * @param key Optional registration key
   */
  static Injectable(key?: string) {
    return function (constructor: Function): void {
      const instance = DependencyContainer.getInstance();
      const registrationKey = key || constructor.name;
      instance.register(registrationKey, constructor);
    };
  }
}

// Export singleton instance
export const dependencyContainer = DependencyContainer.getInstance();
