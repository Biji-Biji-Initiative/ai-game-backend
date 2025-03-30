# Test Scripts Reference Guide

This document provides a quick reference for all test-related scripts created during the test suite refactoring project.

## Main Test Suite Preparation Script

### `scripts/fix-test-suite.sh`

This is the main script that addresses all test suite issues (T1-T7) and prepares the tests for execution. It:

1. Fixes import paths in test and source files
2. Fixes module alias imports (`@/core` and `@/config`)
3. Converts CommonJS to ES modules
4. Fixes ESM-related issues
5. Updates error handling to use domain-specific errors
6. Verifies and updates the Supabase schema
7. Runs a basic test to verify connectivity

Usage:
```bash
./scripts/fix-test-suite.sh
```

## Individual Fix Scripts

### Import Path Fixes

#### `scripts/fix-test-imports.js`
Fixes import paths in test files to ensure they correctly reference source files.

Usage:
```bash
node scripts/fix-test-imports.js
```

#### `scripts/fix-source-imports.js`
Fixes import paths in source files to ensure they correctly reference other source files.

Usage:
```bash
node scripts/fix-source-imports.js
```

#### `scripts/fix-src-imports.js`
Fixes module alias imports (`@/core` and `@/config`) in both source and test files, replacing them with proper relative paths for ES module compatibility.

Usage:
```bash
node scripts/fix-src-imports.js
```

### ESM Conversion

#### `scripts/fix-commonjs-to-esm.js`
Converts CommonJS `require()`/`module.exports` to ES module `import`/`export`.

Usage:
```bash
node scripts/fix-commonjs-to-esm.js
```

#### `scripts/fix-esm-test-issues.js`
Fixes common ESM-related issues in tests like missing `.js` extensions, `__dirname` usage, and dynamic imports.

Usage:
```bash
node scripts/fix-esm-test-issues.js
```

### Error Handling

#### `scripts/find-error-assertions.js`
Identifies test files with generic Error usage that need to be updated to use domain-specific errors.

Usage:
```bash
node scripts/find-error-assertions.js
```

#### `scripts/fix-error-handling.js`
Automatically fixes error handling in tests by replacing generic Error with domain-specific errors.

Usage:
```bash
node scripts/fix-error-handling.js
```

### Database Schema Verification

#### `scripts/test-supabase-schema.js`
Verifies and sets up the required Supabase schema for tests, including tables, constraints, and test data.

Usage:
```bash
node scripts/test-supabase-schema.js
```

## Debugging and Verification Scripts

### `scripts/run-tests.js`
Runs tests with properly configured environment and options.

Usage:
```bash
node scripts/run-tests.js
```

## Usage Examples

### Running All Test Preparation Steps
```bash
./scripts/fix-test-suite.sh
```

### Fixing a Specific Issue
For import paths only:
```bash
node scripts/fix-test-imports.js
node scripts/fix-source-imports.js
node scripts/fix-src-imports.js
```

For ESM conversion only:
```bash
node scripts/fix-commonjs-to-esm.js
node scripts/fix-esm-test-issues.js
```

For error handling only:
```bash
node scripts/fix-error-handling.js
```

For database schema verification only:
```bash
node scripts/test-supabase-schema.js
```

## Customizing Error Handling
To fix error handling for a specific domain, modify the glob pattern in `fix-error-handling.js`:

```javascript
// Find test files for the user domain
const testFiles = globSync('tests/domain/user/*.test.js', { cwd: projectRoot });
```

Or use the automated approach in `fix-test-suite.sh` that modifies the script for each domain:

```bash
# Modify the script to handle user domain
sed -i '' 's|tests/domain/challenge/\*.test.js|tests/domain/user/\*.test.js|g' scripts/fix-error-handling.js
node scripts/fix-error-handling.js
``` 