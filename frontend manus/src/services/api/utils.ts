/**
 * API Utility Functions
 */

/**
 * Generate a unique ID
 * This is a simple implementation for mock purposes
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Get the current timestamp in ISO format
 */
export const timestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Simulate API delay
 * @param ms Milliseconds to delay (default: random between 200-600ms)
 */
export const delay = (ms?: number): Promise<void> => {
  const delayTime = ms || Math.floor(Math.random() * 400) + 200;
  return new Promise(resolve => setTimeout(resolve, delayTime));
};

/**
 * Simulate random failure for testing error handling
 * @param failureRate Chance of failure (0-1, default: 0)
 */
export const simulateRandomFailure = (failureRate = 0): void => {
  if (Math.random() < failureRate) {
    throw new Error('Simulated random API failure');
  }
};
