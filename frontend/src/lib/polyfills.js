/**
 * Global polyfills for the application
 * 
 * This provides a simple fix for the "ReferenceError: Can't find variable: exports" error
 * that occurs when mixing ES modules and CommonJS modules.
 * 
 * It also addresses the "_interop_require_default._ is not a function" error
 * by adding the missing function when needed.
 */

// Handle CommonJS/ESM compatibility issues
if (typeof window !== 'undefined') {
  // Polyfill for missing CommonJS globals
  if (typeof window.exports === 'undefined') {
    window.exports = {};
  }
  
  if (typeof window.module === 'undefined') {
    window.module = { exports: {} };
  }
  
  // Fix for interopRequireDefault
  // This adds the missing "_" function that causes the error
  if (typeof window._interop_require_default !== 'undefined') {
    if (typeof window._interop_require_default._ !== 'function') {
      window._interop_require_default._ = function(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      };
      console.debug('Fixed _interop_require_default._ function');
    }
  }
  
  // Add a global hook to monitor script execution and fix the function if needed
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      element.addEventListener('load', function() {
        // Try to fix interopRequireDefault after script loads
        if (typeof window._interop_require_default !== 'undefined' && 
            typeof window._interop_require_default._ !== 'function') {
          window._interop_require_default._ = function(obj) {
            return obj && obj.__esModule ? obj : { default: obj };
          };
        }
      });
    }
    
    return element;
  };
}

export {}; 