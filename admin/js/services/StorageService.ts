/**
 * Storage Service
 * Provides an abstraction layer for different storage mechanisms
 */

/**
 * Storage Service interface
 */
export interface StorageService {
  /**
   * Gets a value from storage
   * @param key The key to get
   * @param defaultValue Default value if not found
   * @returns The stored value or default
   */
  get<T>(key: string, defaultValue?: T): T | null;

  /**
   * Sets a value in storage
   * @param key The key to set
   * @param value The value to store
   */
  set<T>(key: string, value: T): void;

  /**
   * Removes a value from storage
   * @param key The key to remove
   */
  remove(key: string): void;

  /**
   * Clears all values from storage
   */
  clear(): void;

  /**
   * Checks if a key exists in storage
   * @param key The key to check
   * @returns True if the key exists
   */
  has(key: string): boolean;

  /**
   * Gets all keys in storage
   * @returns Array of keys
   */
  keys(): string[];
}

/**
 * Local Storage Service
 * Implements StorageService interface using localStorage
 */
export class LocalStorageService implements StorageService {
  /**
   * Gets a value from localStorage
   * @param key The key to get
   * @param defaultValue Default value if not found
   * @returns The stored value or default
   */
  get<T>(key: string, defaultValue: T | null = null): T | null {
    try {
      const value = localStorage.getItem(key);
      if (value === null) {
        return defaultValue;
      }
      return JSON.parse(value) as T;
    } catch (e) {
      console.error(`Error getting value for key ${key}:`, e);
      return defaultValue;
    }
  }

  /**
   * Sets a value in localStorage
   * @param key The key to set
   * @param value The value to store
   */
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error setting value for key ${key}:`, e);
    }
  }

  /**
   * Removes a value from localStorage
   * @param key The key to remove
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing key ${key}:`, e);
    }
  }

  /**
   * Clears all values from localStorage
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('Error clearing localStorage:', e);
    }
  }

  /**
   * Checks if a key exists in localStorage
   * @param key The key to check
   * @returns True if the key exists
   */
  has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Gets all keys in localStorage
   * @returns Array of keys
   */
  keys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null) {
        keys.push(key);
      }
    }
    return keys;
  }
}

/**
 * Session Storage Service
 * Implements StorageService interface using sessionStorage
 */
export class SessionStorageService implements StorageService {
  /**
   * Gets a value from sessionStorage
   * @param key The key to get
   * @param defaultValue Default value if not found
   * @returns The stored value or default
   */
  get<T>(key: string, defaultValue: T | null = null): T | null {
    try {
      const value = sessionStorage.getItem(key);
      if (value === null) {
        return defaultValue;
      }
      return JSON.parse(value) as T;
    } catch (e) {
      console.error(`Error getting value for key ${key}:`, e);
      return defaultValue;
    }
  }

  /**
   * Sets a value in sessionStorage
   * @param key The key to set
   * @param value The value to store
   */
  set<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error setting value for key ${key}:`, e);
    }
  }

  /**
   * Removes a value from sessionStorage
   * @param key The key to remove
   */
  remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing key ${key}:`, e);
    }
  }

  /**
   * Clears all values from sessionStorage
   */
  clear(): void {
    try {
      sessionStorage.clear();
    } catch (e) {
      console.error('Error clearing sessionStorage:', e);
    }
  }

  /**
   * Checks if a key exists in sessionStorage
   * @param key The key to check
   * @returns True if the key exists
   */
  has(key: string): boolean {
    return sessionStorage.getItem(key) !== null;
  }

  /**
   * Gets all keys in sessionStorage
   * @returns Array of keys
   */
  keys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key !== null) {
        keys.push(key);
      }
    }
    return keys;
  }
}

/**
 * Memory Storage Service
 * Implements StorageService interface using an in-memory Map
 */
export class MemoryStorageService implements StorageService {
  private storage: Map<string, string> = new Map();

  /**
   * Gets a value from memory storage
   * @param key The key to get
   * @param defaultValue Default value if not found
   * @returns The stored value or default
   */
  get<T>(key: string, defaultValue: T | null = null): T | null {
    try {
      const value = this.storage.get(key);
      if (value === undefined) {
        return defaultValue;
      }
      return JSON.parse(value) as T;
    } catch (e) {
      console.error(`Error getting value for key ${key}:`, e);
      return defaultValue;
    }
  }

  /**
   * Sets a value in memory storage
   * @param key The key to set
   * @param value The value to store
   */
  set<T>(key: string, value: T): void {
    try {
      this.storage.set(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error setting value for key ${key}:`, e);
    }
  }

  /**
   * Removes a value from memory storage
   * @param key The key to remove
   */
  remove(key: string): void {
    this.storage.delete(key);
  }

  /**
   * Clears all values from memory storage
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Checks if a key exists in memory storage
   * @param key The key to check
   * @returns True if the key exists
   */
  has(key: string): boolean {
    return this.storage.has(key);
  }

  /**
   * Gets all keys in memory storage
   * @returns Array of keys
   */
  keys(): string[] {
    return Array.from(this.storage.keys());
  }
} 