'use strict';
/**
 * Error Standardization Utilities
 *
 * Provides standardized patterns for error handling across all domains
 * following Domain-Driven Design principles.
 */
import { logger } from "#app/core/infra/logging/logger.js";
import AppError from "#app/core/infra/errors/AppError.js";
import { StandardErrorCodes } from "#app/core/infra/errors/errorHandler.js";

/**
 * Sends a standardized validation error response
 * @param {Array} errors - Array of error objects with field and message properties
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export function sendValidationErrorResponse(errors, req, res) {
  logger.debug('Validation failed', { 
    path: req.path, 
    method: req.method,
    errors
  });
  
  return res.status(400).json({
    status: 'error',
    message: 'Validation failed',
    errors: errors
  });
}

/**
 * Creates an error mapper function that maps generic errors to domain-specific ones
 * @param {Object} errorMappings - Mapping from base error types to domain error types
 * @param {Function} defaultErrorClass - Default domain error class if no mapping is found
 * @returns {Function} Error mapper function
 */
function createErrorMapper(errorMappings, defaultErrorClass) {
  return (error, context = {}) => {
    // If error is already a domain-specific error, return it
    if (error instanceof defaultErrorClass) {
      return error;
    }
    // Map error to domain-specific type based on error class
    for (const [baseErrorType, DomainErrorClass] of Object.entries(errorMappings)) {
      if (error.name === baseErrorType || error instanceof Error && error.constructor.name === baseErrorType) {
        return new DomainErrorClass(error.message, {
          cause: error,
          ...context
        });
      }
    }
    // Default to generic domain error
    return new defaultErrorClass(error.message || 'An error occurred', {
      cause: error,
      ...context
    });
  };
}
/**
 * Create an error collector for non-critical errors that shouldn't halt execution
 * @returns {Object} Error collector utility
 */
function createErrorCollector() {
  const errors = [];
  return {
    /**
     * Collect an error for later processing
     * @param {Error} error - Error to collect
     * @param {string} context - Context in which the error occurred
     */
    collect: (error, context = 'unknown operation') => {
      errors.push({
        error,
        context
      });
    },
    /**
     * Check if any errors have been collected
     * @returns {boolean} True if errors have been collected
     */
    hasErrors: () => errors.length > 0,
    /**
     * Get all collected errors
     * @returns {Array} Array of collected errors
     */
    getErrors: () => errors,
    /**
     * Process collected errors with a handler function
     * @param {Function} handler - Function to handle each error
     */
    processErrors: handler => {
      errors.forEach(({
        error,
        context
      }) => {
        handler(error, context);
      });
    }
  };
}
/**
 * Wrap a repository method with standardized error handling
 * @param {Function} method - Repository method to wrap
 * @param {Object} options - Options for error handling
 * @param {string} options.methodName - Name of the method being wrapped
 * @param {string} options.domainName - Domain name for error context
 * @param {Object} options.logger - Logger instance
 * @param {Function} options.errorMapper - Error mapper function
 * @returns {Function} Wrapped method
 */
function withRepositoryErrorHandling(method, options) {
  const {
    methodName,
    domainName,
    logger: loggerInstance,
    errorMapper
  } = options;
  const log = loggerInstance || logger.child({
    domain: domainName
  });
  return async (...args) => {
    try {
      return await method(...args);
    } catch (error) {
      log.error(`Error in ${domainName} repository ${methodName}`, {
        error: error.message,
        stack: error.stack,
        methodName,
        args: JSON.stringify(args.map(arg => {
          // Don't log potentially large objects/arrays in full
          if (typeof arg === 'object' && arg !== null) {
            return Object.keys(arg);
          }
          return arg;
        }))
      });
      // Map error to domain-specific error
      if (errorMapper) {
        const mappedError = errorMapper(error, {
          methodName,
          domainName,
          args
        });
        throw mappedError;
      }
      throw error;
    }
  };
}
/**
 * Wrap a service method with standardized error handling
 * @param {Function} method - Service method to wrap
 * @param {Object} options - Options for error handling
 * @param {string} options.methodName - Name of the method being wrapped
 * @param {string} options.domainName - Domain name for error context
 * @param {Object} options.logger - Logger instance
 * @param {Function} options.errorMapper - Error mapper function
 * @returns {Function} Wrapped method
 */
function withServiceErrorHandling(method, options) {
  const {
    methodName,
    domainName,
    logger: loggerInstance,
    errorMapper
  } = options;
  const log = loggerInstance || logger.child({
    domain: domainName
  });
  return async (...args) => {
    try {
      return await method(...args);
    } catch (error) {
      log.error(`Error in ${domainName} service ${methodName}`, {
        error: error.message,
        stack: error.stack,
        methodName
      });
      // Map error to domain-specific error
      if (errorMapper) {
        const mappedError = errorMapper(error, {
          methodName,
          domainName,
          args
        });
        throw mappedError;
      }
      // If error is not yet an AppError, wrap it
      if (!(error instanceof AppError)) {
        throw new AppError(error.message || `Error in ${domainName} service`, 500, {
          cause: error,
          errorCode: `${domainName.toUpperCase()}_SERVICE_ERROR`,
          metadata: {
            methodName,
            domainName
          }
        });
      }
      throw error;
    }
  };
}
/**
 * Wrap a controller method with standardized error handling
 * @param {Function} method - Controller method to wrap
 * @param {Object} options - Options for error handling
 * @param {string} options.methodName - Name of the method being wrapped
 * @param {string} options.domainName - Domain name for error context
 * @param {Object} options.logger - Logger instance
 * @param {Array} options.errorMappings - Array of error mappings to HTTP status codes
 * @returns {Function} Wrapped method
 */
function withControllerErrorHandling(method, options) {
  const {
    methodName,
    domainName,
    logger: loggerInstance,
    errorMappings: _errorMappings
  } = options;
  const log = loggerInstance || logger.child({
    domain: domainName,
    controller: true
  });
  return async (req, res, next) => {
    try {
      return await method(req, res, next);
    } catch (error) {
      log.error(`Error in ${domainName} controller ${methodName}`, {
        error: error.message,
        stack: error.stack,
        methodName,
        path: req.path,
        method: req.method,
        requestId: req.id
      });
      // Pass to Express error handler
      next(error);
    }
  };
}
/**
 * Handle service errors with domain-specific mapping
 * @param {Error} error - Original error
 * @param {Object} options - Error handling options
 * @param {string} options.domainName - Domain name
 * @param {string} options.operation - Operation name
 * @param {Object} options.logger - Logger instance
 * @param {Function} options.errorMapper - Error mapper function
 * @throws {AppError} Domain-specific error
 */
function handleServiceError(error, options) {
  const {
    domainName,
    operation,
    logger: loggerInstance,
    errorMapper
  } = options;
  const log = loggerInstance || logger.child({
    domain: domainName
  });
  log.error(`Error in ${domainName} ${operation}`, {
    error: error.message,
    stack: error.stack,
    operation
  });
  // Map error to domain-specific error
  if (errorMapper) {
    const mappedError = errorMapper(error, {
      operation,
      domainName
    });
    throw mappedError;
  }
  // If error is not yet an AppError, wrap it
  if (!(error instanceof AppError)) {
    throw new AppError(error.message || `Error in ${domainName}`, 500, {
      cause: error,
      errorCode: `${domainName.toUpperCase()}_ERROR`,
      metadata: {
        operation,
        domainName
      }
    });
  }
  throw error;
}
/**
 * Apply repository error handling to a method
 * @param {Object} instance - Repository instance
 * @param {string} methodName - Method name
 * @param {string|Object} domainNameOrOptions - Domain name for error context or options object
 * @param {Function} [errorMapper] - Error mapper function (legacy parameter)
 * @returns {Function} Method with error handling applied
 */
function applyRepositoryErrorHandling(instance, methodName, domainNameOrOptions, errorMapper) {
  // Support both legacy and new parameter styles for backward compatibility
  if (typeof domainNameOrOptions === 'string') {
    // Legacy signature: (instance, methodName, domainName, errorMapper)
    return withRepositoryErrorHandling(instance[methodName].bind(instance), {
      methodName,
      domainName: domainNameOrOptions,
      logger: instance.logger,
      errorMapper
    });
  } else {
    // New signature: (instance, methodName, options)
    const options = domainNameOrOptions || {};
    return withRepositoryErrorHandling(instance[methodName].bind(instance), {
      methodName,
      domainName: options.domainName,
      logger: options.logger || instance.logger,
      errorMapper: options.errorMapper
    });
  }
}
/**
 * Apply service error handling to a method
 * @param {Object} instance - Service instance
 * @param {string} methodName - Method name
 * @param {string|Object} domainNameOrOptions - Domain name for error context or options object
 * @param {Function} [errorMapper] - Error mapper function (legacy parameter)
 * @returns {Function} Method with error handling applied
 */
function applyServiceErrorHandling(instance, methodName, domainNameOrOptions, errorMapper) {
  // Support both legacy and new parameter styles for backward compatibility
  if (typeof domainNameOrOptions === 'string') {
    // Legacy signature: (instance, methodName, domainName, errorMapper)
    return withServiceErrorHandling(instance[methodName].bind(instance), {
      methodName,
      domainName: domainNameOrOptions,
      logger: instance.logger,
      errorMapper
    });
  } else {
    // New signature: (instance, methodName, options)
    const options = domainNameOrOptions || {};
    return withServiceErrorHandling(instance[methodName].bind(instance), {
      methodName,
      domainName: options.domainName,
      logger: options.logger || instance.logger,
      errorMapper: options.errorMapper
    });
  }
}
/**
 * Apply controller error handling to a method
 * @param {Object} instance - Controller instance
 * @param {string} methodName - Method name
 * @param {string|Object} domainNameOrOptions - Domain name for error context or options object
 * @param {Array} [errorMappings] - Error mappings to HTTP status codes (legacy parameter)
 * @returns {Function} Method with error handling applied
 */
function applyControllerErrorHandling(instance, methodName, domainNameOrOptions, errorMappings) {
  // Support both legacy and new parameter styles for backward compatibility
  if (typeof domainNameOrOptions === 'string') {
    // Legacy signature: (instance, methodName, domainName, errorMappings)
    return withControllerErrorHandling(instance[methodName].bind(instance), {
      methodName,
      domainName: domainNameOrOptions,
      logger: instance.logger,
      errorMappings
    });
  } else {
    // New signature: (instance, methodName, options)
    const options = domainNameOrOptions || {};
    return withControllerErrorHandling(instance[methodName].bind(instance), {
      methodName,
      domainName: options.domainName,
      logger: options.logger || instance.logger,
      errorMappings: options.errorMappings
    });
  }
}
export { createErrorMapper, createErrorCollector, withRepositoryErrorHandling, withServiceErrorHandling, withControllerErrorHandling, handleServiceError, StandardErrorCodes,
// Add new exports for the domain-specific helper functions
applyRepositoryErrorHandling, applyServiceErrorHandling, applyControllerErrorHandling };