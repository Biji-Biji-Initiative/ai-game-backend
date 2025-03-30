# Test Migration to Jest + ESM

This document provides step-by-step instructions for migrating tests from CommonJS (CJS) + Mocha to ESM + Jest.

## Overview

We're standardizing our test infrastructure to use:
- **Jest**: Test runner and framework
- **Chai**: Assertions
- **Sinon**: Mocks/stubs
- **ES Modules**: Module system

## Migration Progress

✅ Successfully migrated tests:
- `tests/unit/config/config.test.js` - Configuration validation tests
- `tests/unit/ai/ports/aistate-manager.test.js` - AIStateManager port tests 
- `tests/unit/ai/ports/AIStateManager.test.js` - AIStateManager port tests
- `tests/unit/ai/ports/AIClient.test.js` - AIClient port tests
- `tests/unit/ai/adapters/OpenAIClientAdapter.test.js` - OpenAI client adapter tests
- `tests/unit/ai/adapters/OpenAIStateManagerAdapter.test.js` - OpenAI state manager adapter tests
- `tests/unit/challenge/promptBuilder.facade.test.js` - Prompt builder facade tests
- `tests/unit/infra/openai/circuit-breaker.test.js` - Circuit breaker tests
- `tests/unit/user/user.controller.test.js` - User controller tests
- `tests/unit/personality/personality.controller.test.js` - Personality controller tests

🔄 Work in progress:
- Integration tests require fixing import paths and dependencies
- Domain tests have issues with StandardErrorCodes and require further fixes
- E2E tests have various issues with dependencies, mocks, and test setup

## Common Challenges Identified

1. **Module Import Path Issues**:
   - Missing `.js` extensions in ESM imports
   - Incorrect relative paths after file restructuring
   - Legacy imports from files that have been moved or renamed

2. **Dependency Injection Approach**:
   - Need to update tests to use constructor-based DI instead of older approaches
   - Need to replace proxyquire with proper dependency injection

3. **Error Code Standardization**:
   - Legacy StandardErrorCodes imports that need to be updated to DomainErrorCodes
   - Tests expecting generic Error instead of domain-specific errors

4. **Environment/Setup Issues**:
   - Tests using Mocha 'before' hooks that don't exist in Jest
   - Missing environment variables for external services (Supabase, OpenAI)

5. **DTO/VO Usage**:
   - Tests using primitive values instead of Value Objects
   - Inconsistent DTO mapping at API boundaries

## Migration Strategy for Remaining Tests

### 1. Fix Common Import Issues

```bash
# Run the import fix script
node scripts/update-error-imports.js
```

This script handles:
- Adding `.js` extensions to local imports
- Updating StandardErrorCodes to DomainErrorCodes
- Fixing import patterns in test files

### 2. Fix Test-Specific Issues

#### Integration Tests

The main issues with integration tests are:
- Missing or incorrect imports (especially to setup.js and helper files)
- Duplicate class declarations (ChallengeDTOMapper, UserDTOMapper)
- Mocha-specific hooks (before, beforeEach) that need Jest equivalents

Next steps:
1. Create a Jest setup file specifically for integration tests
2. Fix duplicate declarations by using named exports
3. Convert Mocha hooks to Jest equivalents

#### Domain Tests

The main issues with domain tests are:
- StandardErrorCodes references
- Value Object usage
- Dependency injection approach

Next steps:
1. Update error handling to use domain-specific errors
2. Ensure proper Value Object usage
3. Refactor tests to use constructor-based DI

#### E2E Tests

The main issues with E2E tests are:
- Environment setup (Supabase connection)
- Authentication flows
- Test timing and stability

Next steps:
1. Create proper environment setup for E2E tests
2. Implement robust authentication in test helpers
3. Add proper retry and timeout handling

### 3. Test Category Semantics

Ensure each test follows correct patterns based on its category:

- **Unit tests**: Focus on a single class/function, mock all dependencies
- **Domain tests**: Test domain logic, use in-memory repositories
- **Integration tests**: Test cross-domain interactions
- **E2E tests**: Test full API flows using HTTP requests

## Remaining Tasks

1. **Complete domain error code updates** in remaining files that reference StandardErrorCodes
2. **Convert Mocha hooks** to Jest equivalents (before → beforeAll, etc.)
3. **Fix DI patterns** to use constructor injection instead of proxyquire
4. **Set up proper test environments** for different test categories
5. **Add comprehensive E2E tests** for core user flows

## Helpful Commands

```bash
# Run unit tests
npm run test:unit

# Run a specific test file
npm run test:unit -- --testMatch='**/tests/unit/user/user.controller.test.js'

# Run integration tests
npm run test:integration

# Run domain tests
npm run test:domain

# Run E2E tests
npm run test:e2e
```

## Conclusion

The migration to Jest and ESM is well underway, with successful unit tests providing a good foundation. Focus on systematically fixing remaining issues in the integration, domain, and E2E test suites using the strategies outlined above.

Remember that the test migration is a step-by-step process - fix one category at a time, starting with the most fundamental tests and moving outward to more complex integration and E2E tests.

## Reference

See the comprehensive test documentation in:
- [docs/test-standardization.md](docs/test-standardization.md)
- [docs/guides/testing-guide.md](docs/guides/testing-guide.md)

## Need Help?

If you encounter issues not covered here:
1. Check the test-standardization.md document
2. Look for similar patterns in already-fixed tests
3. Document the solution once you find it 