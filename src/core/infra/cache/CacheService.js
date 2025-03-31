import { logger } from "@/core/infra/logging/logger.js";
import AppError from "@/core/infra/errors/AppError.js";
import { withServiceErrorHandling, createErrorMapper } from "@/core/infra/errors/errorStandardization.js";
'use strict';

/**
 * Cache-specific error classes
 */
export class CacheError extends AppError {
  constructor(message = 'Cache operation failed', options = {}) {
    super(message, 500, {
      errorCode: 'CACHE_ERROR',
      ...options
    });
    this.name = 'CacheError';
  }
}

export class CacheConnectionError extends CacheError {
  constructor(message = 'Failed to connect to cache', options = {}) {
    super(message, {
      errorCode: 'CACHE_CONNECTION_ERROR',
      ...options
    });
    this.name = 'CacheConnectionError';
  }
}

export class CacheOperationError extends CacheError {
  constructor(message = 'Cache operation failed', options = {}) {
    super(message, {
      errorCode: 'CACHE_OPERATION_ERROR',
      ...options
    });
    this.name = 'CacheOperationError';
  }
}

// Create an error mapper for cache errors
const cacheErrorMapper = createErrorMapper({
  Error: CacheError,
  TypeError: CacheError,
  ReferenceError: CacheError
}, CacheError);

/**
 * Cache Service
 *
 * Provides a standardized interface for caching data in the application.
 * This service is provider-agnostic and works with any cache implementation
 * that follows the defined provider interface.
 *
 * @module CacheService
 */
// Default TTL values by domain and operation type (in seconds)
const DEFAULT_TTL = {
  // Short-lived caches
  SHORT: 60,
  // 1 minute
  // Medium-lived caches
  MEDIUM: 300,
  // 5 minutes
  // Long-lived caches
  LONG: 1800,
  // 30 minutes
  // Domain and operation specific TTLs
  USER: {
    BY_ID: 600,
    // 10 minutes
    BY_EMAIL: 600,
    // 10 minutes
    LIST: 120,
    // 2 minutes
    SEARCH: 60,
    // 1 minute
    PROFILE: 600 // 10 minutes
  },
  CHALLENGE: {
    BY_ID: 600,
    // 10 minutes
    BY_USER: 300,
    // 5 minutes
    LIST: 120,
    // 2 minutes
    SEARCH: 60,
    // 1 minute
    CONFIG: 1800 // 30 minutes
  },
  FOCUS_AREA: {
    BY_ID: 600,
    // 10 minutes
    BY_USER: 300,
    // 5 minutes
    LIST: 120 // 2 minutes
  },
  EVALUATION: {
    BY_ID: 600,
    // 10 minutes
    BY_USER: 300,
    // 5 minutes
    BY_CHALLENGE: 300,
    // 5 minutes
    LIST: 120 // 2 minutes
  },
  PERSONALITY: {
    BY_ID: 900,
    // 15 minutes
    BY_USER: 900,
    // 15 minutes
    TRAITS: 1800 // 30 minutes
  },
  RECOMMENDATION: {
    BY_ID: 300,
    // 5 minutes
    BY_USER: 300,
    // 5 minutes
    LIST: 120 // 2 minutes
  }
};

/**
 * Cache Service Class - Implements the caching functionality
 */
class CacheService {
  /**
   * Create a new cache service
   * @param {Object} cacheProvider - The underlying cache provider (Redis, Memory, etc.)
   * @param {Object} options - Cache service options
   * @param {number} options.defaultTTL - Default TTL in seconds
   * @param {boolean} options.logHits - Whether to log cache hits
   * @param {boolean} options.logMisses - Whether to log cache misses
   * @param {boolean} options.enabled - Whether the cache is enabled
   */
  constructor(cacheProvider, options = {}) {
    if (!cacheProvider) {
      throw new CacheConnectionError('Cache provider is required');
    }
    
    this.provider = cacheProvider;
    this.logger = options.logger || logger.child({
      component: 'cache-service'
    });
    this.defaultTTL = options.defaultTTL || DEFAULT_TTL.MEDIUM;
    this.logHits = options.logHits !== undefined ? options.logHits : true;
    this.logMisses = options.logMisses !== undefined ? options.logMisses : true;
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // Define all methods first before applying error handling
    
    // Apply standardized error handling to methods
    this.get = withServiceErrorHandling(this.get.bind(this), {
      methodName: 'get',
      domainName: 'cache',
      logger: this.logger,
      errorMapper: cacheErrorMapper
    });
    
    this.set = withServiceErrorHandling(this.set.bind(this), {
      methodName: 'set',
      domainName: 'cache',
      logger: this.logger,
      errorMapper: cacheErrorMapper
    });
    
    this.getOrSet = withServiceErrorHandling(this.getOrSet.bind(this), {
      methodName: 'getOrSet',
      domainName: 'cache',
      logger: this.logger,
      errorMapper: cacheErrorMapper
    });
    
    this.flush = withServiceErrorHandling(this.flush.bind(this), {
      methodName: 'flush',
      domainName: 'cache',
      logger: this.logger,
      errorMapper: cacheErrorMapper
    });
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<*>} Cached value or null if not found
   */
  async get(key) {
    if (!this.enabled) {
      return null;
    }
    
    if (!key) {
      throw new CacheOperationError('Cache key is required');
    }
    
    const value = await this.provider.get(key);
    if (value !== null && value !== undefined) {
      this.metrics.hits++;
      if (this.logHits) {
        this.logger.debug(`Cache hit: ${key}`);
      }
      // Parse JSON if the value is a string and looks like JSON
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    }
    this.metrics.misses++;
    if (this.logMisses) {
      this.logger.debug(`Cache miss: ${key}`);
    }
    return null;
  }
  
  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} True if successfully set, false otherwise
   */
  async set(key, value, ttl) {
    if (!this.enabled) {
      return false;
    }
    
    if (!key) {
      throw new CacheOperationError('Cache key is required');
    }
    
    if (value === undefined || value === null) {
      this.logger.debug(`Not caching null/undefined value for key: ${key}`);
      return false;
    }
    
    // Use domain-specific TTL if not provided
    const effectiveTTL = ttl || this.getTTL(key);
    
    // Convert objects to JSON strings
    const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
    
    await this.provider.set(key, valueToStore, effectiveTTL);
    this.metrics.sets++;
    this.logger.debug(`Cache set: ${key} (TTL: ${effectiveTTL}s)`);
    return true;
  }
  
  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if successfully deleted, false otherwise
   */
  async delete(key) {
    if (!this.enabled) {
      return false;
    }
    
    if (!key) {
      throw new CacheOperationError('Cache key is required');
    }
    
    await this.provider.delete(key);
    this.metrics.deletes++;
    this.logger.debug(`Cache delete: ${key}`);
    return true;
  }
  
  /**
   * Flush the cache
   * @returns {Promise<boolean>} True if successfully flushed
   */
  async flush() {
    if (!this.enabled) {
      return false;
    }
    
    await this.provider.flush();
    this.logger.debug('Cache flushed');
    return true;
  }
  
  /**
   * Get the TTL for a key based on domain-specific configurations
   * @param {string} key - Cache key
   * @returns {number} TTL in seconds
   */
  getTTL(key) {
    // Default TTL
    let ttl = this.defaultTTL;
    
    // Check for domain-specific TTLs based on key prefix
    const keyParts = key.split(':');
    if (keyParts.length > 1) {
      const domain = keyParts[0].toUpperCase();
      const operation = keyParts[1].toUpperCase();
      
      if (DEFAULT_TTL[domain]) {
        if (DEFAULT_TTL[domain][operation]) {
          ttl = DEFAULT_TTL[domain][operation];
        } else {
          // Use domain-level default if operation not found
          ttl = DEFAULT_TTL[domain].DEFAULT || this.defaultTTL;
        }
      }
    }
    
    return ttl;
  }
  
  /**
   * Get value from cache or execute factory function to get and cache value
   * @param {string} key - Cache key
   * @param {Function} factory - Factory function to execute if value not in cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<*>} Value from cache or factory function
   */
  async getOrSet(key, factory, ttl) {
    if (!this.enabled) {
      return factory();
    }
    
    if (!key) {
      throw new CacheOperationError('Cache key is required');
    }
    
    if (typeof factory !== 'function') {
      throw new CacheOperationError('Factory must be a function');
    }
    
    // Try to get value from cache first
    const cachedValue = await this.get(key);
    if (cachedValue !== null && cachedValue !== undefined) {
      return cachedValue;
    }
    
    // Execute factory function to get value
    const startTime = Date.now();
    const value = await factory();
    const duration = Date.now() - startTime;
    
    // Cache the value if not null/undefined and factory execution took significant time
    if (value !== null && value !== undefined) {
      // Only cache if factory took more than 50ms to execute or it's an array/object
      // This prevents caching trivial operations
      if (duration > 50 || Array.isArray(value) || typeof value === 'object' && value !== null) {
        await this.set(key, value, ttl);
        // Log performance benefit
        this.logger.debug(`Cached value for key ${key} (factory took ${duration}ms)`);
      }
    }
    
    return value;
  }
}

// Add the delete method wiring after defining it
CacheService.prototype.delete = withServiceErrorHandling(CacheService.prototype.delete, {
  methodName: 'delete',
  domainName: 'cache',
  logger: logger.child({ component: 'cache-service' }),
  errorMapper: cacheErrorMapper
});

export default CacheService;