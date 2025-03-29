'use strict';

/**
 * Infrastructure Error Classes
 * 
 * Domain-specific error types for the infrastructure layer.
 * These errors can be used for cache operations, API integrations,
 * database connections, and other infrastructure concerns.
 */

const AppError = require('./AppError');

/**
 * Base class for all infrastructure errors
 */
class InfrastructureError extends AppError {
  /**
   *
   */
  constructor(message, options = {}) {
    super(message, 500, {
      ...options,
      errorCode: options.errorCode || 'INFRASTRUCTURE_ERROR',
    });
  }
}

/**
 * Error thrown when cache operations fail
 */
class CacheError extends InfrastructureError {
  /**
   *
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      errorCode: options.errorCode || 'CACHE_ERROR',
    });
  }
}

/**
 * Error thrown when a cache key is not found
 */
class CacheKeyNotFoundError extends CacheError {
  /**
   *
   */
  constructor(key, options = {}) {
    super(`Cache key not found: ${key}`, {
      ...options,
      errorCode: 'CACHE_KEY_NOT_FOUND',
      metadata: {
        ...(options.metadata || {}),
        key,
      },
    });
  }
}

/**
 * Error thrown when cache initialization fails
 */
class CacheInitializationError extends CacheError {
  /**
   *
   */
  constructor(message, options = {}) {
    super(`Cache initialization failed: ${message}`, {
      ...options,
      errorCode: 'CACHE_INITIALIZATION_ERROR',
    });
  }
}

/**
 * Error thrown when a cache operation fails
 */
class CacheOperationError extends CacheError {
  /**
   *
   */
  constructor(operation, message, options = {}) {
    super(`Cache operation '${operation}' failed: ${message}`, {
      ...options,
      errorCode: 'CACHE_OPERATION_ERROR',
      metadata: {
        ...(options.metadata || {}),
        operation,
      },
    });
  }
}

module.exports = {
  InfrastructureError,
  CacheError,
  CacheKeyNotFoundError,
  CacheInitializationError,
  CacheOperationError,
}; 