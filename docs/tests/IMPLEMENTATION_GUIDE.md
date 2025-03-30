# Testing Implementation Guide

This guide explains how to implement the new testing structure for our application. The structure follows Domain-Driven Design principles, focusing on testing the collaboration between domain objects, services, and repositories.

## Overview of New Test Structure

```
tests/
├── unit/                   # Isolated tests for pure functions (keep minimal)
├── domain/                 # Main focus - Domain integration tests
│   ├── user/               # User domain tests
│   ├── personality/        # Personality domain tests
│   └── ...                 # Other domains
├── application/            # Tests for Application Layer Coordinators
├── integration/            # Cross-domain integration tests
├── api/                    # API contract tests (requests/responses)
├── e2e/                    # End-to-end workflow tests
├── external/               # Tests for external service integration
├── helpers/                # Test helpers and utilities
├── config/                 # Test configuration
├── logs/                   # Test logs
└── legacy/                 # Legacy tests (pending migration)
```

## Migration Steps

1. **Run the migration script** to create the new directory structure and move files:
   ```
   npm run test:migrate
   ```

2. **Update package.json scripts** with the new test commands:
   ```
   npm run test:update-scripts
   ```

3. **Fix import paths** in the migrated files:
   - Update paths like `require('../../../../src/core/...')` to the correct relative path from the new location
   - For files moved from `domains/` to `domain/`, typically reduce the number of `../` levels by one
   - Example: 
     ```
     // Old path in domains/personality/services/TraitsAnalysisService.test.js
     const TraitsAnalysisService = require('../../../../src/core/personality/services/TraitsAnalysisService');
     
     // New path in domain/personality/traitsAnalysis.service.test.js
     const TraitsAnalysisService = require('../../../src/core/personality/services/TraitsAnalysisService');
     ```

4. **Manually refactor complex tests** that were marked for review:
   - Tests in `integration/` that have been marked with "MARKED FOR MANUAL REVIEW" header
   - Split these into domain tests, integration tests, and E2E tests following the templates

## Writing New Tests

### Domain Tests

Domain tests focus on testing domain objects, services, and repositories within a single domain. They use in-memory repositories to minimize mocking.

1. Use the template at `tests/templates/domain-test-template.js`
2. Create test in the appropriate domain directory (e.g., `tests/domain/user/user.service.test.js`)
3. Import and use in-memory repositories from `tests/helpers/inMemory`
4. Mock external dependencies only (e.g., OpenAI, Supabase)

Example:

```javascript
const { expect } = require('chai');
const sinon = require('sinon');
const { createInMemoryUserRepository } = require('../../helpers/inMemory');

describe('User Service Domain Tests', function() {
  let userRepository;
  
  beforeEach(function() {
    userRepository = createInMemoryUserRepository();
  });
  
  it('should create a user', async function() {
    // Test with in-memory repository
  });
});
```

### E2E Tests

E2E tests verify the entire application from the API endpoints. They use real HTTP requests.

1. Use the template at `tests/templates/e2e-test-template.js`
2. Create test in the `tests/e2e` directory
3. Use the `apiTestHelper` for authentication and setup

Example:

```javascript
const { expect } = require('chai');
const apiTestHelper = require('../helpers/apiTestHelper');

describe('E2E: User API', function() {
  let apiClient;
  
  before(async function() {
    const apiSetup = await apiTestHelper.setupApiClient();
    apiClient = apiSetup.apiClient;
  });
  
  it('should create a user', async function() {
    // Test with real API call
  });
});
```

### Integration Tests

Integration tests verify cross-domain interactions and workflows.

1. Use the template at `tests/templates/integration-test-template.js`
2. Create test in the `tests/integration` directory
3. Import multiple domain repositories and services

Example:

```javascript
const { expect } = require('chai');
const {
  createInMemoryUserRepository,
  createInMemoryPersonalityRepository
} = require('../helpers/inMemory');

describe('Integration: User and Personality', function() {
  let userRepository;
  let personalityRepository;
  
  beforeEach(function() {
    userRepository = createInMemoryUserRepository();
    personalityRepository = createInMemoryPersonalityRepository();
  });
  
  it('should handle user creation with personality profile', async function() {
    // Test cross-domain interaction
  });
});
```

## Using In-Memory Repositories

The key to our new testing approach is using in-memory repositories instead of mocks:

```javascript
// Import the repositories
const {
  createInMemoryUserRepository,
  createInMemoryPersonalityRepository
} = require('../helpers/inMemory');

// Create repository instances
const userRepository = createInMemoryUserRepository();
const personalityRepository = createInMemoryPersonalityRepository();

// Use in tests
await userRepository.save(user);
const savedUser = await userRepository.findById(user.id);
```

This approach lets us test the domain logic and the collaboration between domain objects and repositories without relying on real databases or excessive mocking.

## Best Practices

1. **Use in-memory repositories** instead of mocks for domain tests
2. **Mock external dependencies only** (e.g., OpenAI, Supabase)
3. **Test domain objects and services together** to verify collaboration
4. **Keep tests independent** (set up and tear down state for each test)
5. **Use descriptive test names** that explain the behavior being tested

## Test Categories and When to Use Them

- **Unit Tests** (tests/unit/) - Use sparingly for complex pure functions, algorithms, or validation logic
- **Domain Tests** (tests/domain/) - Main focus - Use for testing domain objects, services, and repositories within a domain
- **Application Tests** (tests/application/) - Use for testing application layer coordinators that orchestrate multiple domain services
- **Integration Tests** (tests/integration/) - Use for testing cross-domain interactions through events or coordinators
- **E2E Tests** (tests/e2e/) - Use for testing complete user workflows through the API
- **External Tests** (tests/external/) - Use for testing integration with external services

## Running Tests

- All tests: `npm test`
- Domain tests: `npm run test:domain`
- E2E tests: `npm run test:e2e` 
- Specific domain: `npm run test:domain:user` 