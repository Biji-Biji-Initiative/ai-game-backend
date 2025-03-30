import { logger as defaultLogger } from "../infra/logging/logger.js";
import MissingParameterError from '../infra/errors/MissingParameterError.js';

/**
 * Base Service Class
 * 
 * Provides foundational functionality for all domain services
 * to promote Single Responsibility Principle and consistent patterns.
 * All domain services should extend this base class to ensure
 * consistent error handling, logging, and parameter validation.
 * 
 * @module BaseService
 */
class BaseService {
  /**
   * Create a new BaseService
   * @param {Object} options - Service options
   * @param {string} options.name - Service name for logging
   * @param {Object} options.logger - Custom logger instance
   */
  constructor(options = {}) {
    const {
      name = 'BaseService',
      logger: customLogger
    } = options;
    this.serviceName = name;
    this.logger = customLogger || defaultLogger.child({
      service: name
    });
  }

  /**
   * Initialize the service - can be overridden by subclasses
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.debug(`Initializing ${this.serviceName}`);
    return Promise.resolve();
  }

  /**
   * Validates a required parameter and throws if missing
   * @param {*} value - Parameter value to check
   * @param {string} paramName - Name of the parameter
   * @param {string} methodName - Name of the method requiring the parameter
   * @throws {MissingParameterError} If parameter is missing
   */
  validateRequiredParam(value, paramName, methodName) {
    if (value === undefined || value === null) {
      throw new MissingParameterError(paramName, `${this.serviceName}.${methodName}`);
    }
  }

  /**
   * Validates multiple required parameters
   * @param {Object} params - Parameters to validate
   * @param {Array<string>} requiredParams - List of required parameter names
   * @param {string} methodName - Method name for error context
   * @throws {MissingParameterError} If any required parameter is missing
   */
  validateRequiredParams(params, requiredParams, methodName) {
    if (!params) {
      throw new MissingParameterError('params', `${this.serviceName}.${methodName}`);
    }
    for (const param of requiredParams) {
      this.validateRequiredParam(params[param], param, methodName);
    }
  }

  /**
   * Safely execute an operation with standardized logging and error handling
   * @param {Function} fn - Async function to execute
   * @param {Object} options - Operation options
   * @param {string} options.operation - Name of operation for logging
   * @param {Object} options.context - Additional context for logging
   * @param {Function} options.ErrorClass - Error class to wrap errors with
   * @returns {Promise<*>} Result of the function
   * @throws {Error} Wrapped error if function fails
   */
  async executeOperation(fn, options = {}) {
    const {
      operation = 'operation',
      context = {},
      ErrorClass = Error
    } = options;
    try {
      this.logger.debug(`Starting ${operation}`, context);
      const result = await fn();
      this.logger.debug(`Completed ${operation}`, context);
      return result;
    } catch (error) {
      this.logger.error(`Error in ${operation}`, {
        ...context,
        error: error.message,
        stack: error.stack
      });

      // Avoid nested wrapping of errors if already of desired type
      if (error instanceof ErrorClass) {
        throw error;
      }
      throw new ErrorClass(`Failed in ${operation}: ${error.message}`, {
        cause: error,
        metadata: context
      });
    }
  }

  /**
   * Validate input against a schema
   * @param {Object} input - Input to validate
   * @param {Object} schema - Validation schema
   * @param {string} methodName - Method name for context
   * @returns {boolean} - Validation result
   */
  validate(input, schema, methodName) {
    this.logger.debug(`Validating input for ${methodName || 'unknown method'}`, {
      schema: Object.keys(schema || {})
    });

    // This is a placeholder that should be enhanced with actual validation logic
    // Implementations should consider using a validation library like Joi, Yup, etc.
    return true;
  }

  /**
   * Log information
   * @param {string} message - Message to log
   * @param {Object} data - Optional data to log
   */
  logInfo(message, data) {
    this.logger.info(message, data);
  }

  /**
   * Log error
   * @param {string} message - Error message
   * @param {Error|Object} error - Error object or context
   */
  logError(message, error) {
    this.logger.error(message, error instanceof Error ? {
      error: error.message,
      stack: error.stack
    } : error);
  }

  /**
   * Log debug information
   * @param {string} message - Message to log
   * @param {Object} data - Optional data to log
   */
  logDebug(message, data) {
    this.logger.debug(message, data);
  }

  /**
   * Log warning
   * @param {string} message - Warning message
   * @param {Object} data - Optional data to log
   */
  logWarn(message, data) {
    this.logger.warn(message, data);
  }
}
export default BaseService;