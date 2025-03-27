# Testing Guide for Domain-Driven Design API

This guide explains the testing approach for our Domain-Driven Design (DDD) codebase in a simple, easy-to-understand way.

## Testing Categories

Our tests are organized into several categories:

1. **Unit Tests** - Test individual components in isolation
   - Domain models
   - Domain services
   - Infrastructure adapters
   - Located in `tests/unit/`, `tests/domains/`, and `tests/infrastructure/`

2. **Integration Tests** - Test how components work together
   - Cross-domain interactions
   - Event handling
   - Located in `tests/integration/`

3. **API Tests** - Test HTTP endpoints
   - Request/response handling
   - Error handling
   - Located in `tests/api/`

4. **External Tests** - Test integration with external services
   - OpenAI
   - Supabase
   - Located in `tests/external/`

## Getting Started with Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:api
npm run test:infrastructure

# Run tests for specific domains
npm run test:domain:personality
npm run test:domain:user

# Run infrastructure tests
npm run test:infrastructure:services
```

### Writing a Simple Test

Here's a basic example of how to write a test:

```javascript
// Import test utilities
const { expect } = require('chai');
const sinon = require('sinon');

// Import the component to test
const SomeService = require('../../src/core/someDomain/services/SomeService');

describe('Some Service', () => {
  let someService;
  let dependencyMock;
  
  beforeEach(() => {
    // Setup mocks and stubs
    dependencyMock = {
      someMethod: sinon.stub().returns('mocked result')
    };
    
    // Create the component with mocked dependencies
    someService = new SomeService(dependencyMock);
  });
  
  afterEach(() => {
    // Clean up stubs after each test
    sinon.restore();
  });
  
  it('should do something specific', () => {
    // Arrange - setup test data
    const testData = { foo: 'bar' };
    
    // Act - call the method being tested
    const result = someService.doSomething(testData);
    
    // Assert - verify the expected outcome
    expect(result).to.equal('expected result');
    expect(dependencyMock.someMethod.calledOnce).to.be.true;
  });
});
```

## Testing Best Practices

1. **Test in Isolation** - Unit tests should test components in isolation with dependencies mocked
2. **Follow AAA Pattern** - Arrange, Act, Assert
3. **Mock External Dependencies** - Never make real API calls in tests
4. **Test Error Cases** - Don't just test the happy path
5. **Keep Tests Independent** - Tests shouldn't depend on other tests
6. **Use Descriptive Names** - Test names should describe what they're testing

## Testing Tools

- **Mocha**: Test runner
- **Chai**: Assertion library
- **Sinon**: Mocking and stubbing
- **Supertest**: Testing HTTP endpoints

## Example Test Types

### Domain Model Test

Tests that domain models properly encapsulate business logic and validate data.

### Domain Service Test

Tests business logic that operates on domain models.

### Infrastructure Adapter Test

Tests that adapters properly implement domain interfaces and handle external service interactions.

### Integration Test

Tests that multiple components work together correctly, especially across domain boundaries.

### API Test

Tests HTTP endpoints, request parameters, and response formats.

## Getting Help

If you need help with tests, ask any team member or refer to the test examples in each directory.