/**
 * Storage Utility Functions
 * Utilities for working with localStorage, sessionStorage, and IndexedDB
 */

import { logger } from './logger';

/**
 * Interface for storage options
 */
export interface StorageOptions {
  expires?: number; // Expiration time in milliseconds
  prefix?: string;  // Key prefix for namespacing
}

/**
 * Interface for a stored item with expiration
 */
interface StoredItem<T> {
  value: T;
  expires?: number; // Timestamp when the item expires
}

/**
 * Checks if the storage is available
 * @param type Storage type ('localStorage' or 'sessionStorage')
 * @returns Whether the storage is available
 */
export function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = window[type];
    const testKey = `__storage_test__${Math.random()}`;
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Sets an item in localStorage with optional expiration
 * @param key Key to store under
 * @param value Value to store
 * @param options Storage options
 */
export function setLocalStorageItem<T>(key: string, value: T, options: StorageOptions = {}): void {
  try {
    if (!isStorageAvailable('localStorage')) {
      logger.warn('localStorage is not available');
      return;
    }
    
    const { expires, prefix = '' } = options;
    const prefixedKey = prefix ? `${prefix}_${key}` : key;
    
    const item: StoredItem<T> = {
      value
    };
    
    // Add expiration if specified
    if (expires) {
      item.expires = Date.now() + expires;
    }
    
    localStorage.setItem(prefixedKey, JSON.stringify(item));
    logger.debug(`LocalStorage: Set item "${prefixedKey}"`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to set localStorage item "${key}":`, errorMessage);
  }
}

/**
 * Gets an item from localStorage, respecting expiration
 * @param key Key to retrieve
 * @param options Storage options
 * @returns Retrieved value or null if not found or expired
 */
export function getLocalStorageItem<T>(key: string, options: StorageOptions = {}): T | null {
  try {
    if (!isStorageAvailable('localStorage')) {
      logger.warn('localStorage is not available');
      return null;
    }
    
    const { prefix = '' } = options;
    const prefixedKey = prefix ? `${prefix}_${key}` : key;
    
    const json = localStorage.getItem(prefixedKey);
    
    if (!json) {
      return null;
    }
    
    const item: StoredItem<T> = JSON.parse(json);
    
    // Check if the item has expired
    if (item.expires && item.expires < Date.now()) {
      localStorage.removeItem(prefixedKey);
      logger.debug(`LocalStorage: Item "${prefixedKey}" expired and was removed`);
      return null;
    }
    
    logger.debug(`LocalStorage: Retrieved item "${prefixedKey}"`);
    return item.value;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get localStorage item "${key}":`, errorMessage);
    return null;
  }
}

/**
 * Removes an item from localStorage
 * @param key Key to remove
 * @param options Storage options
 */
export function removeLocalStorageItem(key: string, options: StorageOptions = {}): void {
  try {
    if (!isStorageAvailable('localStorage')) {
      logger.warn('localStorage is not available');
      return;
    }
    
    const { prefix = '' } = options;
    const prefixedKey = prefix ? `${prefix}_${key}` : key;
    
    localStorage.removeItem(prefixedKey);
    logger.debug(`LocalStorage: Removed item "${prefixedKey}"`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to remove localStorage item "${key}":`, errorMessage);
  }
}

/**
 * Sets an item in sessionStorage
 * @param key Key to store under
 * @param value Value to store
 * @param options Storage options
 */
export function setSessionStorageItem<T>(key: string, value: T, options: StorageOptions = {}): void {
  try {
    if (!isStorageAvailable('sessionStorage')) {
      logger.warn('sessionStorage is not available');
      return;
    }
    
    const { prefix = '' } = options;
    const prefixedKey = prefix ? `${prefix}_${key}` : key;
    
    const item: StoredItem<T> = { value };
    
    sessionStorage.setItem(prefixedKey, JSON.stringify(item));
    logger.debug(`SessionStorage: Set item "${prefixedKey}"`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to set sessionStorage item "${key}":`, errorMessage);
  }
}

/**
 * Gets an item from sessionStorage
 * @param key Key to retrieve
 * @param options Storage options
 * @returns Retrieved value or null if not found
 */
export function getSessionStorageItem<T>(key: string, options: StorageOptions = {}): T | null {
  try {
    if (!isStorageAvailable('sessionStorage')) {
      logger.warn('sessionStorage is not available');
      return null;
    }
    
    const { prefix = '' } = options;
    const prefixedKey = prefix ? `${prefix}_${key}` : key;
    
    const json = sessionStorage.getItem(prefixedKey);
    
    if (!json) {
      return null;
    }
    
    const item: StoredItem<T> = JSON.parse(json);
    logger.debug(`SessionStorage: Retrieved item "${prefixedKey}"`);
    return item.value;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get sessionStorage item "${key}":`, errorMessage);
    return null;
  }
}

/**
 * Removes an item from sessionStorage
 * @param key Key to remove
 * @param options Storage options
 */
export function removeSessionStorageItem(key: string, options: StorageOptions = {}): void {
  try {
    if (!isStorageAvailable('sessionStorage')) {
      logger.warn('sessionStorage is not available');
      return;
    }
    
    const { prefix = '' } = options;
    const prefixedKey = prefix ? `${prefix}_${key}` : key;
    
    sessionStorage.removeItem(prefixedKey);
    logger.debug(`SessionStorage: Removed item "${prefixedKey}"`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to remove sessionStorage item "${key}":`, errorMessage);
  }
}

/**
 * Clears expired items from localStorage
 * @param prefix Optional prefix to limit cleaning to specific keys
 * @returns Number of items removed
 */
export function clearExpiredLocalStorageItems(prefix?: string): number {
  if (!isStorageAvailable('localStorage')) {
    logger.warn('localStorage is not available');
    return 0;
  }
  
  let removedCount = 0;
  const now = Date.now();
  
  try {
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      // Skip if prefix doesn't match
      if (prefix && !key.startsWith(prefix)) {
        continue;
      }
      
      try {
        const json = localStorage.getItem(key);
        if (!json) continue;
        
        const item = JSON.parse(json);
        
        // Check if the item has an expiration and if it has expired
        if (item.expires && item.expires < now) {
          localStorage.removeItem(key);
          removedCount++;
        }
      } catch {
        // Skip items that fail to parse
        continue;
      }
    }
    
    logger.debug(`LocalStorage: Cleared ${removedCount} expired items`);
    return removedCount;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to clear expired localStorage items:', errorMessage);
    return removedCount;
  }
}

/**
 * Gets the size of data stored in localStorage
 * @param prefix Optional prefix to limit size calculation
 * @returns Size in bytes
 */
export function getLocalStorageSize(prefix?: string): number {
  if (!isStorageAvailable('localStorage')) {
    logger.warn('localStorage is not available');
    return 0;
  }
  
  try {
    const keys = Object.keys(localStorage);
    let totalSize = 0;
    
    for (const key of keys) {
      // Skip if prefix doesn't match
      if (prefix && !key.startsWith(prefix)) {
        continue;
      }
      
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;
      }
    }
    
    return totalSize * 2; // Multiply by 2 because characters are UTF-16 (2 bytes per character)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to calculate localStorage size:', errorMessage);
    return 0;
  }
}

/**
 * Gets all localStorage keys with a specific prefix
 * @param prefix Prefix to filter by
 * @returns Array of keys
 */
export function getLocalStorageKeys(prefix = ''): string[] {
  if (!isStorageAvailable('localStorage')) {
    logger.warn('localStorage is not available');
    return [];
  }
  
  try {
    const keys = Object.keys(localStorage);
    
    if (!prefix) {
      return keys;
    }
    
    return keys.filter(key => key.startsWith(prefix)).map(key => {
      // Remove prefix from the key if desired
      return prefix ? key.substring(prefix.length + 1) : key;
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to get localStorage keys:', errorMessage);
    return [];
  }
}

/**
 * Creates a storage manager for a specific namespace
 * @param namespace Namespace for the storage
 * @returns Storage manager object
 */
export function createStorageManager(namespace: string) {
  const options: StorageOptions = { prefix: namespace };
  
  return {
    setItem: <T>(key: string, value: T, expires?: number): void => {
      setLocalStorageItem(key, value, { ...options, expires });
    },
    
    getItem: <T>(key: string): T | null => {
      return getLocalStorageItem<T>(key, options);
    },
    
    removeItem: (key: string): void => {
      removeLocalStorageItem(key, options);
    },
    
    clear: (): void => {
      const keys = getLocalStorageKeys(namespace);
      keys.forEach(key => removeLocalStorageItem(key, options));
    },
    
    clearExpired: (): number => {
      return clearExpiredLocalStorageItems(namespace);
    },
    
    getSize: (): number => {
      return getLocalStorageSize(namespace);
    },
    
    getKeys: (): string[] => {
      return getLocalStorageKeys(namespace);
    }
  };
} 