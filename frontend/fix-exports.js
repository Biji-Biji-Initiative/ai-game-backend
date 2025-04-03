/**
 * This script is intended to be loaded before any application code
 * to fix the "ReferenceError: Can't find variable: exports" error.
 * 
 * Usage: NODE_OPTIONS='--require ./fix-exports.js' npm run dev
 */

console.log('✅ Installing global exports and module polyfills');

// Fix for Next.js interop require default issue
try {
  // Check if we're in Node.js environment
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    const path = require('path');
    const fs = require('fs');
    
    // Patch Next.js's interopRequireDefault if needed
    const nextRuntimePath = path.resolve('./node_modules/next/dist/compiled/@babel/runtime/helpers/interopRequireDefault.js');
    
    if (fs.existsSync(nextRuntimePath)) {
      const content = fs.readFileSync(nextRuntimePath, 'utf8');
      
      // Only apply patch if it hasn't been applied yet
      if (!content.includes('// PATCHED')) {
        console.log('📝 Patching Next.js interopRequireDefault helper...');
        
        // Make a backup
        fs.writeFileSync(`${nextRuntimePath}.backup`, content, 'utf8');
        
        // Create a patched version
        const patchedContent = `// PATCHED
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}
_interopRequireDefault._ = function(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
};
module.exports = _interopRequireDefault;
`;
        
        fs.writeFileSync(nextRuntimePath, patchedContent, 'utf8');
        console.log('✅ Successfully patched interopRequireDefault helper');
      }
    }
  }
} catch (err) {
  console.error('❌ Error applying interopRequireDefault patch:', err);
}

// Only apply in browser environment
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'exports', {
    configurable: true,
    writable: true,
    value: {},
  });

  Object.defineProperty(window, 'module', {
    configurable: true,
    writable: true,
    value: { exports: {} },
  });
} 