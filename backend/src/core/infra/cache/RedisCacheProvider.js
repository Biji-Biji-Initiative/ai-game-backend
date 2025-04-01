import { createClient } from "redis";
import { promisify } from "util";
import { logger } from "#app/core/infra/logging/logger.js";
'use strict';
/**
 * Redis Cache Provider class
 */
class RedisCacheProvider {
  /**
   * Create a new Redis cache provider
   * @param {Object} options - Redis configuration options
   * @param {string} options.host - Redis server host
   * @param {number} options.port - Redis server port
   * @param {string} options.password - Redis server password
   * @param {number} options.db - Redis database number
   * @param {string} options.prefix - Key prefix for all cache keys
   * @param {boolean} options.enableOfflineQueue - Whether to queue commands when connection is lost
   * @param {boolean} options.useScan - Whether to use SCAN instead of KEYS (defaults to true for production safety)
   */
  constructor(options = {}) {
    this.options = {
      host: options.host || 'localhost',
      port: options.port || 6379,
      password: options.password,
      db: options.db || 0,
      prefix: options.prefix || 'app:cache:',
      enableOfflineQueue: options.enableOfflineQueue !== false,
      // Default to true for production safety
      useScan: options.useScan !== false
    };
    this.logger = logger.child({
      component: 'redis-cache-provider'
    });
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    // Initialize connection
    this.connect();
  }
  /**
   * Connect to Redis server
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      // Close existing connection if any
      if (this.client) {
        await this.disconnect();
      }
      // Create new Redis client
      this.client = createClient({
        host: this.options.host,
        port: this.options.port,
        password: this.options.password,
        db: this.options.db,
        prefix: this.options.prefix,
        enable_offline_queue: this.options.enableOfflineQueue,
        retry_strategy: options => {
          this.reconnectAttempts = options.attempt;
          // Stop reconnecting after max attempts
          if (options.attempt > this.maxReconnectAttempts) {
            this.logger.error('Max Redis reconnect attempts reached. Giving up.', {
              attempt: options.attempt,
              totalRetryTime: options.total_retry_time,
              maxReconnectAttempts: this.maxReconnectAttempts
            });
            return new Error('Max Redis reconnect attempts reached');
          }
          // Exponential backoff with jitter
          const retryDelay = Math.min(Math.pow(2, options.attempt) * 100 + Math.random() * 100, 30000 // Max 30 seconds
          );
          this.logger.warn(`Redis connection lost. Reconnecting in ${Math.round(retryDelay)}ms...`, {
            attempt: options.attempt,
            delay: Math.round(retryDelay)
          });
          return retryDelay;
        }
      });
      // Promisify Redis commands
      this.getAsync = promisify(this.client.get).bind(this.client);
      this.setAsync = promisify(this.client.set).bind(this.client);
      this.delAsync = promisify(this.client.del).bind(this.client);
      this.keysAsync = promisify(this.client.keys).bind(this.client);
      this.flushDbAsync = promisify(this.client.flushdb).bind(this.client);
      this.scanAsync = promisify(this.client.scan).bind(this.client);
      this.existsAsync = promisify(this.client.exists).bind(this.client);
      this.expireAsync = promisify(this.client.expire).bind(this.client);
      this.ttlAsync = promisify(this.client.ttl).bind(this.client);
      // Event handlers
      this.client.on('ready', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.logger.info('Redis connection established', {
          host: this.options.host,
          port: this.options.port,
          db: this.options.db
        });
      });
      this.client.on('error', err => {
        this.isConnected = false;
        this.logger.error('Redis connection error', {
          error: err.message,
          host: this.options.host,
          port: this.options.port
        });
      });
      this.client.on('end', () => {
        this.isConnected = false;
        this.logger.info('Redis connection closed');
      });
      // Initialize connection
      return new Promise((resolve, reject) => {
        this.client.on('ready', () => resolve());
        this.client.on('error', err => {
          if (!this.isConnected) {
            reject(err);
          }
        });
      });
    } catch (error) {
      this.logger.error('Failed to connect to Redis', {
        error: error.message,
        host: this.options.host,
        port: this.options.port
      });
      throw error;
    }
  }
  /**
   * Disconnect from Redis server
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await promisify(this.client.quit).bind(this.client)();
        this.isConnected = false;
        this.logger.info('Disconnected from Redis');
      } catch (error) {
        this.logger.error('Error disconnecting from Redis', {
          error: error.message
        });
      }
    }
  }
  /**
   * Get a value from Redis
   * @param {string} key - Cache key
   * @returns {Promise<*>} Value or null if not found
   */
  async get(key) {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis not connected for get operation');
        return null;
      }
      const value = await this.getAsync(key);
      return value;
    } catch (error) {
      this.logger.error(`Error getting value from Redis for key: ${key}`, {
        error: error.message
      });
      return null;
    }
  }
  /**
   * Set a value in Redis
   * @param {string} key - Cache key
   * @param {*} value - Value to store
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} True if successful
   */
  async set(key, value, ttl) {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis not connected for set operation');
        return false;
      }
      if (ttl) {
        await this.setAsync(key, value, 'EX', ttl);
      } else {
        await this.setAsync(key, value);
      }
      return true;
    } catch (error) {
      this.logger.error(`Error setting value in Redis for key: ${key}`, {
        error: error.message,
        ttl
      });
      return false;
    }
  }
  /**
   * Delete a value from Redis
   * @param {string} key - Cache key
   * @returns {Promise<number>} Number of keys deleted
   */
  async del(key) {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis not connected for delete operation');
        return 0;
      }
      const result = await this.delAsync(key);
      return result;
    } catch (error) {
      this.logger.error(`Error deleting value from Redis for key: ${key}`, {
        error: error.message
      });
      return 0;
    }
  }
  /**
   * Delete values from Redis by pattern
   * @param {string} pattern - Cache key pattern
   * @returns {Promise<number>} Number of keys deleted
   */
  async delPattern(pattern) {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis not connected for delete pattern operation');
        return 0;
      }

      // Always use _scanForKeys for delPattern to avoid potentially blocking operations
      // This is safer for production systems with large datasets
      const keys = await this._scanForKeys(pattern);
      if (!keys || keys.length === 0) {
        return 0;
      }

      // Delete all matching keys
      const result = await this.delAsync(keys);
      this.logger.debug(`Deleted ${result} keys matching pattern: ${pattern}`);
      return result;
    } catch (error) {
      this.logger.error(`Error deleting values from Redis for pattern: ${pattern}`, {
        error: error.message
      });
      return 0;
    }
  }
  /**
   * Get keys from Redis by pattern
   * @param {string} pattern - Cache key pattern
   * @returns {Promise<Array<string>>} Array of keys
   */
  async keys(pattern) {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis not connected for keys operation');
        return [];
      }

      // Always prefer SCAN for production safety
      // Fall back to KEYS only when explicitly set and for non-production environments
      if (this.options.useScan) {
        return this._scanForKeys(pattern);
      }
      this.logger.warn('Using KEYS command which may block Redis for large datasets', {
        pattern
      });
      const keys = await this.keysAsync(pattern);
      return keys;
    } catch (error) {
      this.logger.error(`Error getting keys from Redis for pattern: ${pattern}`, {
        error: error.message
      });
      return [];
    }
  }
  /**
   * Scan for keys in Redis by pattern (for large databases)
   * @param {string} pattern - Cache key pattern
   * @returns {Promise<Array<string>>} Array of keys
   * @private
   */
  async _scanForKeys(pattern) {
    const keys = [];
    let cursor = '0';
    try {
      do {
        const [nextCursor, scanKeys] = await this.scanAsync(cursor, 'MATCH', pattern, 'COUNT', 1000);
        cursor = nextCursor;
        if (scanKeys && scanKeys.length > 0) {
          keys.push(...scanKeys);
        }
      } while (cursor !== '0');
      return keys;
    } catch (error) {
      this.logger.error(`Error scanning keys from Redis for pattern: ${pattern}`, {
        error: error.message
      });
      return keys;
    }
  }
  /**
   * Clear all values from Redis database
   * @returns {Promise<boolean>} True if successful
   */
  async clear() {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis not connected for clear operation');
        return false;
      }

      // If using a prefix, only clear keys with that prefix
      if (this.options.prefix) {
        // Use SCAN instead of KEYS for safer operation
        const keys = await this._scanForKeys('*');
        if (keys && keys.length > 0) {
          await this.delAsync(keys);
          this.logger.info(`Cleared ${keys.length} keys with prefix: ${this.options.prefix}`);
        }
        return true;
      }

      // Otherwise flush the entire database
      await this.flushDbAsync();
      this.logger.info('Flushed entire Redis database');
      return true;
    } catch (error) {
      this.logger.error('Error clearing Redis database', {
        error: error.message
      });
      return false;
    }
  }
  /**
   * Check if Redis is connected
   * @returns {boolean} True if connected
   */
  isReady() {
    return this.isConnected;
  }
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      connected: this.isConnected,
      prefix: this.options.prefix,
      host: this.options.host,
      port: this.options.port,
      db: this.options.db
    };
  }
  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if key exists
   */
  async has(key) {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis not connected for exists operation');
        return false;
      }
      const exists = await this.existsAsync(key);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Error checking if key exists in Redis: ${key}`, {
        error: error.message
      });
      return false;
    }
  }
  /**
   * Get TTL for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds, -1 if no TTL, -2 if key doesn't exist
   */
  async ttl(key) {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis not connected for ttl operation');
        return -2;
      }
      return await this.ttlAsync(key);
    } catch (error) {
      this.logger.error(`Error getting TTL for key in Redis: ${key}`, {
        error: error.message
      });
      return -2;
    }
  }
  /**
   * Set TTL for an existing key
   * @param {string} key - Cache key
   * @param {number} ttl - TTL in seconds
   * @returns {Promise<boolean>} True if successful
   */
  async expire(key, ttl) {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis not connected for expire operation');
        return false;
      }
      const result = await this.expireAsync(key, ttl);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error setting TTL for key in Redis: ${key}`, {
        error: error.message,
        ttl
      });
      return false;
    }
  }
}
export default RedisCacheProvider;