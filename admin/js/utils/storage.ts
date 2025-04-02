// Types improved by ts-improve-types
import { logger } from './logger';

/**
 * Storage types supported by the application
 */
export enum StorageType {
  LOCAL = 'localStorage',
  SESSION = 'sessionStorage',
  MEMORY = 'memory',
}

/**
 * Storage options
 */
export interface StorageOptions {
  /**
   * Storage type to use
   */
  type: StorageType;

  /**
   * Prefix for all keys
   */
  prefix?: string;

  /**
   * Enable encryption (not implemented)
   */
  encrypt?: boolean;

  /**
   * Maximum storage size in bytes (not implemented)
   */
  maxSize?: number;
}

/**
 * Default storage options
 */
const DEFAULT_OPTIONS: StorageOptions = {
  type: StorageType.LOCAL,
  prefix: 'app_',
  encrypt: false,
};

/**
 * In-memory storage fallback
 */
const memoryStorage: Record<string, string> = {};

/**
 * Check if a storage type is available
 * @param type Storage type to check
 * @returns True if the storage is available
 */
export function isStorageAvailable(type: StorageType): boolean {
  if (type === StorageType.MEMORY) {
    return true;
  }

  try {
    const storage = type === StorageType.LOCAL ? localStorage : sessionStorage;
    const testKey = '__storage_test__';

    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    logger.warn(`${type} is not available: ${error}`);
    return false;
  }
}

/**
 * Get storage interface based on type
 * @param type Storage type
 * @returns Storage interface or null if unavailable
 */
function getStorage(type: StorageType): Storage | null {
  if (type === StorageType.MEMORY) {
    // Return an object that mimics the Storage interface but uses memory
    return {
      getItem: (key: string): string | null => {
        return key in memoryStorage ? memoryStorage[key] : null;
      },
      setItem: (key: string, value: string): void => {
        memoryStorage[key] = value;
      },
      removeItem: (key: string): void => {
        delete memoryStorage[key];
      },
      clear: (): void => {
        Object.keys(memoryStorage).forEach(key => {
          delete memoryStorage[key];
        });
      },
      key: (index: number): string | null => {
        return Object.keys(memoryStorage)[index] || null;
      },
      length: Object.keys(memoryStorage).length,
    } as Storage;
  }

  // Check if the requested storage is available
  if (!isStorageAvailable(type)) {
    logger.warn(`${type} not available, falling back to memory storage`);
    return getStorage(StorageType.MEMORY);
  }

  // Return the appropriate storage
  return type === StorageType.LOCAL ? localStorage : sessionStorage;
}

/**
 * Format a key with the prefix
 * @param key Key to format
 * @param prefix Prefix to use
 * @returns Formatted key
 */
function formatKey(key: string, prefix = ''): string {
  return prefix + key;
}

/**
 * Store a value in storage
 * @param key Key to store under
 * @param value Value to store
 * @param options Storage options
 * @returns True if successful
 */
export function setItem(
  key: string,
  value: string,
  options: Partial<StorageOptions> = {},
): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const storage = getStorage(opts.type);

  if (!storage) {
    logger.error('Failed to get storage');
    return false;
  }

  try {
    // Format the key
    const formattedKey = formatKey(key, opts.prefix);

    // Convert the value to a string
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

    // Store the value
    storage.setItem(formattedKey, valueStr);
    return true;
  } catch (e) {
    logger.error(`Failed to set item ${key}:`, e);
    return false;
  }
}

/**
 * Retrieve a value from storage
 * @param key Key to retrieve
 * @param options Storage options
 * @returns Retrieved value or null
 */
export function getItem<T = unknown>(key: string, options: Partial<StorageOptions> = {}): T | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const storage = getStorage(opts.type);

  if (!storage) {
    logger.error('Failed to get storage');
    return null;
  }

  try {
    // Format the key
    const formattedKey = formatKey(key, opts.prefix);

    // Get the value
    const value = storage.getItem(formattedKey);

    if (value === null) {
      return null;
    }

    // Try to parse as JSON
    try {
      return JSON.parse(value) as T;
    } catch {
      // Return as is if not valid JSON
      return value as unknown as T;
    }
  } catch (e) {
    logger.error(`Failed to get item ${key}:`, e);
    return null;
  }
}

/**
 * Remove an item from storage
 * @param key Key to remove
 * @param options Storage options
 * @returns True if successful
 */
export function removeItem(key: string, options: Partial<StorageOptions> = {}): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const storage = getStorage(opts.type);

  if (!storage) {
    logger.error('Failed to get storage');
    return false;
  }

  try {
    // Format the key
    const formattedKey = formatKey(key, opts.prefix);

    // Remove the item
    storage.removeItem(formattedKey);
    return true;
  } catch (e) {
    logger.error(`Failed to remove item ${key}:`, e);
    return false;
  }
}

/**
 * Clear all items with a specific prefix
 * @param options Storage options
 * @returns True if successful
 */
export function clearItems(options: Partial<StorageOptions> = {}): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const storage = getStorage(opts.type);

  if (!storage) {
    logger.error('Failed to get storage');
    return false;
  }

  if (opts.type === StorageType.MEMORY) {
    // For memory storage, just clear all keys with the prefix
    Object.keys(memoryStorage).forEach(key => {
      if (key.startsWith(opts.prefix || '')) {
        delete memoryStorage[key];
      }
    });
    return true;
  }

  try {
    // For localStorage and sessionStorage, iterate all keys
    const keysToRemove: string[] = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(opts.prefix || '')) {
        keysToRemove.push(key);
      }
    }

    // Remove all matching keys
    keysToRemove.forEach(key => {
      storage.removeItem(key);
    });

    return true;
  } catch (e) {
    logger.error('Failed to clear items:', e);
    return false;
  }
}

/**
 * Get all items with a specific prefix
 * @param options Storage options
 * @returns Object with all items
 */
export function getAllItems<T = unknown>(options: Partial<StorageOptions> = {}): Record<string, T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const storage = getStorage(opts.type);
  const result: Record<string, T> = {};

  if (!storage) {
    logger.error('Failed to get storage');
    return result;
  }

  try {
    // Get all keys
    const allKeys: string[] = [];

    if (opts.type === StorageType.MEMORY) {
      // For memory storage, use Object.keys
      allKeys.push(...Object.keys(memoryStorage));
    } else {
      // For localStorage and sessionStorage, iterate
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          allKeys.push(key);
        }
      }
    }

    // Filter keys by prefix
    const prefix = opts.prefix || '';
    const filteredKeys = allKeys.filter(key => key.startsWith(prefix));

    // Get values for all keys
    filteredKeys.forEach(key => {
      // Remove the prefix for the result object
      const keyWithoutPrefix = key.substring(prefix.length);

      // Get and parse the value
      const value = storage.getItem(key);
      if (value !== null) {
        try {
          result[keyWithoutPrefix] = JSON.parse(value) as T;
        } catch {
          result[keyWithoutPrefix] = value as unknown as T;
        }
      }
    });

    return result;
  } catch (e) {
    logger.error('Failed to get all items:', e);
    return result;
  }
}

/**
 * Check if a key exists in storage
 * @param key Key to check
 * @param options Storage options
 * @returns True if the key exists
 */
export function hasItem(key: string, options: Partial<StorageOptions> = {}): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const storage = getStorage(opts.type);

  if (!storage) {
    return false;
  }

  // Format the key
  const formattedKey = formatKey(key, opts.prefix);

  // Check if the key exists
  const value = storage.getItem(formattedKey);
  return value !== null;
}

/**
 * Create a namespaced storage API
 * @param namespace Namespace prefix
 * @param options Storage options
 * @returns Namespaced storage API
 */
export function createNamespace(
  namespace: string,
  options: Partial<StorageOptions> = {},
): {
  get: <T>(key: string) => T | null;
  set: (key: string, value: string) => boolean;
  remove: (key: string) => boolean;
  clear: () => boolean;
  getAll: <T>() => Record<string, T>;
  has: (key: string) => boolean;
} {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
    prefix: (options.prefix || DEFAULT_OPTIONS.prefix) + namespace + '_',
  };

  return {
    get: <T>(key: string) => getItem<T>(key, opts),
    set: (key: string, value: string) => setItem(key, value, opts),
    remove: (key: string) => removeItem(key, opts),
    clear: () => clearItems(opts),
    getAll: <T>() => getAllItems<T>(opts),
    has: (key: string) => hasItem(key, opts),
  };
}
