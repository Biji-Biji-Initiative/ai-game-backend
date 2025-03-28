# Testing Strategy

This document outlines the testing strategy for the application, including test categories, folder structure, and best practices.

## Test Categories

Our tests are organized into the following categories:

### 1. Domain Tests (`tests/domain/`)

Domain tests focus on testing the core business logic in isolation, without external dependencies.

- Use in-memory repositories
- No external API calls
- Test business rules and domain logic
- Example: `tests/domain/challenge/services/challengeGenerationService.test.js`

### 2. Integration Tests (`tests/integration/`)

Integration tests verify that different components of the application work together correctly.

- Test interactions between different domains
- Use mocked external dependencies
- Use in-memory repositories
- Example: `tests/integration/challenge/challengeGeneration.integration.test.js`

### 3. External API Tests (`tests/external/`)

External API tests verify direct interaction with external services.

- Make real API calls to external services
- Skip if credentials are not available
- Test basic connectivity and response formats
- Organize by service (e.g., `openai`, `supabase`)
- Example: `tests/external/openai/direct/challengeGeneration.direct.test.js`

### 4. Responses API Tests (`tests/external/openai/responses-api/`)

These tests specifically test integration with OpenAI's Responses API.

- Make real API calls with OpenAI
- Test JSON formatting and handling
- Example: `tests/external/openai/responses-api/challengeGeneration.responses-api.test.js`

### 5. E2E Tests (`tests/e2e/`)

End-to-end tests verify complete user workflows from API requests to database changes.

- Test full API endpoints
- Use real databases (or test databases)
- Example: `tests/e2e/challengeCycle.e2e.test.js`

## Folder Structure

```
tests/
├── domain/             # Domain tests for core business logic
│   ├── challenge/
│   ├── evaluation/
│   ├── focusArea/
│   └── ...
├── integration/        # Integration tests between domains
│   ├── challenge/
│   ├── focusArea/
│   └── ...
├── external/           # External API integration tests
│   ├── openai/
│   │   ├── direct/     # Direct API calls
│   │   └── responses-api/ # OpenAI Responses API tests
│   └── supabase/
├── e2e/                # End-to-end API tests
├── helpers/            # Test helper functions
│   ├── inMemory/       # In-memory repositories
│   └── testHelpers.js  # Shared test utilities
├── loadEnv.js          # Environment variable loader
└── README.md           # This file
```

## Running Tests

### All Tests

```bash
npm test
```

### Specific Test Categories

```bash
# Run domain tests
npm run test:domain

# Run integration tests
npm run test:integration

# Run external API tests
npm run test:external

# Run E2E tests
npm run test:e2e
```

### Individual Test Files

```bash
npx mocha path/to/test.js
```

## Environment Variables

Tests requiring API credentials use environment variables. Create a `.env.test` file based on `.env.test.example`:

```bash
cp .env.test.example .env.test
# Edit .env.test with your credentials
```

The test environment loader (`tests/loadEnv.js`) handles loading variables and validating required credentials.

## Best Practices

1. **Domain Tests**: Focus on business rules and use in-memory repositories to avoid external dependencies.

2. **Mocking**: Use the helper functions in `tests/helpers/testHelpers.js` for consistent mocking patterns.

3. **Test Data**: Use the helper functions to create standardized test data structures.

4. **API Credentials**: Never commit API keys to the repository. Use the `.env.test` file (which is gitignored).

5. **Skipping Tests**: Use `skipIfMissingEnv(this, 'openai')` to skip tests that require credentials.

6. **Assertions**: Use chai's `expect` syntax consistently.

7. **Timeouts**: Set appropriate timeouts for tests that make external API calls.

## Adding New Tests

When adding new tests, follow these patterns:

1. **Domain Logic**: Test in `tests/domain/` with in-memory repositories
2. **Cross-Domain Interactions**: Test in `tests/integration/`
3. **External APIs**: Test direct calls in `tests/external/`
4. **Full API Flows**: Test as E2E in `tests/e2e/`

Each test file should have a descriptive name indicating what's being tested and what type of test it is (e.g., `challengeGeneration.integration.test.js`).

## Test File Naming Conventions

Use consistent naming patterns:
- Domain tests: `[feature].test.js`
- Integration tests: `[feature].integration.test.js`
- Direct API tests: `[feature].direct.test.js`
- Responses API tests: `[feature].responses-api.test.js`
- E2E tests: `[feature].e2e.test.js`

## Test Suite Documentation

## Overview

This test suite is organized following Domain-Driven Design (DDD) principles, with tests categorized into domain, integration, external, and end-to-end categories.

## Test Directory Structure

- `tests/domain/` - Domain tests focusing on business logic without external dependencies
- `tests/integration/` - Integration tests between different domain modules
- `tests/external/` - Tests for external integrations (Supabase, OpenAI)
- `tests/e2e/` - End-to-end tests for complete API flows

## Running Tests

### Run Domain Tests

To run domain tests only (with mocked external dependencies):

```bash
node scripts/run-domain-tests.js
```

### Run Only Passing Tests

To run the subset of tests known to pass successfully:

```bash
node scripts/run-passing-tests.js
```

## Test Utilities

### Mock Setup

The `tests/setup/mockSetup.js` file provides standard mocks for:

- Supabase client
- OpenAI client
- Environment variables

Include this file in your test runs to avoid external dependencies:

```bash
npx mocha --require ./tests/setup/mockSetup.js your/test/file.js
```

### Test Factories

The `tests/helpers/testFactory.js` file provides factory functions to create test data:

- `createTestUser()` - Creates a test user
- `createTestChallenge()` - Creates a test challenge
- `createTestEvaluation()` - Creates a test evaluation

### Mocking Patterns

The `tests/helpers/mockSupabaseClient.js` file provides utilities for mocking Supabase:

- `createMockSupabaseClient(customResponses)` - Creates a complete mock of the Supabase client
- `createSupabaseProxyStub(customResponses)` - Creates a stub for use with proxyquire

## Test Improvement Scripts

Several scripts have been created to improve and maintain test quality:

- `scripts/analyze-test-placement.js` - Analyzes tests for proper placement
- `scripts/fix-test-imports.js` - Fixes import paths in test files
- `scripts/convert-jest-to-chai.js` - Converts Jest assertions to Chai
- `scripts/create-di-mocking-template.js` - Creates templates for proper dependency injection

## Testing Best Practices

1. **Use Dependency Injection**: Services should accept dependencies via constructor for better testability.

2. **Prefer Sinon/Chai**: Use Sinon for mocking and Chai for assertions instead of Jest.

3. **Mock External Dependencies**: External services like Supabase and OpenAI should always be mocked.

4. **Use Proper Domain Test Isolation**: Domain tests should not depend on external services.

5. **Maintain Test Categorization**: Add new tests to the appropriate directory based on their type.

## Current Test Status

Run the `scripts/analyze-test-placement.js` script to get the current status of tests and identify misplaced tests.

## To-Do

- Fix failing domain tests by improving mock implementations
- Convert remaining Jest-style tests to Chai/Sinon
- Implement proper dependency injection pattern across all services
- Improve test coverage for core domains 