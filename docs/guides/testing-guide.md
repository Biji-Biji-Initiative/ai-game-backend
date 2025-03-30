# Testing Guide

This guide covers the testing practices, strategies, and tools used in the AI Gaming Backend project. It provides instructions for writing, running, and maintaining tests.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Testing Structure](#testing-structure)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Mocking](#mocking)
- [Continuous Integration](#continuous-integration)
- [Test Coverage](#test-coverage)
- [Troubleshooting Tests](#troubleshooting-tests)

## Testing Philosophy

Our testing approach is based on the following principles:

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **Test Pyramid**: Maintain a healthy ratio of unit, integration, and end-to-end tests
3. **Test-Driven Development**: Write tests before implementing features when possible
4. **Isolation**: Tests should be independent and not rely on other tests
5. **Speed**: Tests should be fast to encourage frequent execution
6. **Reliability**: Tests should provide consistent results

## Testing Structure

Our tests are organized to mirror the project structure:

```
/tests
├── unit/                 # Unit tests
│   ├── core/             # Domain model tests
│   │   ├── user/         # User domain tests
│   │   ├── challenge/    # Challenge domain tests
│   │   └── ...           # Other domain tests
│   ├── application/      # Application service tests
│   └── infra/            # Infrastructure tests
├── integration/          # Integration tests
│   ├── api/              # API endpoint tests
│   ├── repositories/     # Repository tests
│   └── external/         # External service tests
├── e2e/                  # End-to-end tests
│   ├── workflows/        # User workflow tests
│   └── scenarios/        # Business scenario tests
└── helpers/              # Test helpers and utilities
    ├── fixtures/         # Test data fixtures
    ├── mocks/            # Mock implementations
    └── setup/            # Test setup utilities
```

## Test Types

### Unit Tests

Unit tests verify the behavior of individual functions, classes, and modules in isolation. They should:

- Be fast and independent
- Mock external dependencies
- Cover edge cases and error scenarios
- Focus on business logic

**Example Unit Test:**

```javascript
// tests/unit/core/user/user-entity.test.js
import { User } from '../../../../src/core/user/user-entity.js';
import { InvalidEmailError } from '../../../../src/core/common/errors.js';

describe('User Entity', () => {
  it('should create a valid user', () => {
    const user = User.create({
      email: 'test@example.com',
      name: 'Test User',
      password: 'securePass123'
    });
    
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
    expect(user.isActive).toBe(true);
  });
  
  it('should throw an error for invalid email', () => {
    expect(() => {
      User.create({
        email: 'invalid-email',
        name: 'Test User',
        password: 'securePass123'
      });
    }).toThrow(InvalidEmailError);
  });
});
```

### Integration Tests

Integration tests verify the interaction between system components:

- Test multiple components working together
- Use real database connections (using test database)
- Validate repository implementations
- Test API endpoints with real HTTP requests

**Example Integration Test:**

```javascript
// tests/integration/api/user-controller.test.js
import request from 'supertest';
import { app } from '../../../src/app.js';
import { setupTestDatabase, clearTestDatabase } from '../../helpers/setup/database.js';
import { createTestUser } from '../../helpers/fixtures/user-fixtures.js';

describe('User API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });
  
  afterEach(async () => {
    await clearTestDatabase();
  });
  
  it('should return user profile when authenticated', async () => {
    // Create test user and get auth token
    const { user, token } = await createTestUser();
    
    // Test API endpoint
    const response = await request(app)
      .get('/api/v1/user/profile')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(user.email);
    expect(response.body.data.name).toBe(user.name);
  });
  
  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/v1/user/profile');
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toHaveLength(1);
  });
});
```

### End-to-End Tests

E2E tests validate complete user workflows and scenarios:

- Test full business processes
- Validate system behavior from user perspective
- Can be slower and more fragile, so use selectively

**Example E2E Test:**

```javascript
// tests/e2e/workflows/user-onboarding.test.js
import request from 'supertest';
import { app } from '../../../src/app.js';
import { setupTestDatabase, clearTestDatabase } from '../../helpers/setup/database.js';

describe('User Onboarding Workflow', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });
  
  afterEach(async () => {
    await clearTestDatabase();
  });
  
  it('should complete the full onboarding process', async () => {
    // Step 1: Register user
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'securePass123',
        name: 'New User'
      });
    
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.success).toBe(true);
    
    // Step 2: Login
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'newuser@example.com',
        password: 'securePass123'
      });
    
    expect(loginResponse.status).toBe(200);
    const token = loginResponse.body.data.token;
    
    // Step 3: Complete profile
    const profileResponse = await request(app)
      .patch('/api/v1/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferences: {
          difficulty: 'beginner',
          interests: ['javascript', 'backend']
        }
      });
    
    expect(profileResponse.status).toBe(200);
    
    // Step 4: Get recommended challenges
    const recommendationsResponse = await request(app)
      .get('/api/v1/challenge/recommendations')
      .set('Authorization', `Bearer ${token}`);
    
    expect(recommendationsResponse.status).toBe(200);
    expect(recommendationsResponse.body.data.challenges).toHaveLength(3);
  });
});
```

## Running Tests

### Running All Tests

```bash
npm test
```

### Running Specific Test Types

```bash
# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run e2e tests only
npm run test:e2e
```

### Running Tests in Watch Mode

```bash
npm run test:watch
```

### Running Tests with Coverage

```bash
npm run test:coverage
```

## Writing Tests

### Test File Naming

- Test files should match the name of the file being tested with `.test.js` suffix
- Place tests in a directory structure that mirrors the source code

### Test Structure

Each test file should follow this structure:

1. Import dependencies and the code to be tested
2. Set up test fixtures and helpers
3. Define the test suite with `describe`
4. Define individual tests with `it` or `test`
5. Clean up after tests

### Test Case Guidelines

1. **Arrange**: Set up preconditions and inputs
2. **Act**: Execute the code being tested
3. **Assert**: Verify the expected outcomes
4. Use clear and descriptive test names
5. Keep tests focused and concise

## Mocking

We use Jest's mocking capabilities for unit tests:

### Function Mocking

```javascript
import { sendEmail } from '../../../src/infra/notifications/email-service.js';

// Mock the email service
jest.mock('../../../src/infra/notifications/email-service.js', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}));

// In your test
it('should send welcome email on registration', async () => {
  // Test code here
  
  // Assert the mock was called correctly
  expect(sendEmail).toHaveBeenCalledWith(
    expect.any(String),
    'Welcome to AI Gaming!',
    expect.stringContaining('welcome')
  );
});
```

### Module Replacement

```javascript
// Create a mock implementation
const mockUserRepository = {
  findById: jest.fn().mockResolvedValue({ id: '123', name: 'Test User' }),
  save: jest.fn().mockResolvedValue(true)
};

// Mock the entire module
jest.mock('../../../src/infra/repositories/user-repository.js', () => ({
  UserRepository: jest.fn().mockImplementation(() => mockUserRepository)
}));
```

### External Service Mocking

For external services, we use mock servers in integration tests:

```javascript
import { setupMockOpenAI } from '../../helpers/mocks/openai-mock.js';

describe('OpenAI Integration', () => {
  let mockOpenAI;
  
  beforeAll(() => {
    mockOpenAI = setupMockOpenAI();
  });
  
  afterAll(() => {
    mockOpenAI.close();
  });
  
  it('should get AI-generated challenge', async () => {
    // Configure mock response
    mockOpenAI.onPost('/v1/completions').reply(200, {
      id: 'test-completion',
      choices: [{ text: 'Generate a function that calculates Fibonacci numbers' }]
    });
    
    // Test code that uses OpenAI
  });
});
```

## Continuous Integration

Our CI pipeline runs all tests on every pull request:

1. Unit tests run first and must pass
2. Integration tests run next if unit tests pass
3. E2E tests run last if integration tests pass
4. Code coverage is generated and reported

## Test Coverage

We aim for the following test coverage:

- **Domain logic**: 90%+ coverage
- **Application services**: 85%+ coverage
- **Infrastructure components**: 70%+ coverage
- **Overall project**: 80%+ coverage

Coverage reports are generated with:

```bash
npm run test:coverage
```

The report is created in the `coverage` directory.

## Troubleshooting Tests

### Common Test Issues

#### Tests Failing Inconsistently

**Causes**:
- Time-dependent tests
- Tests affecting each other
- External service flakiness

**Solutions**:
- Use Jest's fake timers for time-dependent tests
- Ensure proper cleanup after each test
- Mock external services

#### Slow Tests

**Causes**:
- Too many database operations
- Inefficient test setup
- Too many API calls

**Solutions**:
- Use in-memory databases for unit tests
- Optimize test fixtures
- Group related tests to minimize setup/teardown

#### Memory Leaks

**Causes**:
- Unclosed database connections
- Uncleared event listeners
- Large test fixtures

**Solutions**:
- Ensure all connections are closed in `afterEach` or `afterAll`
- Clear all event listeners
- Minimize fixture size

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest on GitHub](https://github.com/visionmedia/supertest)
- [JavaScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Domain Testing Guide](../testing/domain-testing.md)
- [API Testing Guide](../testing/api-testing.md) 