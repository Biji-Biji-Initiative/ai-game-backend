/**
 * Common Utilities
 * 
 * General utility functions for various operations
 */

/**
 * Check if a value is defined (not undefined or null)
 * @param value Value to check
 * @returns True if value is defined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== undefined && value !== null;
}

/**
 * Check if a value is empty (undefined, null, empty string, empty array, empty object)
 * @param value Value to check
 * @returns True if value is empty
 */
export function isEmpty(value: unknown): boolean {
  if (!isDefined(value)) return true;
  
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  
  return false;
}

/**
 * Safely parse JSON without throwing
 * @param json JSON string to parse
 * @param fallback Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    return fallback;
  }
}

/**
 * Safely stringify a value to JSON without throwing
 * @param value Value to stringify
 * @param fallback Fallback string if stringify fails
 * @returns JSON string or fallback
 */
export function safeJsonStringify(value: unknown, fallback = '{}'): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return fallback;
  }
}

/**
 * Deep clone an object
 * @param obj Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Generate a unique ID
 * @param prefix Optional prefix
 * @returns Unique ID
 */
export function generateId(prefix = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format a date
 * @param date Date to format
 * @param format Format string (defaults to ISO)
 * @returns Formatted date string
 */
export function formatDate(date: Date, format = 'iso'): string {
  if (format === 'iso') {
    return date.toISOString();
  }
  
  if (format === 'readable') {
    return date.toLocaleString();
  }
  
  if (format === 'date') {
    return date.toLocaleDateString();
  }
  
  if (format === 'time') {
    return date.toLocaleTimeString();
  }
  
  return date.toString();
}

/**
 * Debounce a function
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends(...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * Throttle a function
 * @param fn Function to throttle
 * @param limit Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends(...args: unknown[]) => unknown>(
  fn: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Get a value from a nested object using dot notation path
 * @param obj Object to get value from
 * @param path Path to value using dot notation
 * @param defaultValue Default value if path doesn't exist
 * @returns Value at path or default
 */
export function getNestedValue<T>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue: T,
): T {
  const keys = path.split('.');
  
  let current: unknown = obj;
  
  for (const key of keys) {
    if (!current || typeof current !== 'object') {
      return defaultValue;
    }
    
    current = (current as Record<string, unknown>)[key];
    
    if (current === undefined) {
      return defaultValue;
    }
  }
  
  return current as T;
}

/**
 * Set a value in a nested object using dot notation path
 * @param obj Object to set value in
 * @param path Path to value using dot notation
 * @param value Value to set
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split('.');
  const lastKey = keys.pop();
  
  if (!lastKey) {
    return;
  }
  
  let current: Record<string, unknown> = obj;
  
  for (const key of keys) {
    if (!(key in current)) {
      current[key] = {};
    }
    
    if (typeof current[key] !== 'object') {
      current[key] = {};
    }
    
    current = current[key] as Record<string, unknown>;
  }
  
  current[lastKey] = value;
}

/**
 * Check if two objects are equal
 * @param a First object
 * @param b Second object
 * @returns True if objects are equal
 */
export function areObjectsEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b as object);
  
  if (keysA.length !== keysB.length) {
    return false;
  }
  
  for (const key of keysA) {
    const valA = (a as Record<string, unknown>)[key];
    const valB = (b as Record<string, unknown>)[key];
    
    if (typeof valA === 'object' && typeof valB === 'object') {
      if (!areObjectsEqual(valA, valB)) {
        return false;
      }
    } else if (valA !== valB) {
      return false;
    }
  }
  
  return true;
} 