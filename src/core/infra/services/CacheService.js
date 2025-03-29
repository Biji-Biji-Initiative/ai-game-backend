'use strict';

/**
 * Cache Service
 * 
 * Provides caching capabilities for the application.
 * Used to cache frequently accessed data to reduce database load.
 */

const NodeCache = require('node-cache');
const {
  applyServiceErrorHandling,
  createErrorMapper
} = require('../errors/centralizedErrorUtils');

const {
  CacheError,
  CacheKeyNotFoundError,
  CacheInitializationError,
  CacheOperationError
} = require('../errors/InfraErrors');

// Create an error mapper for the cache service
const cacheErrorMapper = createErrorMapper(
  {
    CacheKeyNotFoundError: CacheKeyNotFoundError,
    CacheInitializationError: CacheInitializationError,
    CacheOperationError: CacheOperationError,
    Error: CacheError
  },
  CacheError
);

/**
 * Cache Service class
 */
class CacheService {
  /**
   * Create a new cache service
   * @param {Object} options - Cache options
   * @param {number} options.stdTTL - Standard TTL in seconds (default: 300)
   * @param {boolean} options.checkperiod - Check period in seconds (default: 60)
   * @param {boolean} options.useClones - Whether to clone objects (default: false)
   * @param {string} options.namespace - Cache namespace for logging
   * @param {Object} options.logger - Logger instance
   */
  constructor(options = {}) {
    const {
      stdTTL = 300, // 5 minutes default TTL
      checkperiod = 60, // Check for expired keys every 60 seconds
      useClones = false, // Don't clone objects (better performance)
      namespace = 'cache',
      logger
    } = options;
    
    if (!logger) {
      throw new CacheInitializationError('Logger is required for CacheService');
    }

    try {
      this.cache = new NodeCache({
        stdTTL,
        checkperiod,
        useClones
      });
    } catch (error) {
      throw new CacheInitializationError(error.message, { cause: error });
    }

    this.logger = logger;
    this.namespace = namespace;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };

    // Apply standardized error handling to methods
    this.get = applyServiceErrorHandling(this, 'get', {
      domainName: 'infra',
      logger: this.logger,
      errorMapper: cacheErrorMapper
    });

    this.set = applyServiceErrorHandling(this, 'set', {
      domainName: 'infra',
      logger: this.logger,
      errorMapper: cacheErrorMapper
    });

    this.delete = applyServiceErrorHandling(this, 'delete', {
      domainName: 'infra',
      logger: this.logger,
      errorMapper: cacheErrorMapper
    });

    this.clear = applyServiceErrorHandling(this, 'clear', {
      domainName: 'infra',
      logger: this.logger,
      errorMapper: cacheErrorMapper
    });

    this.keys = applyServiceErrorHandling(this, 'keys', {
      domainName: 'infra',
      logger: this.logger,
      errorMapper: cacheErrorMapper
    });

    this.getStats = applyServiceErrorHandling(this, 'getStats', {
      domainName: 'infra',
      logger: this.logger,
      errorMapper: cacheErrorMapper
    });

    this.getOrSet = applyServiceErrorHandling(this, 'getOrSet', {
      domainName: 'infra',
      logger: this.logger,
      errorMapper: cacheErrorMapper
    });
  }

  /**
   * Get an item from the cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined if not found
   */
  /**
   * Method get
   */
  get(key) {
    const value = this.cache.get(key);
    
    if (value === undefined) {
      this.stats.misses++;
      this.logger.debug(`Cache miss for key: ${key}`, { 
        operation: 'get',
        key,
        result: 'miss',
        stats: this.stats
      });
      return undefined;
    }
    
    this.stats.hits++;
    this.logger.debug(`Cache hit for key: ${key}`, { 
      operation: 'get',
      key,
      result: 'hit',
      stats: this.stats
    });
    
    return value;
  }

  /**
   * Set an item in the cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {boolean} True if successful
   */
  /**
   * Method set
   */
  set(key, value, ttl) {
    const success = this.cache.set(key, value, ttl);
    
    if (success) {
      this.stats.sets++;
      this.logger.debug(`Set cache key: ${key}`, { 
        operation: 'set',
        key,
        ttl: ttl || 'default',
        stats: this.stats
      });
    } else {
      throw new CacheOperationError('set', `Failed to set key: ${key}`);
    }
    
    return success;
  }

  /**
   * Remove an item from the cache
   * @param {string} key - Cache key
   * @returns {number} Number of items removed
   */
  /**
   * Method delete
   */
  delete(key) {
    try {
      const count = this.cache.del(key);
      
      this.logger.debug(`Deleted cache key: ${key}`, { 
        operation: 'delete',
        key,
        count,
        stats: this.stats
      });
      
      return count;
    } catch (error) {
      throw new CacheOperationError('delete', error.message, { cause: error });
    }
  }

  /**
   * Check if a key exists in the cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists
   */
  /**
   * Method has
   */
  has(key) {
    try {
      return this.cache.has(key);
    } catch (error) {
      throw new CacheOperationError('has', error.message, { cause: error });
    }
  }

  /**
   * Clear all items from the cache
   */
  /**
   * Method clear
   */
  clear() {
    try {
      this.cache.flushAll();
      this.logger.info('Cache cleared', { 
        operation: 'clear',
        stats: this.stats
      });
      
      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0
      };
    } catch (error) {
      throw new CacheOperationError('clear', error.message, { cause: error });
    }
  }

  /**
   * Get all keys in the cache
   * @param {string} [pattern] - Optional pattern to filter keys (uses simple string matching)
   * @returns {Array<string>} Array of cache keys
   */
  /**
   * Method keys
   */
  keys(pattern) {
    try {
      const allKeys = this.cache.keys();
      
      if (!pattern) {
        return allKeys;
      }
      
      return allKeys.filter(key => key.includes(pattern));
    } catch (error) {
      throw new CacheOperationError('keys', error.message, { cause: error });
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  /**
   * Method getStats
   */
  getStats() {
    try {
      const cacheStats = this.cache.getStats();
      return {
        ...this.stats,
        keys: this.cache.keys().length,
        ...cacheStats
      };
    } catch (error) {
      throw new CacheOperationError('getStats', error.message, { cause: error });
    }
  }

  /**
   * Get or set cache value with a factory function
   * @param {string} key - Cache key
   * @param {Function} factory - Function to generate value if not in cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<*>} Value from cache or factory
   */
  async getOrSet(key, factory, ttl) {
    const value = this.get(key);
    
    if (value !== undefined) {
      return value;
    }
    
    try {
      const newValue = await factory();
      
      if (newValue !== undefined) {
        this.set(key, newValue, ttl);
      }
      
      return newValue;
    } catch (error) {
      this.logger.error(`Error in cache factory for key: ${key}`, { 
        operation: 'getOrSet',
        key,
        error: error.message,
        stack: error.stack
      });
      
      throw new CacheOperationError('getOrSet', `Factory function failed for key: ${key}`, {
        cause: error,
        metadata: { key }
      });
    }
  }
}

module.exports = CacheService; 