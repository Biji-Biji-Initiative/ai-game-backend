# ES Module Migration Guide

This document outlines the process of migrating from CommonJS (`require`/`module.exports`) to ES Modules (`import`/`export`) in our project.

## Why ES Modules?

1. **Modern JavaScript:** ES Modules are the standard module system in modern JavaScript.
2. **Better Developer Experience:** Features like static analysis, tree shaking, and better IDE support.
3. **Top-level await:** ES Modules support top-level await, allowing for cleaner async code.
4. **Code Consistency:** Aligns our codebase with current best practices.

## Migration Steps

We've created a comprehensive set of scripts to automatically handle most of the migration:

1. **Fix Import Paths:** Corrects relative paths and ensures they include `.js` extensions.
2. **Convert require() to import:** Transforms CommonJS require statements to ES Module imports.
3. **Fix Module Alias Paths:** Replaces `@/core` module alias with proper relative paths.
4. **Fix ESM-specific Issues:** Handles `__dirname`, `__filename`, and dynamic imports.

To run the full migration suite:

```bash
./scripts/fix-test-suite.sh
```

## Common Issues and Solutions

### 1. Missing .js Extensions

**Problem:**
ES Modules require file extensions in import paths for local files:

```javascript
// This works in CommonJS but fails in ESM
import { something } from '../utils/helpers';
```

**Solution:**
Always include the `.js` extension:

```javascript
// Correct for ESM
import { something } from '../utils/helpers.js';
```

Our `fix-esm-test-issues.js` script automatically adds these extensions.

### 2. No __dirname or __filename

**Problem:**
The CommonJS globals `__dirname` and `__filename` don't exist in ES Modules.

**Solution:**
Use the URL-based alternative:

```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### 3. Dynamic Imports

**Problem:**
Dynamic `require()` needs to be replaced with dynamic `import()`.

**Solution:**
Use the async import() function:

```javascript
// CommonJS
const module = require(dynamicPath);

// ES Modules (note: this returns a promise)
const module = await import(dynamicPath);
```

### 4. Module.exports vs Export

**Problem:**
CommonJS uses `module.exports` while ES Modules use `export` and `export default`.

**Solution:**
Replace:

```javascript
// CommonJS
module.exports = { foo, bar };

// ES Modules
export { foo, bar };

// Or for default exports:
// CommonJS
module.exports = someFunction;

// ES Modules
export default someFunction;
```

### 5. Package.json Configuration

Make sure your package.json has `"type": "module"` set:

```json
{
  "name": "your-project",
  "version": "1.0.0",
  "type": "module",
  ...
}
```

## Testing Strategy

1. Use `npx mocha tests/path/to/test.js` to run individual tests first.
2. Look for common errors related to ESM:
   - `ERR_REQUIRE_ESM`: A CommonJS module is trying to require an ES Module
   - `ERR_MODULE_NOT_FOUND`: Missing .js extension or incorrect path
   - `SyntaxError: Cannot use import statement outside a module`: Missing "type": "module" in package.json

## Advanced Issues

### Top-level await

ES Modules support await at the top level, but this requires Node.js v14.8.0 or later:

```javascript
// This works in ES Modules but not in CommonJS
const data = await fetchSomething();
```

### Circular Dependencies

ES Modules handle circular dependencies differently than CommonJS. If you encounter issues:

1. Refactor to remove the circular dependency (preferred)
2. Use dynamic imports as a workaround

### Node.js Compatibility

ES Modules are fully supported in Node.js 12+ but some features like top-level await require newer versions.

## Resources

- [Node.js Documentation on ES Modules](https://nodejs.org/api/esm.html)
- [ES Modules in Node.js](https://blog.logrocket.com/es-modules-in-node-js-12-from-experimental-to-release/)
- [MDN JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) 