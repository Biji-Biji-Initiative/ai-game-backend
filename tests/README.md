# Testing Strategy

This document outlines our approach to testing the application, following domain-driven design principles and focusing on real behavior rather than excessive mocking.

## Core Testing Principles

1. **Prefer Real Behavior Over Mocks**: Tests should use real components whenever possible instead of mocks. This ensures our tests validate actual behavior.

2. **Test Through Architecture**: We want to test through our actual architecture to ensure it works as expected. This means setting up tests that exercise multiple layers together.

3. **Only Mock External Dependencies**: External services (OpenAI, Supabase, etc.) should only be mocked when absolutely necessary for debugging or when testing failure scenarios.

4. **Focus on Business Requirements**: Tests should validate that our system meets business requirements, not implementation details.

## Test Directory Structure

```
tests/
├── domains/            # Tests organized by domain
│   ├── challenge/      # Challenge domain tests
│   ├── evaluation/     # Evaluation domain tests
│   ├── focusArea/      # Focus area domain tests
│   └── prompt/         # Prompt domain tests
├── integration/        # Cross-domain integration tests
├── external/           # Tests for external service integration
│   ├── openai/         # OpenAI integration tests
│   └── supabase/       # Supabase integration tests
├── e2e/                # End-to-end workflow tests
├── shared/             # Tests for shared utilities and components
│   ├── utils/          # Utility tests
│   └── common/         # Common component tests
├── real-api/           # Tests using real APIs (when appropriate)
├── helpers/            # Test helpers and utilities
│   ├── inMemory/       # In-memory implementations for testing
│   ├── testFactory.js  # Factory functions for test data
│   └── testSetup.js    # Common test setup functions
└── legacy/             # Legacy tests pending migration
```

## Types of Tests

### Domain Tests

Domain tests validate the core business logic and entities. These tests should:
- Focus on the domain's business rules
- Test domain objects, repositories, and services together
- Use minimal mocking, preferring in-memory implementations over mocks

### Integration Tests

Integration tests validate how different domains work together. These tests should:
- Test workflows that cross multiple domains
- Validate event handling between domains
- Use real components from different domains

### External Integration Tests

These tests validate our integration with external services. They should:
- Test our adapters and clients for external services
- Have variants using both real APIs and mocks for failure scenarios
- Include error handling and retry logic

### End-to-End Tests

E2E tests validate complete user workflows. They should:
- Test from the API layer through all domains to data storage
- Focus on key user journeys
- Use real external dependencies when possible

## Running Tests

```
# Run all tests
npm test

# Run domain tests
npm run test:domains

# Run specific domain tests
npm run test:domain:challenge
npm run test:domain:focusArea
npm run test:domain:evaluation
npm run test:domain:prompt

# Run all integration tests
npm run test:integration

# Run specific integration tests
npm run test:integration:focus-area
npm run test:integration:evaluation
npm run test:integration:prompt
npm run test:integration:openai-supabase
npm run test:integration:challenge-evaluation

# Run all integration tests in sequence with detailed reporting
npm run test:integration:run-all

# Run tests with real APIs (requires API keys)
npm run test:real-api

# Run OpenAI API log tests (shows up in OpenAI platform)
npm run test:openai:logs
```

## Implementation Status

### Completed
- ✅ Created domain-driven test directory structure
- ✅ Migrated existing tests to appropriate domains
- ✅ Created in-memory repository implementations
- ✅ Created test factory and setup functions
- ✅ Fixed Challenge model tests
- ✅ Implemented integration tests for all domains
- ✅ Added cross-domain integration tests
- ✅ Set up test runner for all integration tests

### In Progress
- 🟡 Update remaining domain tests to use in-memory repositories

### To Do
- ⬜ Update external service tests to follow new pattern
- ⬜ Implement missing test cases for key business rules
- ⬜ Review and migrate valuable test cases from legacy directory

## Test File Naming Conventions

- **Domain Tests**: `[EntityName].test.js` (e.g., `Challenge.test.js`)
- **Repository Tests**: `[EntityName]Repository.test.js` (e.g., `ChallengeRepository.test.js`)
- **Service Tests**: `[ServiceName].test.js` (e.g., `ChallengeGenerationService.test.js`)
- **Integration Tests**: `[Domain1][Domain2]Integration.test.js` (e.g., `ChallengeFocusAreaIntegration.test.js`)
- **Workflow Tests**: `[WorkflowName]Workflow.test.js` (e.g., `ChallengeCompletionWorkflow.test.js`)

## Test Data

We prefer using:
- Factories for creating test data (instead of hard-coded fixtures)
- Helper functions that set up realistic test scenarios
- Randomized data when the specific values don't matter

## Debugging Failed Tests

When tests fail:
1. Check the logs in `tests/logs`
2. Use the `DEBUG=true` environment variable for more detailed logging: `DEBUG=true npm test`
3. For real API tests, check the API responses in the logs

## Next Steps

1. Continue updating domain tests to use in-memory repositories
2. Fix remaining test files to work with our new structure
3. Review legacy tests for valuable test cases to migrate
4. Add missing test cases for key business rules
5. Follow the guidelines in MAINTENANCE.md for keeping the test suite up to date 