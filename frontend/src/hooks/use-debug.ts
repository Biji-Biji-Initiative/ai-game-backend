/**
 * Utility to add a debugger breakpoint when a condition is met
 * @param condition Condition to check
 * @param message Message to log before hitting the breakpoint
 */
export function debugBreakIf(condition: boolean, message: string): void {
  if (condition && process.env.NODE_ENV === 'development') {
    console.warn('BREAKPOINT:', message);
    debugger; // This will pause execution in DevTools
  }
}

/**
 * Utility to create a labeled console group for debugging
 * @param label Label for the console group
 * @param fn Function to execute within the group
 * @returns The result of the function
 */
export function debugGroup<T>(label: string, fn: () => T): T {
  if (process.env.NODE_ENV === 'development') {
    console.group(label);
    try {
      return fn();
    } finally {
      console.groupEnd();
    }
  }
  return fn();
}

/**
 * Track the number of times a function is called
 */
const counters: Record<string, number> = {};

/**
 * Count how many times a function has been called
 * @param name Name of the function or operation to count
 * @param limit Optional limit after which to break
 * @returns The current count
 */
export function countExecution(name: string, limit?: number): number {
  counters[name] = (counters[name] || 0) + 1;
  
  if (limit && counters[name] > limit && process.env.NODE_ENV === 'development') {
    console.warn(`COUNT LIMIT EXCEEDED: ${name} called ${counters[name]} times (limit: ${limit})`);
    debugger;
  }
  
  return counters[name];
} 