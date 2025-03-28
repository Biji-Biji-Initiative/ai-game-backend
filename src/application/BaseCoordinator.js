/**
 * Base Coordinator Class
 * 
 * Provides foundational functionality for all application coordinators
 * to promote Single Responsibility Principle and consistent patterns.
 * Coordinators should be thin orchestration layers that delegate business
 * logic to domain services.
 * 
 * @module BaseCoordinator
 * @requires logger
 */

const { logger } = require('../core/infra/logging/logger');

/**
 * Base coordinator that all application coordinators should extend
 */
class BaseCoordinator {
  /**
   * Create a new BaseCoordinator
   * @param {Object} options - Coordinator options
   * @param {string} options.name - Coordinator name for logging
   * @param {Object} options.logger - Custom logger instance
   */
  constructor(options = {}) {
    const { name = 'BaseCoordinator', logger: customLogger } = options;
    
    this.coordinatorName = name;
    this.logger = customLogger || logger.child({ coordinator: name });
  }
  
  /**
   * Validates required dependencies for the coordinator
   * @param {Object} dependencies - Dependencies to validate
   * @param {Array<string>} requiredDependencies - Names of required dependencies
   * @throws {Error} If any required dependency is missing
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
   * This enforces separation of concerns by delegating business logic to domain services
   * 
   * @param {Function} operation - Function to execute containing domain service calls
   * @param {string} operationName - Name of the operation for logging
   * @param {Object} context - Additional context for logging
   * @param {Error} ErrorClass - Error class to wrap errors with
   * @returns {Promise<*>} Result of the operation
   * @throws {Error} Wrapped error if operation fails
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
        stack: error.stack
      });
      
      // Avoid nested wrapping of errors if already of desired type
      if (error instanceof ErrorClass) {
        throw error;
      }
      
      throw new ErrorClass(`Failed in ${operationName}: ${error.message}`, {
        cause: error,
        metadata: {
          ...context,
          coordinator: this.coordinatorName
        }
      });
    }
  }
  
  /**
   * Execute secondary operations in parallel without blocking the main flow
   * Useful for non-critical operations that should not block the response
   * 
   * @param {Array<Function>} operations - Array of async functions to execute
   * @param {string} operationName - Name of the secondary operations for logging
   * @param {Object} context - Additional context for logging
   */
  executeSecondaryOperations(operations, operationName, context = {}) {
    Promise.all(operations.map(fn => fn()))
      .then(() => {
        this.logger.debug(`All secondary operations completed for: ${operationName}`, context);
      })
      .catch(error => {
        this.logger.warn(`Error in secondary operations for: ${operationName}`, {
          ...context,
          error: error.message
        });
      });
  }
}

module.exports = BaseCoordinator; 