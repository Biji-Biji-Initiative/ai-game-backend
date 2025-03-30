# Jest and ESM Test Migration Guide

This guide explains how to use the scripts we've created to migrate tests from Mocha/CommonJS to Jest/ESM.

## Quick Start

Run these commands in order:

```bash
# 1. Fix error handling in all test files (updates domain-specific errors)
node scripts/fix-error-handling.js all

# 2. Fix integration tests (hooks, imports, etc.)
node scripts/fix-integration-tests.js

# 3. Run unit tests to verify
npm run test:unit

# 4. Run integration tests to check progress
npm run test:integration
```

## Available Scripts

We've created several scripts to automate the migration process:

### 1. Error Handling Fixes (`fix-error-handling.js`)

This script updates generic error handling to use domain-specific errors:

```bash
# Fix a specific domain (e.g., user, challenge, etc.)
node scripts/fix-error-handling.js user

# Fix all domains
node scripts/fix-error-handling.js all
```

What it does:
- Replaces generic `Error` with domain-specific errors
- Adds proper imports for error classes
- Updates `expect().to.throw()` assertions
- Fixes `catch` blocks to catch specific errors
- Updates `StandardErrorCodes` references to `DomainErrorCodes`

### 2. Integration Test Fixes (`fix-integration-tests.js`)

This script fixes common issues in integration tests:

```bash
node scripts/fix-integration-tests.js
```

What it does:
- Converts Mocha hooks to Jest equivalents (`before` → `beforeAll`)
- Fixes import paths for `setup.js`
- Adds missing `.js` extensions to ESM imports
- Identifies potential duplicate class declarations
- Adds missing Jest imports

## Additional Resources

We've created several support files to help with the migration:

### 1. Jest Integration Setup (`tests/integration/jest.setup.js`)

A shared setup file for integration tests that provides:
- Common test constants
- Mock repositories for testing
- Mock OpenAI service
- Test helper functions
- Validation helpers
- Container helper for dependency injection

### 2. Migration Documentation (`README-TEST-MIGRATION.md`)

Comprehensive documentation covering:
- Migration progress
- Common challenges
- Migration strategy
- Remaining tasks
- Helpful commands

## Common Issues and Solutions

### 1. Module Import Path Issues

**Problem:** Missing `.js` extensions or incorrect paths
**Solution:** The fix-integration-tests.js script adds missing extensions, but you may need to manually check some paths.

### 2. Duplicate Class Declarations

**Problem:** The same class is declared in multiple test files
**Solution:** Move these classes to a shared helper file and import them instead.

### 3. Dependency Injection Issues

**Problem:** Tests using older DI approaches or proxyquire
**Solution:** Update to constructor-based DI using the `createTestContainer` helper.

### 4. Environment Variables

**Problem:** Missing environment variables for external services
**Solution:** Create a `.env.test` file and use `jest-environment-variables` to load it.

### 5. Error Variable in Catch Blocks

**Problem:** After using domain-specific errors, the error variable is lost
**Solution:** Update catch blocks to use the error parameter name:

```javascript
// INCORRECT:
try {
  // Code that throws
} catch (ChallengeError) {
  expect(error.message).to.include('expected text');
}

// CORRECT:
try {
  // Code that throws
} catch (ChallengeError) {
  expect(ChallengeError.message).to.include('expected text');
}
```

## Testing Strategy

1. **Fix from inside out**: Start with unit tests, then domain, integration, and finally E2E tests
2. **Run specific tests**: Use `--testMatch` to target specific test files
3. **Fix one domain at a time**: Complete one domain before moving to the next
4. **Document patterns**: When you find a fix, add it to the documentation

## Verification Checklist

After running the scripts, verify your progress:

- [ ] Unit tests pass (`npm run test:unit`)
- [ ] Domain tests pass (`npm run test:domain`)
- [ ] Integration tests pass (`npm run test:integration`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] No more references to `StandardErrorCodes`
- [ ] No more generic `Error` throws in tests
- [ ] All imports have proper `.js` extensions
- [ ] No duplicate class declarations
- [ ] All hooks converted from Mocha to Jest style

## Need Help?

If you encounter issues not covered by the scripts:

1. Check the `README-TEST-MIGRATION.md` documentation
2. Look at already-fixed tests for patterns
3. Add your solution to this guide when found 