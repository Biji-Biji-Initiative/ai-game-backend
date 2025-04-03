import { useEffect } from 'react';

/**
 * A React hook that polyfills 'module' and 'exports' globals
 * to prevent "ReferenceError: Can't find variable: exports"
 * 
 * Use this in components that might import libraries that mix
 * CommonJS and ES modules.
 */
function useModulePolyfill() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Define polyfills for missing globals
      if (typeof window.exports === 'undefined') {
        // @ts-expect-error - We're intentionally adding this to the window object
        window.exports = {};
      }
      
      if (typeof window.module === 'undefined') {
        // @ts-expect-error - We're intentionally adding this to the window object
        window.module = { exports: {} };
      }
    }
  }, []);
}

export default useModulePolyfill; 