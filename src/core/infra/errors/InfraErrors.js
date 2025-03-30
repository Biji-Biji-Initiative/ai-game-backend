import AppError from "../../infra/errors/AppError.js";
import { DomainErrorCodes } from "../../infra/errors/DomainErrorCodes.js";
const UserErrorCodes = DomainErrorCodes.User
'use strict';
/**
 * Base class for all infrastructure errors
 */
class InfrastructureError extends AppError {
    /**
     * Create a new InfrastructureError
     * @param {string} message - Error message
     * @param {Object} options - Additional options
     */
    constructor(message, options = {}) {
        super(message, 500, {
            ...options,
            errorCode: options.errorCode || DomainErrorCodes.INFRASTRUCTURE_ERROR,
        });
        this.name = 'InfrastructureError';
    }
}
/**
 * Base class for all cache errors
 */
class CacheError extends InfrastructureError {
    /**
     * Create a new CacheError
     * @param {string} message - Error message
     * @param {Object} options - Additional options
     */
    constructor(message, options = {}) {
        super(message, {
            ...options,
            errorCode: options.errorCode || 'CACHE_ERROR',
        });
        this.name = 'CacheError';
    }
}
/**
 * Cache Key Not Found Error
 * Thrown when attempting to access a cache key that doesn't exist
 */
class CacheKeyNotFoundError extends CacheError {
    /**
     * Create a new CacheKeyNotFoundError
     * @param {string} key - Cache key that wasn't found
     * @param {Object} options - Additional options
     */
    constructor(key, options = {}) {
        const message = `Cache key not found: ${key}`;
        super(message, {
            ...options,
            errorCode: 'CACHE_KEY_NOT_FOUND',
            metadata: { 
                ...options.metadata,
                key 
            },
        });
        this.name = 'CacheKeyNotFoundError';
    }
}
/**
 * Cache Initialization Error
 * Thrown when there's an issue initializing the cache
 */
class CacheInitializationError extends CacheError {
    /**
     * Create a new CacheInitializationError
     * @param {string} message - Error message
     * @param {Object} options - Additional options
     */
    constructor(message = 'Failed to initialize cache', options = {}) {
        super(message, {
            ...options,
            errorCode: 'CACHE_INITIALIZATION_ERROR'
        });
        this.name = 'CacheInitializationError';
    }
}
/**
 * Cache Operation Error
 * Thrown when there's an issue with a cache operation
 */
class CacheOperationError extends CacheError {
    /**
     * Create a new CacheOperationError
     * @param {string} operation - Cache operation that failed
     * @param {string} key - Cache key involved in the operation
     * @param {Object} options - Additional options
     */
    constructor(operation, key, options = {}) {
        const message = `Cache operation '${operation}' failed for key: ${key}`;
        super(message, {
            ...options,
            errorCode: 'CACHE_OPERATION_ERROR',
            metadata: {
                ...options.metadata,
                operation,
                key
            },
        });
        this.name = 'CacheOperationError';
    }
}
export { InfrastructureError };
export { CacheError };
export { CacheKeyNotFoundError };
export { CacheInitializationError };
export { CacheOperationError };
export default {
    InfrastructureError,
    CacheError,
    CacheKeyNotFoundError,
    CacheInitializationError,
    CacheOperationError
};
