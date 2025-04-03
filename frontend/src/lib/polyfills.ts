/**
 * Global polyfills for the application
 */

// Handle CommonJS/ESM compatibility issues
// Define a simplified declaration for window extensions
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    exports?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    module?: any;
  }
}

// Run this immediately when imported
if (typeof window !== 'undefined') {
  // Polyfill for missing CommonJS globals
  // @ts-expect-error - Intentionally adding this to window
  if (!window.exports) window.exports = {};
  
  // @ts-expect-error - Intentionally adding this to window
  if (!window.module) window.module = { exports: {} };
}

export {}; 