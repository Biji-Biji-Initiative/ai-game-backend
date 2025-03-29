/**
 * Cache Factory
 *
 * Factory for creating cache service instances with appropriate providers.
 * Selects the right cache provider based on environment configuration.
 *
 * @module cacheFactory
 */

import { CacheService } from './CacheService.js';
import RedisCacheProvider from './RedisCacheProvider.js';
import MemoryCacheProvider from './MemoryCacheProvider.js';
import { CacheInvalidationManager } from './CacheInvalidationManager.js';
import { logger } from '../logging/logger.js';
import config from '../../config.js';

/**
 * Get Redis configuration from environment
 * @returns {Object} Redis configuration
 */
function getRedisConfig() {
  return {
    host: config.get('redis.host', 'localhost'),
    port: parseInt(config.get('redis.port', '6379'), 10),
    password: config.get('redis.password', undefined),
    db: parseInt(config.get('redis.db', '0'), 10),
    prefix: config.get('redis.prefix', 'app:cache:'),
    maxReconnectAttempts: parseInt(config.get('redis.maxReconnectAttempts', '10'), 10),
    enableOfflineQueue: config.get('redis.enableOfflineQueue', 'true') === 'true',
    useScan: config.get('redis.useScan', 'true') === 'true',
  };
}

/**
 * Get memory cache configuration from environment
 * @returns {Object} Memory cache configuration
 */
function getMemoryCacheConfig() {
  return {
    ttl: parseInt(config.get('cache.defaultTTL', '300'), 10),
    checkPeriod: parseInt(config.get('cache.checkPeriod', '60'), 10),
    useClones: config.get('cache.useClones', 'false') === 'true',
    enablePatterns: config.get('cache.enablePatterns', 'true') === 'true',
  };
}

/**
 * Get cache service configuration from environment
 * @returns {Object} Cache service configuration
 */
function getCacheServiceConfig() {
  return {
    defaultTTL: parseInt(config.get('cache.defaultTTL', '300'), 10),
    logHits: config.get('cache.logHits', 'true') === 'true',
    logMisses: config.get('cache.logMisses', 'true') === 'true',
    enabled: config.get('cache.enabled', 'true') === 'true',
    logger: logger.child({ component: 'cache-service' }),
  };
}

/**
 * Create a cache provider based on environment settings
 * @returns {Object} Cache provider instance
 */
function createCacheProvider() {
  const cacheType = config.get('cache.provider', 'memory').toLowerCase();

  logger.info(`Creating cache provider: ${cacheType}`);

  switch (cacheType) {
    case 'redis':
      return new RedisCacheProvider(getRedisConfig());

    case 'memory':
    default:
      return new MemoryCacheProvider(getMemoryCacheConfig());
  }
}

/**
 * Create a cache service with the appropriate provider
 * @returns {CacheService} Cache service instance
 */
function createCacheService() {
  const provider = createCacheProvider();
  const serviceConfig = getCacheServiceConfig();

  return new CacheService(provider, serviceConfig);
}

/**
 * Create a cache invalidation manager
 * @param {CacheService} cacheService - Cache service instance
 * @returns {CacheInvalidationManager} Cache invalidation manager instance
 */
function createCacheInvalidationManager(cacheService) {
  return new CacheInvalidationManager(cacheService);
}

// Singleton instances
let cacheServiceInstance = null;
let cacheInvalidationManagerInstance = null;

/**
 * Get or create the cache service singleton
 * @returns {CacheService} Cache service instance
 */
function getCacheService() {
  if (!cacheServiceInstance) {
    cacheServiceInstance = createCacheService();
  }

  return cacheServiceInstance;
}

/**
 * Get or create the cache invalidation manager singleton
 * @returns {CacheInvalidationManager} Cache invalidation manager instance
 */
function getCacheInvalidationManager() {
  if (!cacheInvalidationManagerInstance) {
    const cacheService = getCacheService();
    cacheInvalidationManagerInstance = createCacheInvalidationManager(cacheService);
  }

  return cacheInvalidationManagerInstance;
}

// Export the factory functions
export {
  createCacheService,
  createCacheInvalidationManager,
  getCacheService,
  getCacheInvalidationManager,
}; 