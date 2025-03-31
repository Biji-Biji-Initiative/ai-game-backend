# ES Modules Migration Guide

This document outlines our strategy for migrating from CommonJS to ES Modules.

## Overview

Our codebase currently uses CommonJS modules (`require`/`module.exports`), but we're transitioning to use ES Modules (`import`/`export`) which is the modern JavaScript standard and offers better tree-shaking, static analysis, and future compatibility.

## Why Migrate?

1. **Performance**: ES Modules support better tree-shaking, which can reduce bundle sizes.
2. **Static Analysis**: Imports are statically analyzable, which helps tools understand dependencies.
3. **Future Compatibility**: The JavaScript ecosystem is moving toward ES Modules as the standard.
4. **Better Dev Experience**: Modern IDEs and tools work better with ES Modules.
5. **Compatibility with ESLint v9**: The new ESLint version prefers ES Modules.

## Migration Strategy

Our migration will be incremental to minimize disruption:

### Phase 1: Analysis (Current)

- Use the `scripts/utils/esm-migration-plan.js analyze` script to identify CommonJS usage.
- Set up dual configuration for ESLint to support both module systems during transition.
- Create parallel ESM versions of key files as `.mjs` to test compatibility.

### Phase 2: Gradual Migration 

1. **Start with Leaf Nodes**: Convert files with fewer dependencies first.
2. **Migrate Core Utilities**: Convert utility functions that are widely used.
3. **Update Application Entry Points**: Modify main server and application files.

### Phase 3: Testing and Stabilization

- Run extensive tests to ensure compatibility.
- Fix any issues that arise during the migration.
- Update documentation and developer guides.

## Migration Steps for Individual Files

To migrate a file from CommonJS to ES Modules:

1. Use the migration tool: `npm run migrate:esm:file path/to/file.js`
2. Review the changes in the generated `.mjs` file.
3. Test the changes to ensure they work.
4. Replace the original file with the migrated version.

### Manual Migration Steps

If you prefer to migrate manually, follow these steps:

1. **Update imports**: Convert `require()` to `import` statements:

   ```javascript
   // Before (CommonJS)
   const fs = require('fs');
   const { join } = require('path');
   
   // After (ES Modules)
   import fs from 'fs';
   import { join } from 'path';
   ```

2. **Update exports**: Convert `module.exports` to `export` statements:

   ```javascript
   // Before (CommonJS)
   module.exports = myFunction;
   // or
   module.exports = { myFunction, anotherFunction };
   
   // After (ES Modules)
   export default myFunction;
   // or
   export { myFunction, anotherFunction };
   ```

3. **Add file extensions to imports**:

   ```javascript
   // ES Modules require file extensions for local imports
   import { myFunction } from './utils.js';
   ```

4. **Handle dynamic imports**: For dynamic imports, use the async import() function:

   ```javascript
   // Before (CommonJS)
   const dynamicModule = require(`./plugins/${pluginName}`);
   
   // After (ES Modules)
   const dynamicModule = await import(`./plugins/${pluginName}.js`);
   ```

5. **Special values**: Handle CommonJS-specific values:

   ```javascript
   // Before (CommonJS)
   const filename = __filename;
   const dirname = __dirname;
   
   // After (ES Modules)
   import { fileURLToPath } from 'url';
   import { dirname } from 'path';
   
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = dirname(__filename);
   ```

## Common Issues and Fixes

### Missing file extensions

ES Modules require file extensions in import paths for local files:

```javascript
// Incorrect
import { myUtil } from './utils';

// Correct
import { myUtil } from './utils.js';
```

### __dirname and __filename

These globals don't exist in ES Modules. Replace with:

```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### Dynamic imports

Dynamic imports in ES Modules are always asynchronous:

```javascript
// Change this:
const module = require(`./modules/${name}`);

// To this:
const module = await import(`./modules/${name}.js`);
```

### Import JSON files

To import JSON files in ES Modules:

```javascript
import config from './config.json' assert { type: 'json' };
```

Or:

```javascript
import { readFile } from 'fs/promises';
const config = JSON.parse(
  await readFile(new URL('./config.json', import.meta.url))
);
```

## Progress Tracking

Our migration process is tracked in the `.esm-migration.json` file, which shows:

- Total files in the codebase
- Files still using CommonJS
- Files using ES Modules
- Files that have been migrated

## Dependency Compatibility

Most of our dependencies support ES Modules, but a few may require special handling:

1. **Express**: Fully supports ES Modules
2. **Supabase**: Fully supports ES Modules
3. **Testing Frameworks**: May require additional configuration

## References

- [Node.js ES Modules Documentation](https://nodejs.org/api/esm.html)
- [MDN Import Statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)
- [MDN Export Statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export) 