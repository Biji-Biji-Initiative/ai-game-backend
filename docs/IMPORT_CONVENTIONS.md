# Import Path Conventions

## Overview

To improve code consistency, readability, and maintainability, this project follows standardized import path conventions. These conventions are enforced by ESLint rules and should be followed for all new code.

## Rules

### 1. Use Absolute Imports from src/

Always use absolute paths that start from the `src/` directory instead of chained relative paths with multiple `../` operators.

#### Preferred (✅):
```javascript
// Importing from any file in the project
const { supabaseClient } = require('src/core/infra/db/supabaseClient');
const logger = require('src/core/infra/logging/logger');
```

#### Avoid (❌):
```javascript
// Deep relative paths are hard to maintain
const { supabaseClient } = require('../../../core/infra/db/supabaseClient');
const logger = require('../../../../core/infra/logging/logger');
```

### 2. Use Relative Imports Only for Files in the Same Directory or Direct Subdirectories

Relative imports should only be used when:
- Importing a file from the same directory
- Importing a file from a direct child subdirectory

#### Preferred (✅):
```javascript
// Same directory
const { someUtil } = require('./utils');
// Direct subdirectory
const SomeModel = require('./models/SomeModel');
```

### 3. Consistent Import Order

Organize imports in the following order:
1. Node.js built-in modules
2. External dependencies/packages
3. Project absolute imports (from src/)
4. Relative imports

## Benefits

Following these conventions provides several advantages:
- **Improved readability**: Clearly indicates where imports come from
- **Easier refactoring**: Files can be moved without breaking import paths
- **Better discoverability**: Absolute paths make it easier to understand the project structure
- **Reduced errors**: Avoids complex relative path chains that can introduce errors

## Implementation

These conventions are enforced by ESLint. To check your code, run:

```bash
npm run lint
```

To automatically fix issues where possible:

```bash
npm run lint:fix
``` 