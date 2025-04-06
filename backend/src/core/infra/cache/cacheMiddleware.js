'use strict';

/**
 * Cache middleware factory
 * Creates middleware for caching API responses
 */

import { createClient } from 'redis';
import { infraLogger } from '#app/core/infra/logging/domainLogger.js';
import { startupLogger } from '#app/core/infra/logging/StartupLogger.js';

// Default TTL in seconds
const DEFAULT_TTL = 60;

// In-memory cache store as fallback
const memoryCache = new Map();

/**
 * Create cache middleware
 * @param {Object} options - Cache configuration options
 * @returns {Function} Express middleware
 */
export function createCacheMiddleware(options = {}) {
  const logger = infraLogger.child({ component: 'cache-middleware' });
  const config = {
    ttl: options?.ttl || DEFAULT_TTL,
    storage: options?.storage || 'memory',
    redisUrl: options?.redisUrl || 'redis://localhost:6379',
    keyPrefix: options?.keyPrefix || 'api-cache:',
    excludePaths: options?.excludePaths || ['/health', '/monitoring'],
    ...options
  };
  
  let redisClient = null;
  
  // Initialize Redis client if using Redis storage
  if (config.storage === 'redis') {
    try {
      redisClient = createClient({
        url: config.redisUrl
      });
      
      redisClient.on('error', (err) => {
        logger.error('Redis client error', { error: err.message });
        startupLogger.logComponentInitialization('cache.redis', 'error', {
          error: err.message
        });
      });
      
      redisClient.on('connect', () => {
        logger.info('Redis client connected');
        startupLogger.logComponentInitialization('cache.redis', 'success', {
          url: config.redisUrl
        });
      });
      
      // Connect to Redis
      redisClient.connect().catch(err => {
        logger.error('Failed to connect to Redis', { error: err.message });
        startupLogger.logComponentInitialization('cache.redis', 'error', {
          error: err.message
        });
      });
    } catch (error) {
      logger.error('Failed to initialize Redis client', { error: error.message });
      startupLogger.logComponentInitialization('cache.redis', 'error', {
        error: error.message
      });
    }
  }
  
  // Log cache initialization
  logger.info('Cache middleware initialized', { 
    storage: config.storage,
    ttl: config.ttl,
    redisUrl: config.storage === 'redis' ? config.redisUrl : 'N/A'
  });
  
  startupLogger.logComponentInitialization('cache', 'success', {
    storage: config.storage,
    ttl: `${config.ttl}s`,
    excludePaths: config.excludePaths
  });
  
  // Return the middleware function
  return function cacheMiddleware(req, res, next) {
    // Skip caching for excluded paths
    if (config.excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Generate cache key from request path and query
    const cacheKey = `${config.keyPrefix}${req.originalUrl || req.url}`;
    
    // Function to get cached response
    const getCachedResponse = async () => {
      try {
        if (config.storage === 'redis' && redisClient?.isReady) {
          const cachedData = await redisClient.get(cacheKey);
          if (cachedData) {
            return JSON.parse(cachedData);
          }
        } else {
          // Fallback to memory cache
          if (memoryCache.has(cacheKey)) {
            return memoryCache.get(cacheKey);
          }
        }
      } catch (error) {
        logger.error('Error retrieving from cache', { 
          error: error.message,
          cacheKey
        });
      }
      return null;
    };
    
    // Function to store response in cache
    const cacheResponse = async (data) => {
      try {
        if (config.storage === 'redis' && redisClient?.isReady) {
          await redisClient.set(cacheKey, JSON.stringify(data), {
            EX: config.ttl
          });
        } else {
          // Fallback to memory cache
          memoryCache.set(cacheKey, data);
          
          // Set expiration for memory cache
          setTimeout(() => {
            memoryCache.delete(cacheKey);
          }, config.ttl * 1000);
        }
      } catch (error) {
        logger.error('Error storing in cache', { 
          error: error.message,
          cacheKey
        });
      }
    };
    
    // Check cache first
    getCachedResponse().then(cachedData => {
      if (cachedData) {
        // Cache hit
        logger.debug('Cache hit', { cacheKey });
        res.set('X-Cache', 'HIT');
        res.send(cachedData);
        return;
      }
      
      // Cache miss - capture the response
      logger.debug('Cache miss', { cacheKey });
      res.set('X-Cache', 'MISS');
      
      // Store original send method
      const originalSend = res.send;
      
      // Override send method to cache response
      res.send = function(body) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheResponse(body);
        }
        
        // Call original send method
        return originalSend.call(this, body);
      };
      
      next();
    }).catch(error => {
      logger.error('Cache middleware error', { error: error.message });
      next();
    });
  };
}
