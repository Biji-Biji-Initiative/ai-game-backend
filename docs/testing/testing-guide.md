# Testing Guide

This comprehensive guide explains the testing approach, organization, best practices, and tools used in our application.

## Testing Categories

Our tests are organized into several categories:

1. **Unit Tests** - Test individual components in isolation
   - Domain models
   - Domain services
   - Infrastructure adapters
   - Located in `tests/unit/`

2. **Domain Tests** - Test business logic within a single domain
   - Located in `tests/domain/{domainName}/`
   - Use in-memory repositories or mocks
   - No real external service calls
   - Test domain model validation and business rules

3. **Integration Tests** - Test how components work together
   - Located in `tests/integration/`
   - Test cross-domain workflows
   - Verify repository implementations with test databases
   - Test message flows between components

4. **External Tests** - Test integration with external services
   - Located in `tests/external/`
   - Test API client implementations
   - Verify proper error handling for third-party services
   - Test resilience and retry logic

5. **E2E Tests** - Test HTTP endpoints and full workflows
   - Located in `tests/e2e/`
   - Make real HTTP requests
   - Test complete user workflows
   - Verify API contracts

## Test Structure

The test folder follows a clean, consistent structure:

```
tests/
  ├── domain/        # Tests for domain logic (models, services)
  ├── integration/   # Tests for cross-domain interactions
  ├── external/      # Tests for external services (OpenAI, Supabase)
  ├── e2e/           # End-to-end API tests
  ├── unit/          # Unit tests for isolated components
  ├── helpers/       # Test helper utilities
  ├── mocks/         # Mock objects and data
  ├── setup/         # Test setup code
  └── templates/     # Test templates and fixtures
```

Each directory follows the domain-driven structure of the main codebase, with subdirectories for major domains:

```
domain/
  ├── challenge/
  ├── evaluation/
  ├── focusArea/
  ├── personality/
  ├── user/
  └── shared/
```

## Naming Conventions

All test files follow the kebab-case naming convention:
- `domain-object.test.js` (e.g., `user-service.test.js`)
- `feature-name.e2e.test.js` (for E2E tests)
- `feature-name.integration.test.js` (for integration tests)
- `feature-name.external.test.js` (for external service tests)

## Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:domain
npm run test:integration
npm run test:external
npm run test:e2e

# Run tests for specific domains
npm run test:domain:personality
npm run test:domain:user

# Run with specific node options
NODE_OPTIONS="--experimental-vm-modules" npm test
```

## Writing Tests

### Basic Test Structure

All tests should follow the AAA pattern:
- **Arrange:** Set up test data and dependencies
- **Act:** Execute the functionality being tested
- **Assert:** Verify the expected outcomes

```javascript
// Import test utilities
import { expect } from 'chai';
import sinon from 'sinon';

// Import the component to test
import { UserService } from '../../../src/core/user/services/UserService.js';

describe('UserService', () => {
  let userService;
  let userRepositoryMock;
  let loggerMock;
  
  beforeEach(() => {
    // Arrange - Setup mocks and stubs
    userRepositoryMock = {
      findById: sinon.stub(),
      create: sinon.stub(),
      update: sinon.stub()
    };
    
    loggerMock = {
      info: sinon.stub(),
      error: sinon.stub()
    };
    
    // Create the component with mocked dependencies
    userService = new UserService({
      userRepository: userRepositoryMock,
      logger: loggerMock
    });
  });
  
  afterEach(() => {
    // Clean up stubs after each test
    sinon.restore();
  });
  
  it('should retrieve user by ID', async () => {
    // Arrange - setup test data
    const userId = '123';
    const mockUser = { id: userId, name: 'Test User' };
    userRepositoryMock.findById.withArgs(userId).resolves(mockUser);
    
    // Act - call the method being tested
    const result = await userService.getUserById(userId);
    
    // Assert - verify the expected outcome
    expect(result).to.deep.equal(mockUser);
    expect(userRepositoryMock.findById.calledWith(userId)).to.be.true;
  });
  
  it('should throw error when user is not found', async () => {
    // Arrange
    const userId = '456';
    userRepositoryMock.findById.withArgs(userId).resolves(null);
    
    // Act & Assert
    try {
      await userService.getUserById(userId);
      expect.fail('Expected error was not thrown');
    } catch (error) {
      expect(error.message).to.include('User not found');
    }
  });
});
```

### Dependency Injection in Tests

Our codebase uses constructor injection as the primary pattern for receiving dependencies. This pattern makes dependencies explicit and improves testability.

```javascript
export class UserService {
  constructor({ userRepository, eventBus, logger }) {
    this.userRepository = userRepository;
    this.eventBus = eventBus;
    this.logger = logger;
  }
  
  async getUserById(id) {
    // Implementation
  }
}

// In tests
const mockUserRepository = {
  findById: sinon.stub().resolves({ id: '123', name: 'Test User' })
};

const mockEventBus = {
  publish: sinon.stub().resolves()
};

const mockLogger = {
  info: sinon.stub(),
  error: sinon.stub()
};

const userService = new UserService({
  userRepository: mockUserRepository,
  eventBus: mockEventBus,
  logger: mockLogger
});
```

### Using In-Memory Repositories

For domain tests, consider using in-memory repositories instead of simple mocks:

```javascript
class InMemoryUserRepository {
  constructor() {
    this.users = new Map();
  }
  
  async findById(id) {
    return this.users.get(id) || null;
  }
  
  async create(user) {
    const newUser = { ...user, id: user.id || uuidv4() };
    this.users.set(newUser.id, newUser);
    return newUser;
  }
  
  // Other repository methods
}

// In tests
const userRepository = new InMemoryUserRepository();
userRepository.users.set('123', { id: '123', name: 'Test User' });

const userService = new UserService({
  userRepository,
  // other dependencies
});
```

## Testing Tools

- **Mocha**: Test runner
- **Chai**: Assertion library
- **Sinon**: Mocking and stubbing
- **Supertest**: Testing HTTP endpoints

## Best Practices

1. **Test in Isolation** - Unit and domain tests should test components in isolation with dependencies mocked
2. **Follow AAA Pattern** - Arrange, Act, Assert
3. **Mock External Dependencies** - Never make real API calls in unit/domain tests
4. **Test Error Cases** - Don't just test the happy path
5. **Keep Tests Independent** - Tests shouldn't depend on other tests
6. **Use Descriptive Names** - Test names should describe what they're testing
7. **Reset Mocks Between Tests** - Use `beforeEach` and `afterEach` to set up and clean up mocks
8. **Verify Interactions** - Test both the returned results and the interactions with dependencies
9. **Place Tests in Correct Locations** - Follow the test category semantics

## Common Issues and Troubleshooting

### Import Path Issues

If you encounter module not found errors, check the import paths:
- Domain tests should import from `../../../src/...` (3 levels up)
- Older tests might still use `../../../../src/...` (4 levels up)
- ES Modules use `import` instead of `require`

Example fix:
```javascript
// Incorrect
const { SomeService } = require('../../../../src/core/domain/services/SomeService');

// Correct
import { SomeService } from '../../../src/core/domain/services/SomeService.js';
```

### EventBus Mocking Issues

User domain tests have issues with the eventBus mock implementation:
- Error: `TypeError: Cannot read properties of undefined (reading 'publish')`
- To fix, ensure the eventBus mock is properly set up in the test:

```javascript
const eventBusMock = {
  publishEvent: sinon.stub().resolves(),
  // Other eventBus methods as needed
};

// Pass to the service constructor
const userService = new UserService({
  userRepository: userRepositoryMock,
  eventBus: eventBusMock
});
```

### Environment Variables for Tests

E2E and External tests require proper environment variables:
- Ensure you have a `.env.test` file with test credentials
- For local testing, run `npm run setup:test` to set up the test environment
- Supabase credentials are required for E2E and Supabase external tests

### Test Cleanup

If you're experiencing issues with test organization or duplicates, you can use the test cleanup scripts:

```bash
# Back up existing tests
node scripts/backup-tests.js

# Find duplicate tests
node scripts/find-test-duplicates.js

# Run full test suite cleanup
bash scripts/clean-test-suite.sh
```

After cleaning up, run the full test suite to ensure functionality is maintained:

```bash
npm test
```

## Maintaining Clean Tests

1. Place new tests in the correct directory based on their category
2. Follow the kebab-case naming convention for test files
3. Avoid duplicating test scenarios across multiple files
4. Use the domain-driven directory structure for organizing tests
5. Run `npm test` to ensure all tests pass before committing changes

## Continuous Integration

Our CI pipeline automatically runs tests on each pull request and commit to main:

1. Tests run in Node.js environment with ESM support
2. Failed tests block PR merges
3. Code coverage reports are generated
4. Test performance is monitored 