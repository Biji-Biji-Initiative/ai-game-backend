/**
 * This file provides a workaround for the "ReferenceError: Can't find variable: exports" 
 * error that can occur when mixing ES modules and CommonJS modules in Next.js
 */

// Define a global exports variable if it doesn't exist
if (typeof window !== 'undefined' && typeof exports === 'undefined') {
  window.exports = {};
}

// Define a global module variable if it doesn't exist
if (typeof window !== 'undefined' && typeof module === 'undefined') {
  window.module = { exports: {} };
}

/**
 * Utility function to safely handle module exports
 */
export function ensureModuleExports() {
  if (typeof window !== 'undefined') {
    // Make sure these exist
    window.exports = window.exports || {};
    window.module = window.module || { exports: {} };
  }
}

export default {
  ensureModuleExports,
}; 