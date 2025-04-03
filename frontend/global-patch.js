/**
 * Global patch to fix the "_interop_require_default._ is not a function" error
 * 
 * This script is loaded via NODE_OPTIONS='--require ./global-patch.js'
 * and runs at the very beginning of the Node.js process.
 */

// Add the missing function to _interopRequireDefault if it exists
function patchInteropRequireDefault() {
  try {
    // First check if it exists in the global scope
    if (typeof global._interopRequireDefault === 'function' && 
        !global._interopRequireDefault._) {
      console.log('✅ Adding missing _._() function to global._interopRequireDefault');
      global._interopRequireDefault._ = function(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      };
    }
  } catch (e) {
    // Ignore errors
  }
}

// Monkey-patch the require function to add our fix to any module
// that defines _interopRequireDefault
const originalRequire = module.require;
module.require = function(path) {
  const exports = originalRequire.apply(this, arguments);
  
  // Check if this module exports _interopRequireDefault
  if (exports && typeof exports._interopRequireDefault === 'function' && 
      !exports._interopRequireDefault._) {
    console.log(`✅ Adding missing _._() function to ${path}`);
    exports._interopRequireDefault._ = function(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    };
  }
  
  return exports;
};

// Apply the patch immediately
patchInteropRequireDefault();

// Set up a global hook to apply our patch when _interopRequireDefault is defined
Object.defineProperty(global, '_interopRequireDefault', {
  set: function(v) {
    // When _interopRequireDefault is set, add the missing function if needed
    if (typeof v === 'function' && !v._) {
      v._ = function(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      };
    }
    this._innerInteropRequireDefault = v;
  },
  get: function() {
    return this._innerInteropRequireDefault;
  },
  configurable: true
});

// Also export a function to be used elsewhere
module.exports = {
  patchInteropRequireDefault
}; 