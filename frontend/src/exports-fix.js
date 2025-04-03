/**
 * This file defines global 'module' and 'exports' variables to fix
 * the "ReferenceError: Can't find variable: exports" error.
 * 
 * It is included globally through the Next.js webpack configuration.
 */

// Skip in server environment (Node.js already has these)
if (typeof window !== 'undefined') {
  if (typeof window.exports === 'undefined') {
    window.exports = {};
  }
  
  if (typeof window.module === 'undefined') {
    window.module = { exports: {} };
  }
} 