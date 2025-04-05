/**
 * Test Utilities for React Query Tests
 * 
 * Provides helper functions for testing React Query hooks
 */

// This function can be used to wait for the next tick in the event loop
// which is useful for ensuring React Query has time to process state updates
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

// Helper to wait for a specific condition to be true
export const waitForCondition = async (
  condition: () => boolean, 
  timeout = 1000, 
  interval = 50
): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
};

// Helper to create a mock API response
export const createMockApiResponse = <T>(data: T, status = 200) => ({
  success: true,
  status,
  data,
});
