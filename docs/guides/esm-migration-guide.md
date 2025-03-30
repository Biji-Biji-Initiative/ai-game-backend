# ES Module Migration Guide

This document provides a comprehensive guide for migrating from CommonJS to ES Modules (ESM) in Node.js applications.

## Overview

ES Modules are the official standard module system for JavaScript, offering several advantages over the legacy CommonJS system:

1. **Modern JavaScript:** ES Modules are the standard module system in modern JavaScript.
2. **Better Developer Experience:** Features like static analysis, tree shaking, and better IDE support.
3. **Top-level await:** ES Modules support top-level await, allowing for cleaner async code.
4. **Code Consistency:** Aligns your codebase with current best practices.

## Migration Strategy

We recommend a phased, incremental approach to minimize disruption:

### Phase 1: Analysis and Setup

1. **Analyze the codebase** to identify CommonJS vs. ES Modules usage
2. **Set up ESLint configuration** that supports both module systems during transition
3. **Create migration tools and processes**
4. **Migrate a sample file** to verify the approach

### Phase 2: Incremental Migration

1. **Start with utility files** that have few dependencies
2. **Move to core services** after utilities are converted
3. **Update entry points last**
4. **Add new files as ES Modules** by default

### Phase 3: Testing and Finalization

1. **Test thoroughly** throughout the migration
2. **Update documentation**
3. **Finalize configuration**

## Key Differences Between CommonJS and ES Modules

| Feature | CommonJS | ES Modules |
|---------|----------|------------|
| Import Syntax | `require()` | `import` |
| Export Syntax | `module.exports` | `export` / `export default` |
| File Extensions | `.js` | `.js` (with `type: "module"` in package.json) or `.mjs` |
| Hoisting | Imports are hoisted | Imports are hoisted |
| Loading | Synchronous | Asynchronous |
| Import Path Extensions | Optional | Required for local files |
| Global Variables | `__dirname`, `__filename` | Not available (use `import.meta.url`) |
| Top-level await | Not supported | Supported |

## Common Migration Tasks

### 1. Convert Imports and Exports

#### CommonJS:
```javascript
// Importing
const { foo, bar } = require('./module');
const express = require('express');

// Exporting
module.exports = { baz, qux };
// or
module.exports = function() { /* ... */ };
```

#### ES Modules:
```javascript
// Importing
import { foo, bar } from './module.js';
import express from 'express';

// Exporting
export { baz, qux };
// or
export default function() { /* ... */ };
```

### 2. Add File Extensions

ES Modules require file extensions in import paths for local files:

```javascript
// CommonJS (works)
const helpers = require('./utils/helpers');

// ES Modules (correct)
import helpers from './utils/helpers.js';

// ES Modules (incorrect - will fail)
import helpers from './utils/helpers';
```

### 3. Replace __dirname and __filename

The CommonJS globals `__dirname` and `__filename` don't exist in ES Modules:

```javascript
// ES Modules replacement
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### 4. Update Dynamic Imports

Dynamic `require()` needs to be replaced with dynamic `import()`:

```javascript
// CommonJS
const module = require(dynamicPath);

// ES Modules (returns a promise)
const modulePromise = import(dynamicPath);
const module = (await modulePromise).default; // If it's a default export
```

### 5. Update package.json

Add `"type": "module"` to your package.json:

```json
{
  "name": "your-project",
  "version": "1.0.0",
  "type": "module",
  // ... other fields
}
```

## Automated Migration Tools

We've created several tools to assist with migration:

### Basic Import/Export Conversion

Our basic conversion script:

```bash
node scripts/convert-to-esm.js <file-or-directory>
```

### Using cjstoesm for Complex Cases

The `cjstoesm` package handles complex cases better:

```bash
npx cjstoesm <file-or-directory>
```

### Using JSCodeshift for AST-based Transformations

For more robust transformations:

```bash
npx jscodeshift -t scripts/jscodeshift-transform.js <file-or-directory>
```

## Common Issues and Solutions

### 1. "ERR_REQUIRE_ESM" Error

**Problem**: A CommonJS module is trying to require an ES Module.

**Solution**: Convert the requiring file to ES Modules or use dynamic import:

```javascript
// CommonJS file that needs to import an ES Module
const importESM = async () => {
  const esm = await import('./esmodule.js');
  return esm.default; // or use named exports
};
```

### 2. "ERR_MODULE_NOT_FOUND" Error

**Problem**: Missing .js extension or incorrect path.

**Solution**: Add the file extension:

```javascript
import { something } from './module.js';
```

### 3. Circular Dependencies

**Problem**: ES Modules handle circular dependencies differently than CommonJS.

**Solution**:
1. Refactor to remove the circular dependency (preferred)
2. Use dynamic imports as a workaround

### 4. Testing Framework Compatibility

**Problem**: Some testing frameworks may not fully support ES Modules.

**Solution**:
- For Mocha: Use the `--require esm` flag
- For Jest: Configure the `transform` and `moduleFileExtensions` settings

## Testing Strategy

1. Use `npx mocha tests/path/to/test.js` to run individual tests first
2. Look for common errors related to ESM
3. Update test runners and configurations as needed
4. Consider running tests in both CommonJS and ES Modules modes during transition

## Performance Considerations

1. **Build tools**: Update Webpack, Rollup, or other build tools to work with ES Modules
2. **Tree shaking**: ES Modules enable better tree shaking for smaller bundles
3. **Import/export optimization**: Import only what you need from a module

## Resources

- [Node.js Documentation on ES Modules](https://nodejs.org/api/esm.html)
- [ES Modules in Node.js](https://blog.logrocket.com/es-modules-in-node-js-12-from-experimental-to-release/)
- [MDN JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Rollup.js - ES Module Bundler](https://rollupjs.org/) 