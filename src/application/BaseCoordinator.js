'use strict';

/**
 * Base Coordinator Class
 * 
 * This abstract base class provides foundational functionality for all application-layer
 * coordinators in the system. It enforces consistency in dependency validation, operation
 * execution patterns, error handling, and logging across all coordinators.
 * 
 * Following the Single Responsibility Principle, coordinators act as thin orchestration
 * layers that delegate business logic to domain services. The base coordinator
 * ensures this separation of concerns by providing utilities that standardize
 * how coordinators interact with domain services and handle errors.
 * 
 * @module BaseCoordinator
 * @requires logger
 */

const { logger } = require('../core/infra/logging/logger');

/**
 * BaseCoordinator class
 * 
 * Abstract base class that all application coordinators should extend. Provides
 * standardized methods for dependency validation, operation execution, error handling,
 * and secondary operations management.
 */
class BaseCoordinator {
  /**
   * Create a new BaseCoordinator instance
   * 
   * @param {Object} options - Configuration options for the coordinator.
   * @param {string} [options.name='BaseCoordinator'] - Coordinator name used for logging and error reporting.
   * @param {Object} [options.logger] - Custom logger instance. If not provided, creates a child logger from the system logger.
   */
  constructor(options = {}) {
    const { name = 'BaseCoordinator', logger: customLogger } = options;
    
    this.coordinatorName = name;
    this.logger = customLogger || logger.child({ coordinator: name });
  }
  
  /**
   * Validates required dependencies for the coordinator
   * 
   * Ensures that all required dependencies are provided to the coordinator.
   * This method should be called in the constructor of all derived coordinators
   * to fail fast if any required dependencies are missing.
   * 
   * @param {Object} dependencies - Dependencies object containing services, repositories, and other required components.
   * @param {Array<string>} requiredDependencies - List of dependency keys that must be present.
   * @throws {Error} If dependencies object is null/undefined or if any required dependency is missing.
   */
  validateDependencies(dependencies = {}, requiredDependencies = []) {
    if (!dependencies) {
      throw new Error(`Dependencies are required for ${this.coordinatorName}`);
    }
    
    for (const dependency of requiredDependencies) {
      if (!dependencies[dependency]) {
        throw new Error(`${dependency} is required for ${this.coordinatorName}`);
      }
    }
  }
  
  /**
   * Safely execute a domain operation with proper logging and error handling
   * 
   * This method provides a standardized pattern for executing operations that involve
   * domain services. It handles proper logging before and after the operation,
   * consistent error handling and wrapping, and context propagation.
   *
   * The operation parameter should contain the actual business logic, typically
   * involving calls to one or more domain services. This pattern enforces
   * separation of concerns by clearly delegating business logic to domain services.
   *
   * @param {Function} operation - Async function to execute containing domain service calls.
   * @param {string} operationName - Name of the operation for logging and error reporting.
   * @param {Object} [context={}] - Additional contextual data for logging and error reporting.
   * @param {ErrorConstructor} [ErrorClass=Error] - Custom error class to wrap thrown errors with.
   * @returns {Promise<*>} The result of the operation if successful.
   * @throws {Error|ErrorClass} The original error if it's already of the specified ErrorClass type,
   *                           or a new error of ErrorClass type wrapping the original error.
   */
  async executeOperation(operation, operationName, context = {}, ErrorClass = Error) {
    try {
      this.logger.debug(`Starting operation: ${operationName}`, context);
      const result = await operation();
      this.logger.debug(`Completed operation: ${operationName}`, context);
      return result;
    } catch (error) {
      this.logger.error(`Error in operation: ${operationName}`, {
        ...context,
        error: error.message,
        errorName: error.name,
        stack: error.stack,
        statusCode: error.statusCode || 500
      });
      
      // Avoid nested wrapping of errors if already of desired type
      if (error instanceof ErrorClass) {
        throw error;
      }
      
      // Create a new error of the specified type, preserving original error as cause
      throw new ErrorClass(
        `Failed in ${operationName}: ${error.message}`,
        error.statusCode || 500,
        {
          cause: error,
          coordinator: this.coordinatorName,
          operation: operationName,
          ...context
        }
      );
    }
  }
  
  /**
   * Execute secondary operations in parallel without blocking the main flow
   * 
   * Used for non-critical side effects that should not block the primary operation
   * or response time. Common uses include event publishing, analytics tracking,
   * and certain types of cache invalidation.
   * 
   * If any secondary operation fails, the error is logged but not propagated,
   * ensuring that these operations are truly non-blocking.
   *
   * @param {Array<Function>} operations - Array of async functions to execute in parallel.
   * @param {string} operationName - Name of the secondary operations for logging.
   * @param {Object} [context={}] - Additional contextual data for logging.
   * @returns {Promise<void>} Resolves when all operations attempt completion (successful or not).
   */
  async executeSecondaryOperations(operations, operationName, context = {}) {
    if (!Array.isArray(operations) || operations.length === 0) {
      this.logger.debug(`No secondary operations to execute for: ${operationName}`, context);
      return;
    }
    
    try {
      await Promise.all(operations.map(fn => fn().catch(err => {
        // Catch errors individually to prevent one failure from affecting others
        this.logger.warn(`Error in individual secondary operation for: ${operationName}`, {
          ...context,
          error: err.message,
          stack: err.stack
        });
        // Return undefined to ensure Promise.all continues
        return undefined;
      })));
      
      this.logger.debug(`All secondary operations completed for: ${operationName}`, context);
    } catch (error) {
      // This should rarely happen since we catch individual errors above
      this.logger.warn(`Unexpected error in secondary operations for: ${operationName}`, {
        ...context,
        error: error.message,
        stack: error.stack
      });
    }
  }
}

module.exports = BaseCoordinator; 