/**
 * Single entry point for Node.js preload
 * This file loads both our fixes and is referenced by NODE_OPTIONS
 */

// Use basic require without storing the returned values since we don't need them
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('./global-patch');

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('./fix-exports');

console.log('✅ All polyfills and patches loaded successfully'); 