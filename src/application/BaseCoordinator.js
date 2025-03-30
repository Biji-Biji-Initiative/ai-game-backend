import { logger } from "../core/infra/logging/logger.js";
import AppError from "../core/infra/errors/AppError.js";
'use strict';
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
     * Validate that required dependencies are injected
     *
     * @param {Array<string>} dependencies - Names of dependencies that should be present on this instance.
     * @throws {Error} When a required dependency is missing.
     */
    validateDependencies(dependencies) {
        for (const dependency of dependencies) {
            if (!this[dependency]) {
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
     * @param {ErrorConstructor} [ErrorClass=AppError] - Custom error class to wrap thrown errors with.
     * @returns {Promise<*>} The result of the operation if successful.
     * @throws {Error|ErrorClass} The original error if it's already of the specified ErrorClass type,
     *                           or a new error of ErrorClass type wrapping the original error.
     */
    async executeOperation(operation, operationName, context = {}, ErrorClass = AppError) {
        try {
            this.logger.debug(`Starting operation: ${operationName}`, context);
            const result = await operation();
            this.logger.debug(`Completed operation: ${operationName}`, context);
            return result;
        }
        catch (error) {
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
            
            // Preserve original error properties
            const statusCode = error.statusCode || 500;
            const errorCode = error.errorCode || `${this.coordinatorName.toUpperCase()}_${operationName.toUpperCase()}_ERROR`;
            
            // Create a new error of the specified type, preserving original error as cause
            // Using the expanded constructor that AppError supports
            throw new ErrorClass(
                `Failed in ${operationName}: ${error.message}`, 
                statusCode,
                {
                    cause: error,  // Explicitly set original error as cause
                    metadata: {
                        coordinator: this.coordinatorName,
                        operation: operationName,
                        originalError: {
                            name: error.name,
                            message: error.message,
                            stack: error.stack
                        },
                        ...context
                    },
                    errorCode: errorCode
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
        }
        catch (error) {
            // This should rarely happen since we catch individual errors above
            this.logger.warn(`Unexpected error in secondary operations for: ${operationName}`, {
                ...context,
                error: error.message,
                stack: error.stack
            });
        }
    }
}
export default BaseCoordinator;
