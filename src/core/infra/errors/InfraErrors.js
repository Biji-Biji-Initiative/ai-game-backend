import AppError from "@/core/infra/errors/AppError.js";
import { StandardErrorCodes } from "@/core/infra/errors/ErrorHandler.js";
'use strict';
/**
 * Base class for all infrastructure errors
 * @extends AppError
 */
class InfraError extends AppError {
    /**
     * Create a new infrastructure error
     * @param {string} message - Error message
     * @param {Object} options - Error options
     * @param {Error} options.cause - Original error that caused this error
     * @param {string} options.component - Infrastructure component name (e.g., 'database', 'cache')
     * @param {string} options.operation - Operation being performed (e.g., 'connect', 'query')
     * @param {Object} options.resource - Resource details (e.g., {type: 'table', name: 'users'})
     * @param {Object} options.metadata - Additional contextual data
     */
    constructor(message, options = {}) {
        super(message, options.statusCode || 500, {
            ...options,
            errorCode: options.errorCode || StandardErrorCodes.INFRASTRUCTURE_ERROR,
        });
        
        this.name = this.constructor.name;
        
        // Standard context fields
        this.component = options.component || 'infrastructure';
        this.operation = options.operation;
        this.resource = options.resource;
        
        // Store original error information if provided
        if (options.cause) {
            this.cause = options.cause;
            this.originalErrorName = options.cause.name;
            this.originalErrorMessage = options.cause.message;
            this.originalErrorStack = options.cause.stack;
        }
        
        // Store additional metadata for debugging
        this.metadata = options.metadata || {};
    }
    
    /**
     * Get a JSON representation of the error for logging
     * @returns {Object} JSON representation of the error
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            component: this.component,
            operation: this.operation,
            resource: this.resource,
            originalError: this.cause ? {
                name: this.originalErrorName,
                message: this.originalErrorMessage
            } : undefined,
            metadata: this.metadata
        };
    }
}
/**
 * Database infrastructure error
 * @extends InfraError
 */
class DatabaseError extends InfraError {
    /**
     * Create a new database error
     * @param {string} message - Error message
     * @param {Object} options - Error options
     * @param {Error} options.cause - Original database error
     * @param {string} options.operation - Database operation (e.g., 'query', 'insert')
     * @param {Object} options.resource - Resource details (e.g., {table: 'users'})
     * @param {string} options.entityType - Entity type being operated on
     * @param {string} options.queryType - Type of query being executed
     * @param {Object} options.metadata - Additional metadata
     */
    constructor(message, options = {}) {
        super(message, {
            ...options,
            component: 'database',
            statusCode: options.statusCode || 500
        });
        
        // Database-specific context
        this.entityType = options.entityType;
        this.queryType = options.queryType;
        
        // Add to metadata for serialization
        this.metadata = {
            ...this.metadata,
            entityType: this.entityType,
            queryType: this.queryType
        };
    }
}
/**
 * Cache infrastructure error
 * @extends InfraError
 */
class CacheError extends InfraError {
    /**
     * Create a new cache error
     * @param {string} message - Error message
     * @param {Object} options - Error options
     * @param {Error} options.cause - Original cache error
     * @param {string} options.operation - Cache operation (e.g., 'get', 'set')
     * @param {string} options.cacheKey - Key being accessed
     * @param {string} options.cacheProvider - Cache provider name
     * @param {Object} options.metadata - Additional metadata
     */
    constructor(message, options = {}) {
        super(message, {
            ...options,
            component: 'cache',
            errorCode: options.errorCode || 'CACHE_ERROR',
            statusCode: options.statusCode || 500
        });
        
        // Cache-specific context
        this.cacheKey = options.cacheKey;
        this.cacheProvider = options.cacheProvider;
        
        // Add to metadata for serialization
        this.metadata = {
            ...this.metadata,
            cacheKey: this.cacheKey,
            cacheProvider: this.cacheProvider
        };
    }
}
/**
 * Cache Key Not Found Error
 * Thrown when attempting to access a cache key that doesn't exist
 * @extends CacheError
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
            operation: options.operation || 'get',
            cacheKey: key,
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
 * @extends CacheError
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
            errorCode: 'CACHE_INITIALIZATION_ERROR',
            operation: options.operation || 'initialize'
        });
        this.name = 'CacheInitializationError';
    }
}
/**
 * Cache Operation Error
 * Thrown when there's an issue with a cache operation
 * @extends CacheError
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
            operation: operation,
            cacheKey: key,
            metadata: {
                ...options.metadata,
                operation,
                key
            },
        });
        this.name = 'CacheOperationError';
    }
}
// Export all error classes
export { 
    InfraError,
    DatabaseError,
    CacheError,
    CacheKeyNotFoundError, 
    CacheInitializationError, 
    CacheOperationError 
};
export default {
    InfraError,
    DatabaseError,
    CacheError,
    CacheKeyNotFoundError,
    CacheInitializationError,
    CacheOperationError
};
