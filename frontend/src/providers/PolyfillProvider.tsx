'use client';

import React, { useEffect } from 'react';

/**
 * Provides polyfills for CommonJS/ESM compatibility within the React tree
 * This helps avoid Fast Refresh full reloads by keeping the polyfills within the React component tree
 */
export function PolyfillProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Polyfill for missing CommonJS globals
    if (typeof window !== 'undefined') {
      // Set up exports if needed
      if (typeof window.exports === 'undefined') {
        Object.defineProperty(window, 'exports', {
          configurable: true,
          writable: true,
          value: {}
        });
      }
      
      // Set up module if needed
      if (typeof window.module === 'undefined') {
        Object.defineProperty(window, 'module', {
          configurable: true,
          writable: true,
          value: { exports: {} }
        });
      }
      
      // Fix for interopRequireDefault
      if (typeof window._interop_require_default !== 'undefined') {
        if (typeof window._interop_require_default._ !== 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          window._interop_require_default._ = function(obj: unknown): { default: unknown } {
            return obj && (obj as { __esModule?: boolean }).__esModule 
              ? obj as { default: unknown } 
              : { default: obj };
          };
        }
      }
    }
  }, []);

  return <>{children}</>;
}

// For TypeScript support, extend the Window interface
declare global {
  // These already exist in other files, so the linter is warning about duplicates
  // Using `interface Window` directly would cause errors so we'll use module augmentation instead
}

export default PolyfillProvider; 