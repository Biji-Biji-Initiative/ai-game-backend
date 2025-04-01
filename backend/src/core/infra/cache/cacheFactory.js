import CacheService from "#app/core/infra/cache/CacheService.js";
import RedisCacheProvider from "#app/core/infra/cache/RedisCacheProvider.js";
import MemoryCacheProvider from "#app/core/infra/cache/MemoryCacheProvider.js";
import { CacheInvalidationManager } from "#app/core/infra/cache/CacheInvalidationManager.js";
import { logger } from "#app/core/infra/logging/logger.js";
import config from "#app/config/config.js";
'use strict';
/**
 * Get Redis configuration from environment
 * @returns {Object} Redis configuration
 */
function getRedisConfig() {
  return {
    host: (config.redis && config.redis.host) || 'localhost',
    port: parseInt((config.redis && config.redis.port) || '6379', 10),
    password: (config.redis && config.redis.password),
    db: parseInt((config.redis && config.redis.db) || '0', 10),
    prefix: (config.redis && config.redis.prefix) || 'app:cache:',
    maxReconnectAttempts: parseInt((config.redis && config.redis.maxReconnectAttempts) || '10', 10),
    enableOfflineQueue: ((config.redis && config.redis.enableOfflineQueue) || 'true') === 'true',
    useScan: ((config.redis && config.redis.useScan) || 'true') === 'true'
  };
}
/**
 * Get memory cache configuration from environment
 * @returns {Object} Memory cache configuration
 */
function getMemoryCacheConfig() {
  return {
    ttl: parseInt((config.cache && config.cache.defaultTTL) || '300', 10),
    checkPeriod: parseInt((config.cache && config.cache.checkPeriod) || '60', 10),
    useClones: ((config.cache && config.cache.useClones) || 'false') === 'true',
    enablePatterns: ((config.cache && config.cache.enablePatterns) || 'true') === 'true'
  };
}
/**
 * Get cache service configuration from environment
 * @returns {Object} Cache service configuration
 */
function getCacheServiceConfig() {
  return {
    defaultTTL: parseInt((config.cache && config.cache.defaultTTL) || '300', 10),
    logHits: ((config.cache && config.cache.logHits) || 'true') === 'true',
    logMisses: ((config.cache && config.cache.logMisses) || 'true') === 'true',
    enabled: ((config.cache && config.cache.enabled) || 'true') === 'true',
    logger: logger.child({
      component: 'cache-service'
    })
  };
}
/**
 * Create a cache provider based on environment settings
 * @returns {Object} Cache provider instance
 */
function createCacheProvider() {
  const cacheType = (config.cache && config.cache.provider) || 'memory';
  logger.info(`Creating cache provider: ${cacheType}`);
  switch (cacheType.toLowerCase()) {
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
export { createCacheService };
export { createCacheInvalidationManager };
export { getCacheService };
export { getCacheInvalidationManager };
export default {
  createCacheService,
  createCacheInvalidationManager,
  getCacheService,
  getCacheInvalidationManager
};