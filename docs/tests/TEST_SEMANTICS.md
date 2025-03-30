# Test Category Semantics Guidelines

This document outlines the correct semantics for each test category in our codebase. Following these guidelines ensures that tests are organized correctly and maintain clear boundaries between different testing concerns.

## Test Categories

### 1. Domain Tests (`tests/domain/`)

Domain tests verify the business logic within a single domain without external dependencies.

**Characteristics:**
- Use in-memory repositories or mocks
- No real external service calls 
- Test domain model validation and business rules
- Use dependency injection with mocked collaborators
- Focus on a single domain concept

**Do:**
- Use Sinon for mocking and stubbing
- Implement in-memory repositories with Maps for test data
- Mock all infrastructure (DB, external services, etc.)
- Test domain events with mocked event bus

**Don't:**
- Make real HTTP requests
- Connect to real databases
- Use API test helpers
- Cross domain boundaries

### 2. Integration Tests (`tests/integration/`)

Integration tests verify the interaction between multiple components or domains.

**Characteristics:**
- Test cross-domain workflows
- Verify repository implementations with test databases
- Test message flows between components
- May connect to external services in controlled ways

**Do:**
- Use descriptive "Integration" or "workflow" in test descriptions
- Chain repository operations
- Test cross-domain event handling
- Verify data consistency across domains

**Don't:**
- Use HTTP endpoints for testing (use the services directly)
- Mix with E2E API tests

### 3. External Tests (`tests/external/`)

External tests verify our adapters for external services.

**Characteristics:**
- Test API client implementations
- Verify proper error handling for third-party services
- Test resilience and retry logic
- May make real API calls to external services

**Do:**
- Use skipIfMissingEnv to avoid failing if credentials aren't available
- Test both success and error paths
- Verify correct parsing of external service responses

**Don't:**
- Test business logic
- Use application services

### 4. E2E Tests (`tests/e2e/`)

End-to-End tests verify the entire system through the public API.

**Characteristics:**
- Make real HTTP requests
- Test complete user workflows
- Verify API contracts
- May test UI interactions if applicable

**Do:**
- Use apiTestHelper or Axios for HTTP requests
- Test proper authorization
- Verify response structures match DTOs
- Clean up created resources

**Don't:**
- Mock external services
- Use internal services directly

## Tips for Refactoring Tests

When encountering a test that's in the wrong category:

1. **Domain tests using real services:** 
   - Replace real repositories with in-memory versions
   - Mock external service calls
   - Focus test on domain rules

2. **Integration tests making API calls:**
   - Remove HTTP requests
   - Call services directly
   - Keep cross-domain focus

3. **External tests with business logic:**
   - Remove business logic verification
   - Focus purely on adapter functionality
   - Move business logic tests to domain tests

4. **E2E tests bypassing the API:**
   - Replace direct service calls with API requests
   - Ensure proper authentication
   - Verify through public interfaces only

## Test Structure

Regardless of category, all tests should follow the AAA pattern:
- **Arrange:** Set up test data and dependencies
- **Act:** Execute the functionality being tested
- **Assert:** Verify the expected outcomes

## Verification

You can run the test category verification tool to check for tests that may not follow these guidelines:

```
node tools/verify-test-categories.js
```

This will scan all test files and report potential issues based on pattern matching. 