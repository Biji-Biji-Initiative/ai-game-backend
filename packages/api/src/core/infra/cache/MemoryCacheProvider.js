"../../../infra/logging/logger.js;
'use strict';

// Dynamic import for NodeCache to handle ES modules properly
let NodeCache;
try {
  // Try to load NodeCache dynamically
  NodeCache = (await import('node-cache')).default;
} catch (error) {
  console.error('Failed to import NodeCache:', error);
  // Create a simple in-memory cache implementation as fallback
  NodeCache = class SimpleCache {
    constructor() {
      this.cache = new Map();
      this.ttls = new Map();
      this.stats = { hits: 0, misses: 0, ksize: 0, vsize: 0 };
    }
    
    get(key) {
      if (this.has(key)) {
        this.stats.hits++;
        return this.cache.get(key);
      }
      this.stats.misses++;
      return undefined;
    }
    
    set(key, value, ttl) {
      this.cache.set(key, value);
      if (ttl) {
        const expiry = Date.now() + (ttl * 1000);
        this.ttls.set(key, expiry);
      }
      this.stats.ksize = this.cache.size;
      return true;
    }
    
    del(key) {
      const deleted = this.cache.delete(key);
      this.ttls.delete(key);
      return deleted ? 1 : 0;
    }
    
    keys() {
      return Array.from(this.cache.keys());
    }
    
    flushAll() {
      this.cache.clear();
      this.ttls.clear();
      return true;
    }
    
    getStats() {
      return { ...this.stats };
    }
    
    has(key) {
      if (!this.cache.has(key)) return false;
      
      const expiry = this.ttls.get(key);
      if (expiry && Date.now() > expiry) {
        this.cache.delete(key);
        this.ttls.delete(key);
        return false;
      }
      return true;
    }
    
    getTtl(key) {
      return this.ttls.get(key) || 0;
    }
    
    ttl(key, ttlValue) {
      if (this.cache.has(key)) {
        const expiry = Date.now() + (ttlValue * 1000);
        this.ttls.set(key, expiry);
        return true;
      }
      return false;
    }
    
    on(event, callback) {
      // Simple event system (does nothing in this implementation)
    }
  };
}

/**
 * Memory Cache Provider class
 */
class MemoryCacheProvider {
  /**
   * Create a new memory cache provider
   * @param {Object} options - Cache configuration options
   * @param {number} options.ttl - Default TTL in seconds
   * @param {number} options.checkPeriod - Check period for expired keys in seconds
   * @param {boolean} options.useClones - Whether to clone objects
   * @param {boolean} options.enablePatterns - Enable pattern matching for keys
   */
  constructor(options = {}) {
    this.options = {
      ttl: options.ttl || 300,
      // 5 minutes
      checkPeriod: options.checkPeriod || 60,
      // 1 minute
      useClones: options.useClones !== undefined ? options.useClones : false,
      enablePatterns: options.enablePatterns !== undefined ? options.enablePatterns : true
    };
    this.logger = logger.child({
      component: 'memory-cache-provider'
    });
    // Initialize cache
    this.cache = new NodeCache({
      stdTTL: this.options.ttl,
      checkperiod: this.options.checkPeriod,
      useClones: this.options.useClones
    });
    // Track cache events
    // eslint-disable-next-line no-unused-vars
    this.cache.on('expired', (event, callback) => {
      this.logger.debug(`Cache key expired: ${event}`);
    });
    this.logger.info('Memory cache provider initialized', {
      defaultTTL: this.options.ttl,
      checkPeriod: this.options.checkPeriod
    });
  }
  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<*>} Value or null if not found
   */
  get(key) {
    return Promise.resolve().then(() => {
      try {
        const value = this.cache.get(key);
        if (value === undefined) {
          return null;
        }
        return value;
      } catch (error) {
        this.logger.error(`Error getting value from memory cache for key: ${key}`, {
          error: error.message
        });
        return null;
      }
    });
  }
  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to store
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} True if successful
   */
  set(key, value, ttl) {
    return Promise.resolve().then(() => {
      try {
        const success = this.cache.set(key, value, ttl || this.options.ttl);
        return success;
      } catch (error) {
        this.logger.error(`Error setting value in memory cache for key: ${key}`, {
          error: error.message,
          ttl
        });
        return false;
      }
    });
  }
  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<number>} Number of keys deleted
   */
  delete(key) {
    return Promise.resolve().then(() => {
      try {
        const deleted = this.cache.del(key);
        return deleted;
      } catch (error) {
        this.logger.error(`Error deleting value from memory cache for key: ${key}`, {
          error: error.message
        });
        return 0;
      }
    });
  }
  // Alias del to delete for backward compatibility
  del(key) {
    return this.delete(key);
  }
  /**
   * Delete values from cache by pattern
   * @param {string} pattern - Cache key pattern
   * @returns {Promise<number>} Number of keys deleted
   */
  delPattern(pattern) {
    return Promise.resolve().then(() => {
      try {
        if (!this.options.enablePatterns) {
          this.logger.warn('Pattern matching is disabled for memory cache');
          return 0;
        }
        // Convert Redis-style pattern to JavaScript regex
        const regexPattern = this._patternToRegex(pattern);
        // Get all keys and filter by pattern
        const allKeys = this.cache.keys();
        const matchingKeys = allKeys.filter(key => regexPattern.test(key));
        if (matchingKeys.length === 0) {
          return 0;
        }
        // Delete matching keys
        const deleted = this.cache.del(matchingKeys);
        return deleted;
      } catch (error) {
        this.logger.error(`Error deleting values from memory cache for pattern: ${pattern}`, {
          error: error.message
        });
        return 0;
      }
    });
  }
  /**
   * Get keys from cache by pattern
   * @param {string} pattern - Cache key pattern
   * @returns {Promise<Array<string>>} Array of keys
   */
  keys(pattern) {
    return Promise.resolve().then(() => {
      try {
        if (!this.options.enablePatterns) {
          this.logger.warn('Pattern matching is disabled for memory cache');
          return [];
        }
        // If no pattern or wildcard pattern, return all keys
        if (!pattern || pattern === '*') {
          return this.cache.keys();
        }
        // Convert Redis-style pattern to JavaScript regex
        const regexPattern = this._patternToRegex(pattern);
        // Get all keys and filter by pattern
        const allKeys = this.cache.keys();
        const matchingKeys = allKeys.filter(key => regexPattern.test(key));
        return matchingKeys;
      } catch (error) {
        this.logger.error(`Error getting keys from memory cache for pattern: ${pattern}`, {
          error: error.message
        });
        return [];
      }
    });
  }
  /**
   * Clear all values from cache
   * @returns {Promise<boolean>} True if successful
   */
  clear() {
    return Promise.resolve().then(() => {
      try {
        this.cache.flushAll();
        return true;
      } catch (error) {
        this.logger.error('Error clearing memory cache', {
          error: error.message
        });
        return false;
      }
    });
  }
  /**
   * Flush all values from cache (alias for clear)
   * @returns {Promise<boolean>} True if successful
   */
  flush() {
    return this.clear();
  }
  /**
   * Convert Redis-style pattern to JavaScript regex
   * @param {string} pattern - Redis-style pattern
   * @returns {RegExp} Regular expression
   * @private
   */
  _patternToRegex(pattern) {
    // Escape special regex characters
    let regexString = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Replace Redis wildcards with regex equivalents
    regexString = regexString.replace(/\\\*/g, '.*') // * becomes .*
    .replace(/\\\?/g, '.') // ? becomes .
    .replace(/\\\[([^\]]+)\\\]/g, '[$1]'); // [a-z] stays as [a-z]
    return new RegExp(`^${regexString}$`);
  }
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    try {
      const stats = this.cache.getStats();
      const keys = this.cache.keys();
      return {
        keyCount: keys.length,
        hits: stats.hits,
        misses: stats.misses,
        ksize: stats.ksize,
        vsize: stats.vsize
      };
    } catch (error) {
      this.logger.error('Error getting memory cache stats', {
        error: error.message
      });
      return {
        error: error.message
      };
    }
  }
  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if key exists
   */
  has(key) {
    return Promise.resolve().then(() => {
      try {
        return this.cache.has(key);
      } catch (error) {
        this.logger.error(`Error checking if key exists in memory cache: ${key}`, {
          error: error.message
        });
        return false;
      }
    });
  }
  /**
   * Get remaining TTL for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds, -1 if no TTL, -2 if key doesn't exist
   */
  ttl(key) {
    return Promise.resolve().then(() => {
      try {
        const ttl = this.cache.getTtl(key);
        if (ttl === undefined) {
          return -2; // Key doesn't exist
        }
        if (ttl === 0) {
          return -1; // No TTL (does not expire)
        }
        // Convert from timestamp to seconds
        const remainingTtl = Math.max(0, Math.floor((ttl - Date.now()) / 1000));
        return remainingTtl;
      } catch (error) {
        this.logger.error(`Error getting TTL for key in memory cache: ${key}`, {
          error: error.message
        });
        return -2;
      }
    });
  }
  /**
   * Set TTL for an existing key
   * @param {string} key - Cache key
   * @param {number} ttl - TTL in seconds
   * @returns {Promise<boolean>} True if successful
   */
  expire(key, ttl) {
    return Promise.resolve().then(() => {
      try {
        if (!this.cache.has(key)) {
          return false;
        }
        return this.cache.ttl(key, ttl);
      } catch (error) {
        this.logger.error(`Error setting TTL for key in memory cache: ${key}`, {
          error: error.message,
          ttl
        });
        return false;
      }
    });
  }
}
export default MemoryCacheProvider;"