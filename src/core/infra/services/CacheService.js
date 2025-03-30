import { logger } from "../logging/logger.js";
'use strict';
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
  }
  /**
   * Get TTL for a specific key based on its domain and operation
   * @param {string} key - Cache key
   * @param {number} defaultTTL - Default TTL if no specific TTL is found
   * @returns {number} TTL in seconds
   */
  getTTL(key, defaultTTL) {
    if (!key || typeof key !== 'string') {
      return defaultTTL || this.defaultTTL;
    }
    // Extract domain and operation from key
    const parts = key.split(':');
    if (parts.length < 3) {
      return defaultTTL || this.defaultTTL;
    }
    const domain = parts[0].toUpperCase();
    const operation = parts[1].toUpperCase();
    // Check for domain and operation specific TTL
    if (DEFAULT_TTL[domain] && DEFAULT_TTL[domain][operation]) {
      return DEFAULT_TTL[domain][operation];
    }
    // Check for domain specific TTL
    if (DEFAULT_TTL[domain] && DEFAULT_TTL[domain].DEFAULT) {
      return DEFAULT_TTL[domain].DEFAULT;
    }
    // Use provided defaultTTL or instance default
    return defaultTTL || this.defaultTTL;
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
    try {
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
          } catch (e) {
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
    } catch (error) {
      this.logger.error(`Error getting cache value for key ${key}`, {
        error: error.message,
        stack: error.stack
      });
      return null;
    }
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
    if (value === undefined || value === null) {
      this.logger.debug(`Not caching null/undefined value for key: ${key}`);
      return false;
    }
    try {
      // Use domain-specific TTL if not provided
      const effectiveTTL = ttl || this.getTTL(key);
      // Convert objects to JSON strings
      const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
      await this.provider.set(key, valueToStore, effectiveTTL);
      this.metrics.sets++;
      this.logger.debug(`Cache set: ${key} (TTL: ${effectiveTTL}s)`);
      return true;
    } catch (error) {
      this.logger.error(`Error setting cache value for key ${key}`, {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if successfully deleted, false otherwise
   */
  async del(key) {
    if (!this.enabled) {
      return false;
    }
    try {
      await this.provider.del(key);
      this.metrics.deletes++;
      this.logger.debug(`Cache deleted: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}`, {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
  /**
   * Delete values from cache by pattern
   * @param {string} pattern - Cache key pattern
   * @returns {Promise<number>} Number of keys deleted
   */
  async delPattern(pattern) {
    if (!this.enabled) {
      return 0;
    }
    try {
      const count = await this.provider.delPattern(pattern);
      this.metrics.deletes += count;
      this.logger.debug(`Deleted ${count} cache keys matching pattern: ${pattern}`);
      return count;
    } catch (error) {
      this.logger.error(`Error deleting cache keys with pattern ${pattern}`, {
        error: error.message,
        stack: error.stack
      });
      return 0;
    }
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
    // Try to get value from cache first
    const cachedValue = await this.get(key);
    if (cachedValue !== null && cachedValue !== undefined) {
      return cachedValue;
    }
    try {
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
    } catch (error) {
      this.logger.error(`Error in getOrSet factory for key ${key}`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
  /**
   * Get cache keys matching a pattern
   * @param {string} pattern - Cache key pattern
   * @returns {Promise<Array<string>>} Array of matching keys
   */
  async keys(pattern) {
    if (!this.enabled) {
      return [];
    }
    try {
      return await this.provider.keys(pattern);
    } catch (error) {
      this.logger.error(`Error getting cache keys with pattern ${pattern}`, {
        error: error.message,
        stack: error.stack
      });
      return [];
    }
  }
  /**
   * Clear all cache
   * @returns {Promise<boolean>} True if successfully cleared, false otherwise
   */
  async clear() {
    if (!this.enabled) {
      return false;
    }
    try {
      await this.provider.clear();
      this.logger.info('Cache cleared');
      return true;
    } catch (error) {
      this.logger.error('Error clearing cache', {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
  /**
   * Get cache metrics
   * @returns {Object} Cache metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      hitRatio: this.metrics.hits + this.metrics.misses > 0 ? this.metrics.hits / (this.metrics.hits + this.metrics.misses) : 0,
      timestamp: new Date().toISOString()
    };
  }
  /**
   * Reset cache metrics
   */
  resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    this.logger.debug('Cache metrics reset');
  }
}
export { CacheService };
export { DEFAULT_TTL };
export default {
  CacheService,
  DEFAULT_TTL
};