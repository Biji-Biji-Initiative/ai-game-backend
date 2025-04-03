/**
 * Storage utilities
 * 
 * Provides utilities for working with browser storage
 */

import { logger } from './logger';

/**
 * Storage type options
 */
export enum StorageType {
  /**
   * Local storage (persists across browser sessions)
   */
  LOCAL = 'local',
  
  /**
   * Session storage (persists only for the current browser session)
   */
  SESSION = 'session',
  
  /**
   * Memory storage (persists only for the current page session)
   */
  MEMORY = 'memory',
}

/**
 * In-memory storage implementation
 */
class MemoryStorage {
  private static data: Record<string, string> = {};
  
  /**
   * Set an item in memory storage
   * @param key Storage key
   * @param value Value to store
   */
  public static setItem(key: string, value: string): void {
    this.data[key] = value;
  }
  
  /**
   * Get an item from memory storage
   * @param key Storage key
   * @returns Stored value or null if not found
   */
  public static getItem(key: string): string | null {
    return key in this.data ? this.data[key] : null;
  }
  
  /**
   * Remove an item from memory storage
   * @param key Storage key
   */
  public static removeItem(key: string): void {
    delete this.data[key];
  }
  
  /**
   * Clear all items from memory storage
   */
  public static clear(): void {
    this.data = {};
  }
  
  /**
   * Get all keys in memory storage
   * @returns Array of keys
   */
  public static keys(): string[] {
    return Object.keys(this.data);
  }
}

/**
 * Get storage interface based on type
 * @param type Storage type
 * @returns Storage interface
 */
function getStorage(type: StorageType): Storage {
  switch (type) {
    case StorageType.LOCAL:
      return localStorage;
    case StorageType.SESSION:
      return sessionStorage;
    case StorageType.MEMORY:
      return MemoryStorage as unknown as Storage;
    default:
      throw new Error(`Invalid storage type: ${type}`);
  }
}

/**
 * Store a value in storage
 * @param key Storage key
 * @param value Value to store
 * @param type Storage type
 */
export function storeValue(key: string, value: unknown, type: StorageType = StorageType.LOCAL): void {
  try {
    const storage = getStorage(type);
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    storage.setItem(key, stringValue);
  } catch (error) {
    logger.error(`Failed to store value for key '${key}':`, error);
  }
}

/**
 * Get a value from storage
 * @param key Storage key
 * @param type Storage type
 * @returns Retrieved value or null if not found
 */
export function getValue<T = unknown>(key: string, type: StorageType = StorageType.LOCAL): T | null {
  try {
    const storage = getStorage(type);
    const value = storage.getItem(key);
    
    if (value === null) {
      return null;
    }
    
    try {
      return JSON.parse(value) as T;
    } catch {
      // If parsing fails, return as string
      return value as unknown as T;
    }
  } catch (error) {
    logger.error(`Failed to get value for key '${key}':`, error);
    return null;
  }
}

/**
 * Remove a value from storage
 * @param key Storage key
 * @param type Storage type
 */
export function removeValue(key: string, type: StorageType = StorageType.LOCAL): void {
  try {
    const storage = getStorage(type);
    storage.removeItem(key);
  } catch (error) {
    logger.error(`Failed to remove value for key '${key}':`, error);
  }
}

/**
 * Clear all values in a storage
 * @param type Storage type
 */
export function clearStorage(type: StorageType = StorageType.LOCAL): void {
  try {
    const storage = getStorage(type);
    storage.clear();
  } catch (error) {
    logger.error(`Failed to clear storage of type '${type}':`, error);
  }
}

/**
 * Check if a key exists in storage
 * @param key Storage key
 * @param type Storage type
 * @returns Whether the key exists
 */
export function hasKey(key: string, type: StorageType = StorageType.LOCAL): boolean {
  try {
    const storage = getStorage(type);
    return storage.getItem(key) !== null;
  } catch (error) {
    logger.error(`Failed to check if key '${key}' exists:`, error);
    return false;
  }
}

/**
 * Get all keys in a storage
 * @param type Storage type
 * @returns Array of keys
 */
export function getKeys(type: StorageType = StorageType.LOCAL): string[] {
  try {
    const storage = getStorage(type);
    
    if (type === StorageType.MEMORY) {
      return MemoryStorage.keys();
    }
    
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null) {
        keys.push(key);
      }
    }
    
    return keys;
  } catch (error) {
    logger.error(`Failed to get keys for storage type '${type}':`, error);
    return [];
  }
} 