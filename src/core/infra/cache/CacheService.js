/**
 * Cache Service
 * 
 * Provides caching capabilities for the application.
 * Used to cache frequently accessed data to reduce database load.
 */

const NodeCache = require('node-cache');
const { logger } = require('../logging/logger');

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
   */
  constructor(options = {}) {
    const {
      stdTTL = 300, // 5 minutes default TTL
      checkperiod = 60, // Check for expired keys every 60 seconds
      useClones = false, // Don't clone objects (better performance)
      namespace = 'cache'
    } = options;

    this.cache = new NodeCache({
      stdTTL,
      checkperiod,
      useClones
    });

    this.log = logger.child(namespace);
    this.namespace = namespace;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * Get an item from the cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined if not found
   */
  get(key) {
    const value = this.cache.get(key);
    
    if (value === undefined) {
      this.stats.misses++;
      this.log.debug(`Cache miss for key: ${key}`, { 
        operation: 'get',
        key,
        result: 'miss',
        stats: this.stats
      });
      return undefined;
    }
    
    this.stats.hits++;
    this.log.debug(`Cache hit for key: ${key}`, { 
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
  set(key, value, ttl) {
    const success = this.cache.set(key, value, ttl);
    
    if (success) {
      this.stats.sets++;
      this.log.debug(`Set cache key: ${key}`, { 
        operation: 'set',
        key,
        ttl: ttl || 'default',
        stats: this.stats
      });
    }
    
    return success;
  }

  /**
   * Remove an item from the cache
   * @param {string} key - Cache key
   * @returns {number} Number of items removed
   */
  delete(key) {
    const count = this.cache.del(key);
    
    this.log.debug(`Deleted cache key: ${key}`, { 
      operation: 'delete',
      key,
      count,
      stats: this.stats
    });
    
    return count;
  }

  /**
   * Check if a key exists in the cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Clear all items from the cache
   */
  clear() {
    this.cache.flushAll();
    this.log.info('Cache cleared', { 
      operation: 'clear',
      stats: this.stats
    });
    
    // Reset stats
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * Get all keys in the cache
   * @param {string} [pattern] - Optional pattern to filter keys (uses simple string matching)
   * @returns {Array<string>} Array of cache keys
   */
  keys(pattern) {
    const allKeys = this.cache.keys();
    
    if (!pattern) {
      return allKeys;
    }
    
    return allKeys.filter(key => key.includes(pattern));
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const cacheStats = this.cache.getStats();
    return {
      ...this.stats,
      keys: this.cache.keys().length,
      ...cacheStats
    };
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
      this.log.error(`Error in cache factory for key: ${key}`, { 
        operation: 'getOrSet',
        key,
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }
}

module.exports = CacheService; 