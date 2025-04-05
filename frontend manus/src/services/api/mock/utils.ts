/**
 * Mock API Utilities
 * 
 * Helper functions for mock API implementations
 */

/**
 * Generate a random ID string
 * 
 * @param prefix Optional prefix for the ID
 * @returns A random ID string
 */
export const generateRandomId = (prefix: string = ''): string => {
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now().toString(36);
  return `${prefix}${randomPart}${timestamp}`;
};
