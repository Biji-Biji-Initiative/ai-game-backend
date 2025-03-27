# Test Suite Maintenance Guide

This guide provides instructions on how to maintain and evolve the test suite as the application changes over time.

## Adding New Tests

### For New Domains

1. Create a new directory under `tests/domains/` for your domain
2. Add a README.md explaining the domain's purpose
3. Use the domain test template as a starting point:
   ```bash
   cp tests/templates/domain-test-template.js tests/domains/newDomain/NewEntity.test.js
   ```
4. Update the placeholders in the template with your domain and entity names
5. Add an in-memory repository implementation in `tests/helpers/inMemory/`
6. Add test factory functions in `tests/helpers/testFactory.js`

### For Existing Domains

1. Identify the domain the test belongs to
2. Create a test file in the appropriate directory following the naming conventions
3. Use existing test files in that domain as a reference
4. Follow the established patterns for that domain

## Evolving Tests with Code Changes

### When Changing Domain Models

1. Update the corresponding domain tests first
2. Check if any integration tests are affected
3. Verify that in-memory repositories still match the real implementations
4. Update test factory functions to create valid instances of the modified model

### When Adding New Business Rules

1. Add specific tests for the new business rules
2. Focus on the behavior, not implementation details
3. Consider adding test cases for edge cases and error scenarios
4. Update any affected integration or e2e tests

### When Changing External Integrations

1. Update the corresponding external tests
2. Add tests for new endpoints or functionality
3. Consider adding tests with both mocked and real API responses
4. Update any affected domain or integration tests

## Keeping Tests Maintainable

### Code Review Checklist for Tests

- [ ] Tests follow the domain-driven structure
- [ ] Tests use in-memory repositories instead of mocks when possible
- [ ] Tests focus on business requirements, not implementation details
- [ ] Tests include both happy path and error scenarios
- [ ] Tests are readable and well-documented

### Periodic Test Maintenance

1. **Monthly Test Quality Review**
   - Check test coverage reports
   - Identify and fix flaky tests
   - Review test performance
   - Update tests that no longer match current business rules

2. **Quarterly Test Structure Review**
   - Run `npm run test:check-structure` to analyze test structure
   - Move any misplaced tests to the correct directories
   - Update domain organization if business domains have changed
   - Archive tests for deprecated features

### External Service Logging and Monitoring

1. **OpenAI API Logs**
   - Run `npm run test:openai:logs` monthly to verify OpenAI integration
   - Review logs in the OpenAI platform to identify usage patterns
   - Check for error rates and optimize API usage
   - Update OpenAI test scenarios as API features change
   - See `tests/external/openai/OPENAI_LOGS_GUIDE.md` for detailed instructions

2. **Supabase Logs**
   - Monitor database performance and query patterns
   - Review edge function execution logs
   - Check for error rates and optimize database usage

## Troubleshooting Common Test Issues

### Flaky Tests

1. Look for time dependencies (consider using test time mocking)
2. Check for shared state between tests
3. Verify external API stability if used
4. Add more detailed logging to isolate the issue

### Slow Tests

1. Identify the slowest tests using Mocha's `--reporter spec` option
2. Consider using mocks for slow external services
3. Separate slow tests into their own test suite
4. Optimize test setup and teardown

### Import Issues

1. Check for circular dependencies
2. Verify path references are correct
3. Use relative imports consistently
4. Update any broken imports when files are moved

## Updating Test Documentation

### When to Update Documentation

1. When adding a new domain
2. When changing test organization
3. When adding new test commands
4. When changing how tests should be written or executed

### Documentation to Keep Updated

1. Main `tests/README.md`
2. Domain-specific README files
3. `tests/CHEATSHEET.md` for command updates
4. `tests/SUMMARY.md` for status updates
5. This maintenance guide as processes evolve

## Test Quality Metrics

Track these metrics to ensure test quality:

1. **Test Coverage**: Aim for >80% for core domain logic
2. **Test Execution Time**: Monitor for slow tests
3. **Flaky Test Ratio**: Track and reduce flaky tests
4. **Test Structure Compliance**: Monitor with `npm run test:check-structure`

## Adding New Test Scripts

1. Add the script to `package.json`
2. Document the script in `tests/CHEATSHEET.md`
3. Update `scripts/run-tests.js` if it should be available in the interactive runner

## Conduct Regular Test Retrospectives

Schedule quarterly test retrospectives to:
1. Review test effectiveness
2. Identify pain points in testing
3. Plan improvements
4. Update testing standards
5. Share testing knowledge across the team 