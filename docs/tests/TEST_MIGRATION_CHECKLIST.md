# Test Migration Checklist

This checklist helps with moving tests to their correct categories based on the semantics defined in `TEST_SEMANTICS.md`.

## Identifying Misplaced Tests

Run the verification tool to identify potentially misplaced tests:

```bash
node tools/verify-test-categories.js
```

## Domain Test Migration Checklist

When moving a test to the domain test category:

- [ ] Move file to appropriate subdirectory in `tests/domain/`
- [ ] Replace real repositories with in-memory implementations
- [ ] Replace real HTTP/API calls with mocks
- [ ] Add Sinon for mocking and stubbing
- [ ] Mock all external dependencies (DB, API clients, etc.)
- [ ] Use Maps for in-memory storage
- [ ] Ensure Value Objects are used correctly
- [ ] Use proper dependency injection
- [ ] Test only one domain concept per file
- [ ] Ensure test descriptions specify "Domain" context

## Integration Test Migration Checklist

When moving a test to the integration test category:

- [ ] Move file to appropriate subdirectory in `tests/integration/`
- [ ] Ensure test covers cross-domain interactions
- [ ] Remove HTTP/API calls (use services directly)
- [ ] Add "Integration" or "workflow" to test descriptions
- [ ] Test repository implementations when appropriate
- [ ] Test events between domains
- [ ] Verify data consistency across repositories
- [ ] Consider adding appropriate beforeEach/afterEach cleanup

## External Test Migration Checklist

When moving a test to the external test category:

- [ ] Move file to appropriate subdirectory in `tests/external/`
- [ ] Focus test purely on external service adapter
- [ ] Add skipIfMissingEnv to skip if credentials unavailable
- [ ] Test success and error paths
- [ ] Move any business logic tests to domain tests
- [ ] Verify correct parsing of external service responses
- [ ] Test any retry or resilience mechanisms
- [ ] Ensure test cleanup for any external resources created

## E2E Test Migration Checklist

When moving a test to the E2E test category:

- [ ] Move file to appropriate subdirectory in `tests/e2e/`
- [ ] Replace direct service calls with apiTestHelper or Axios
- [ ] Ensure proper authentication
- [ ] Verify full user workflows
- [ ] Test API contracts and response structures
- [ ] Add comprehensive cleanup for created resources
- [ ] Verify DTOs match expected structures
- [ ] Test error handling at API level

## Test Name Conventions

Use consistent naming for test files based on category:

- **Domain Tests**: `{entity}.test.js` or `{entity}.{concept}.test.js`
- **Integration Tests**: `{domain1}-{domain2}.test.js` or `{workflow}.test.js`
- **External Tests**: `{service}-client.test.js` or `{adapter}.test.js`
- **E2E Tests**: `{feature}.e2e.test.js` or `{workflow}.e2e.test.js`

## Test Description Conventions

Use descriptive test names that indicate the category:

- **Domain Tests**: `'Domain: {concept}'`
- **Integration Tests**: `'Integration: {workflow}'`
- **External Tests**: `'External: {service}'`
- **E2E Tests**: `'E2E: {feature}'`

## Handling Cross-Category Tests

If a test seems to belong to multiple categories:

1. Identify the primary purpose of the test
2. Split the test into multiple files if it covers multiple categories
3. Keep cross-domain workflows in integration tests
4. Keep API validation in E2E tests

## Post-Migration Verification

After moving tests:

- [ ] Run the test file to ensure it passes
- [ ] Verify no real external calls are made in domain tests
- [ ] Confirm correct error handling is preserved
- [ ] Run the verification tool again to confirm categorization
- [ ] Update any documentation referencing the tests 