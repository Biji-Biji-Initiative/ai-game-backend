# Test Standardization Guide

This document outlines the standard testing approach for our codebase after the migration to ES Modules.

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

## Converting Legacy Tests

If you need to convert legacy Mocha tests to the new standard:

1. Run the conversion script: `node scripts/convert-tests-to-jest.js`
2. Fix remaining issues with: `node scripts/fix-test-issues.js`
3. Run tests and fix any remaining issues manually 