/**
 * Utility functions for mock API services
 */

/**
 * Simulates a network delay with a random duration within the specified range
 * @param minMs Minimum delay in milliseconds
 * @param maxMs Maximum delay in milliseconds
 * @returns A promise that resolves after the delay
 */
export function mockDelay(minMs = 200, maxMs = 1000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Simulates a network error with a specified probability
 * @param errorProbability Probability of error (0-1)
 * @param errorMessage Custom error message
 * @throws Error if the random value is below the error probability
 */
export function mockError(errorProbability = 0.05, errorMessage = 'Network error'): void {
  if (Math.random() < errorProbability) {
    throw new Error(errorMessage);
  }
}

/**
 * Generates a random ID string
 * @param prefix Optional prefix for the ID
 * @returns A random ID string
 */
export function generateMockId(prefix = ''): string {
  const randomPart = Math.random().toString(36).substr(2, 9);
  return `${prefix}${randomPart}_${Date.now()}`;
}
