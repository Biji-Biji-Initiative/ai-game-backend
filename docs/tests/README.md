# Testing Framework

This directory contains all test suites for the project. It's organized into different test categories, each with specific semantics and purposes.

## Test Categories

### 1. Domain Tests (`tests/domain/`)

Tests that focus on business logic within a single domain, using in-memory repositories and mocks.

- Validate domain models, rules, and behavior
- Test with mocked dependencies
- Do not make real API or database calls

[Detailed domain test guidelines](TEST_SEMANTICS.md#1-domain-tests-testsdomain)

### 2. Integration Tests (`tests/integration/`)

Tests that verify interactions between multiple domains or components.

- Test cross-domain workflows
- Verify repository implementations
- May interact with test databases in controlled ways

[Detailed integration test guidelines](TEST_SEMANTICS.md#2-integration-tests-testsintegration)

### 3. External Tests (`tests/external/`)

Tests that verify our adapters and clients for external services.

- Test API client implementations
- Verify response handling
- May make real external API calls

[Detailed external test guidelines](TEST_SEMANTICS.md#3-external-tests-testsexternal)

### 4. E2E Tests (`tests/e2e/`)

End-to-End tests that verify the complete system through its public API.

- Make real HTTP requests
- Test complete user workflows
- Verify API contracts

[Detailed E2E test guidelines](TEST_SEMANTICS.md#4-e2e-tests-testse2e)

## Running Tests

```bash
# Run all tests
npm test

# Run specific test category
npm run test:domain
npm run test:integration
npm run test:external
npm run test:e2e

# Run specific test file
npm test -- tests/domain/user/UserService.test.js
```

## Test Utilities

### Test Verification Tool

We have a tool to verify that tests follow the correct semantics for their category:

```bash
node tools/verify-test-categories.js
```

### Migration Tools

If you need to move a test to a different category, use the appropriate migration tool:

```bash
# Convert a test to domain test
node tools/convert-to-domain-test.js

# Fix e2e test semantics
node tools/fix-e2e-test-semantics.js

# Move integration test to correct category
node tools/migrate-evaluation-flow-test.js
```

## Documentation

For more detailed guidelines, see these documents:

- [Test Semantics Guidelines](TEST_SEMANTICS.md)
- [Test Migration Checklist](TEST_MIGRATION_CHECKLIST.md)

## Helper Modules

Key testing utilities:

- `tests/helpers/apiTestHelper.js` - For API testing and test user setup
- `tests/helpers/testHelpers.js` - General test utilities
- `tests/helpers/inMemory/` - In-memory repositories for domain tests
- `tests/loadEnv.js` - Environment loading for tests 