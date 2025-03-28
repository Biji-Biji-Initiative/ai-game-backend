/**
 * Base Service Class
 * 
 * Provides foundational functionality for all domain services
 * to promote Single Responsibility Principle and consistent patterns
 * 
 * @module BaseService
 * @requires logger
 */

const { logger } = require('../infra/logging/logger');
const MissingParameterError = require('../infra/errors/MissingParameterError');

/**
 * Base service that all domain services can extend
 */
class BaseService {
  /**
   * Create a new BaseService
   * @param {Object} options - Service options
   * @param {string} options.name - Service name for logging
   * @param {Object} options.logger - Custom logger instance
   */
  constructor(options = {}) {
    const { name = 'BaseService', logger: customLogger } = options;
    
    this.serviceName = name;
    this.logger = customLogger || logger.child({ service: name });
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
   * Safely execute a function with logging and error handling
   * @param {Function} fn - Function to execute
   * @param {string} operationName - Name of operation for logging
   * @param {Object} context - Additional context for logging
   * @param {Error} ErrorClass - Error class to wrap errors with
   * @returns {Promise<*>} Result of the function
   * @throws {Error} Wrapped error if function fails
   */
  async executeWithLogging(fn, operationName, context = {}, ErrorClass = Error) {
    try {
      this.logger.debug(`Starting ${operationName}`, context);
      const result = await fn();
      this.logger.debug(`Completed ${operationName}`, context);
      return result;
    } catch (error) {
      this.logger.error(`Error in ${operationName}`, {
        ...context,
        error: error.message,
        stack: error.stack
      });
      
      // Avoid nested wrapping of errors if already of desired type
      if (error instanceof ErrorClass) {
        throw error;
      }
      
      throw new ErrorClass(`Failed in ${operationName}: ${error.message}`, {
        cause: error,
        metadata: context
      });
    }
  }
}

module.exports = BaseService; 