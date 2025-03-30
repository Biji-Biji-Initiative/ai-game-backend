# Test Standardization Guide

This document outlines the standard testing approach for our codebase after the migration to ES Modules.

## Current Status

We've made significant progress in standardizing our test approach:

1. **Configuration**: Created proper Jest configuration with ESM support
2. **Common Issues Fixed**: 
   - Fixed Chai/Jest assertion syntax mismatches 
   - Corrected import paths
   - Added missing file extensions (.js)
   - Fixed StandardErrorCodes imports
   - Added common test helpers

3. **Working Tests**: Some tests are now passing, particularly in the `unit/ai/ports` category

4. **Remaining Issues**:
   - Module resolution issues with '@/' alias
   - Dynamic imports and try/catch blocks
   - Missing test helper files
   - Duplicate jest imports

## Testing Stack

Our standard testing stack consists of:

- **Jest**: Test runner and framework
- **Chai**: Assertion library for more readable tests
- **Sinon**: Mocking and stubbing library

This approach combines Jest's modern test infrastructure with Chai's expressive assertions.

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests by category
npm run test:unit       # Unit tests
npm run test:domain     # Domain logic tests
npm run test:integration # Integration tests
npm run test:external   # External service tests
npm run test:e2e        # End-to-end tests
```

### Advanced Options

```bash
# Watch mode
npm run test:watch

# Skip specific test categories
npm run test:skip-openai    # Skip tests requiring OpenAI
npm run test:skip-supabase  # Skip tests requiring Supabase

# Run specific test files
NODE_OPTIONS=--experimental-vm-modules npm run test:unit -- --testMatch='**/tests/unit/ai/ports/aistate-manager.test.js'
```

## Writing Tests

### Basic Test Structure

```javascript
// Import Jest for mocking capabilities
import { jest } from '@jest/globals';
// Import Chai for assertions
import { expect } from 'chai';
// Import the component to test
import MyComponent from '@/path/to/component.js';

describe('MyComponent', () => {
  // Setup before tests
  beforeEach(() => {
    // Set up test environment
  });
  
  // Cleanup after tests
  afterEach(() => {
    // Clean up after tests
    jest.clearAllMocks();
  });
  
  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = MyComponent.doSomething(input);
    
    // Assert
    expect(result).to.equal('expected output');
  });
});
```

### Mocking Dependencies

**Method 1: Using constructor injection**

```javascript
// This is the preferred approach for unit/domain tests
it('should handle dependency properly', () => {
  // Create mocks
  const dependencyMock = {
    method: sinon.stub().resolves('mocked result')
  };
  
  // Inject mocks via constructor
  const component = new MyComponent({
    dependency: dependencyMock
  });
  
  // Use the component with mocked dependencies
  const result = await component.doSomething();
  
  // Verify interactions with dependencies
  expect(dependencyMock.method.called).to.be.true;
});
```

**Method 2: Using Jest mocking (for harder to inject dependencies)**

```javascript
import { jest } from '@jest/globals';

// Mock an entire module
jest.mock('@/core/infra/logging/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Mock just one import from a module
import * as utils from '@/utils.js';
jest.spyOn(utils, 'helperFunction').mockReturnValue('mocked value');
```

## Best Practices

1. **Use appropriate test category**:
   - **Unit tests**: Test isolated components with mocked dependencies
   - **Domain tests**: Test business logic with in-memory repositories
   - **Integration tests**: Test interactions between multiple components
   - **External tests**: Test integration with external services (OpenAI, Supabase)
   - **E2E tests**: Test full workflows through the API

2. **Follow the AAA pattern**:
   - **Arrange**: Set up test data and dependencies
   - **Act**: Execute the functionality being tested
   - **Assert**: Verify the expected outcomes

3. **Prefer dependency injection over mocking imports**:
   - Inject dependencies through constructors when possible
   - Use Jest mocking as a last resort for hard-to-inject dependencies

4. **Use proper assertions**:
   - Use `expect(x).to.equal(y)` for exact equality
   - Use `expect(x).to.deep.equal(y)` for object/array comparisons
   - Use `expect(x).to.be.true` for boolean checks
   - Use `expect(fn).to.throw()` for error checking

## Import Paths

Use the `@/` alias to import from the `src` directory:

```javascript
// Import from src directory
import { something } from '@/core/domain/service.js';

// Import local test helpers
import { testHelper } from '../../helpers/testHelper.js';
```

## Troubleshooting Common Issues

### ESM Import Issues

If you encounter issues with ESM imports, make sure:

1. All imports include the `.js` extension for local files
2. The `@/` path alias is used for imports from the src directory
3. Dynamic imports use `await import()` instead of `require()`

### Jest Mocking Issues

When using Jest mocks:

1. Always import the Jest object: `import { jest } from '@jest/globals';`
2. Clear mocks after each test: `afterEach(() => jest.clearAllMocks());`
3. For module mocks, use the full path with the `@/` alias

### Test Timeout Issues

For long-running tests:

1. Increase the timeout for specific tests: `jest.setTimeout(30000);`
2. Use conditional tests for external APIs: `skipIfMissingEnv('OPENAI_API_KEY')`

### Module Resolution Issues

If you get "Could not locate module @/..." errors:

1. Check if the file exists at the expected path in the src directory
2. Make sure moduleNameMapper in jest.config.js is correctly configured
3. For tests, consider using relative paths temporarily to debug

## Converting Legacy Tests

If you need to convert legacy Mocha tests to the new standard:

1. Run the conversion script: `node scripts/convert-tests-to-jest.js`
2. Fix remaining issues with: `node scripts/fix-test-issues.js`
3. Run tests and fix any remaining issues manually

## Next Steps for Test Migration

The following steps are needed to complete the test migration:

1. **Fix Module Resolution**:
   ```javascript
   // In jest.config.js
   moduleNameMapper: {
     '^@/(.*)$': '<rootDir>/src/$1'
   }
   ```

2. **Handle Duplicate Jest Imports**:
   Review test files to ensure only one jest import exists:
   ```javascript
   import { jest } from '@jest/globals';
   ```

3. **Fix Missing Test Helpers**:
   Ensure test-helpers/setup.js is properly imported:
   ```javascript
   import { expect } from '../../../tests/test-helpers/setup.js';
   ```

4. **Convert Dynamic Imports**:
   Replace dynamic imports with static imports:
   ```javascript
   // Replace this:
   try {
     const module = await import('...');
   } catch (e) {}
   
   // With this:
   import module from '...';
   ```

5. **Update Error Code Imports**:
   Standardize error code imports:
   ```javascript
   import { ErrorCodes } from '@/core/domain/errors/ErrorCodes.js';
   const StandardErrorCodes = ErrorCodes;
   ``` 