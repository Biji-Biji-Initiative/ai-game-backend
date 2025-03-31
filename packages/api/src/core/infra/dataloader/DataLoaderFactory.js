/**
 * DataLoader Factory
 *
 * Creates and manages DataLoader instances to batch database queries
 * and prevent N+1 query problems.
 * 
 * @module DataLoaderFactory
 */

import DataLoader from 'dataloader';
import { logger } from '../logging/logger.js';
import { getCacheService } from '../cache/cacheFactory.js';
'use strict';

// Default cache options
const DEFAULT_CACHE_OPTIONS = {
  enabled: true,
  ttl: 60  // 1 minute
};

// Default DataLoader options
const DEFAULT_LOADER_OPTIONS = {
  batch: true,
  cache: true,
  maxBatchSize: 100
};

/**
 * Creates a new DataLoader with the specified batch function and options
 * 
 * @param {Function} batchFn - Function that takes an array of keys and returns a Promise that resolves to an array of values
 * @param {Object} options - DataLoader options
 * @returns {DataLoader} - DataLoader instance
 */
function createLoader(batchFn, options = {}) {
  const loaderOptions = {
    ...DEFAULT_LOADER_OPTIONS,
    ...options
  };
  
  return new DataLoader(batchFn, loaderOptions);
}

/**
 * Creates a DataLoader that uses Redis cache
 * 
 * @param {Function} batchFn - Batch loading function
 * @param {Object} options - Loader options
 * @param {Object} cacheOptions - Cache options
 * @returns {DataLoader} - DataLoader with Redis caching
 */
function createCachedLoader(
  batchFn,
  options = {},
  cacheOptions = {}
) {
  const cache = getCacheService();
  const { enabled, ttl } = { ...DEFAULT_CACHE_OPTIONS, ...cacheOptions };
  const loaderName = options.name || 'unnamed-loader';
  const log = logger.child({ component: 'dataloader', loader: loaderName });
  
  // If caching is disabled, return a regular loader
  if (!enabled) {
    log.debug('Creating non-cached DataLoader');
    return createLoader(batchFn, options);
  }
  
  log.debug('Creating cached DataLoader', { ttl });
  
  // Create cache key prefix
  const cacheKeyPrefix = `dataloader:${loaderName}:`;
  
  // Create a batch function that checks cache first
  const cachedBatchFn = async (keys) => {
    // Try to get values from cache first
    const cacheKeys = keys.map(key => `${cacheKeyPrefix}${key}`);
    const cachedValues = await Promise.all(
      cacheKeys.map(key => cache.get(key))
    );
    
    // Find keys that weren't in the cache
    const uncachedKeys = keys.filter((_, i) => cachedValues[i] === undefined);
    const uncachedIndices = keys.map((_, i) => cachedValues[i] === undefined ? i : -1).filter(i => i !== -1);
    
    // If all values were in cache, return them
    if (uncachedKeys.length === 0) {
      log.debug('All values found in cache');
      return cachedValues;
    }
    
    // Load uncached values
    log.debug(`Loading ${uncachedKeys.length} uncached values`, { 
      total: keys.length, 
      cached: keys.length - uncachedKeys.length 
    });
    
    const loadedValues = await batchFn(uncachedKeys);
    
    // Store loaded values in cache
    await Promise.all(
      uncachedKeys.map((key, i) => {
        const value = loadedValues[i];
        if (value !== null && value !== undefined) {
          return cache.set(`${cacheKeyPrefix}${key}`, value, ttl);
        }
        return Promise.resolve();
      })
    );
    
    // Merge cached and loaded values
    return keys.map((_, i) => {
      const uncachedIndex = uncachedIndices.indexOf(i);
      return uncachedIndex !== -1 ? loadedValues[uncachedIndex] : cachedValues[i];
    });
  };
  
  return createLoader(cachedBatchFn, options);
}

/**
 * Data Loaders for different aggregate types
 */
class DataLoaderRegistry {
  constructor() {
    this.loaders = new Map();
    this.log = logger.child({ component: 'dataloader-registry' });
  }
  
  /**
   * Get a DataLoader by name, creating it if it doesn't exist
   * 
   * @param {string} name - Loader name
   * @param {Function} batchFn - Batch loading function
   * @param {Object} options - Loader options
   * @param {Object} cacheOptions - Cache options
   * @returns {DataLoader} - DataLoader instance
   */
  getLoader(name, batchFn, options = {}, cacheOptions = {}) {
    if (this.loaders.has(name)) {
      return this.loaders.get(name);
    }
    
    this.log.debug(`Creating new DataLoader: ${name}`);
    const loader = createCachedLoader(
      batchFn, 
      { ...options, name }, 
      cacheOptions
    );
    
    this.loaders.set(name, loader);
    return loader;
  }
  
  /**
   * Clear a specific loader or all loaders
   * 
   * @param {string} [name] - Loader name (clears all if omitted)
   */
  clearLoaders(name) {
    if (name) {
      if (this.loaders.has(name)) {
        this.log.debug(`Clearing DataLoader: ${name}`);
        this.loaders.get(name).clearAll();
      }
    } else {
      this.log.debug('Clearing all DataLoaders');
      for (const [name, loader] of this.loaders.entries()) {
        loader.clearAll();
      }
    }
  }
  
  /**
   * Prime a loader with a value
   * 
   * @param {string} name - Loader name
   * @param {string} key - Key to prime
   * @param {any} value - Value to prime
   */
  prime(name, key, value) {
    if (this.loaders.has(name)) {
      this.log.debug(`Priming DataLoader: ${name}`, { key });
      this.loaders.get(name).prime(key, value);
    }
  }
}

// Singleton instance
let registry = null;

/**
 * Get the DataLoader registry
 * 
 * @returns {DataLoaderRegistry} - DataLoader registry
 */
function getRegistry() {
  if (!registry) {
    registry = new DataLoaderRegistry();
  }
  return registry;
}

export {
  createLoader,
  createCachedLoader,
  getRegistry
}; 