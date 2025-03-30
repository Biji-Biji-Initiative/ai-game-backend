# Infrastructure Tests

This directory contains tests for infrastructure components, such as external service adapters, API clients, and other infrastructure concerns.

## Directory Structure

```
infrastructure/
├── services/              # Tests for service adapters
│   ├── MockInsightGenerator.test.js       
│   └── OpenAIInsightGenerator.test.js     
```

## About Infrastructure Tests

Infrastructure tests verify that adapters correctly implement the ports/interfaces defined in the domain layer. These tests ensure that:

1. Infrastructure components properly adapt external services to domain interfaces
2. Error handling is implemented correctly
3. Data transformation between external and domain formats works as expected

## Running the Tests

```bash
# Run all infrastructure tests
npm run test:infrastructure

# Run specific infrastructure tests
npx mocha tests/infrastructure/**/*.test.js
```

## Test Approach

Infrastructure tests typically:

1. Mock external dependencies (like OpenAI API clients)
2. Verify correct implementation of domain interfaces
3. Test error handling and edge cases
4. Validate data transformation logic

## Best Practices

1. **Mock External Dependencies**: Always mock external services to avoid actual API calls
2. **Test Input/Output Transformations**: Focus on verifying data transformations between domain and external formats
3. **Error Handling**: Test how infrastructure components handle external service errors
4. **Interface Compliance**: Ensure adapters fully implement the domain interfaces 