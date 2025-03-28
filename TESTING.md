# Testing Guide

This document outlines the testing approach for the AI Fight Club API project.

## Testing Philosophy

This project follows a comprehensive testing strategy with multiple layers:

1. **Unit Tests**: Validate individual components in isolation
2. **Integration Tests**: Verify interactions between components
3. **End-to-End Tests**: Test complete workflows from API to database

## Test Environment Setup

### Prerequisites

- Node.js v14+
- npm v6+
- Environment variables (see below)

### Environment Configuration

Create a `.env.test` file in the root directory with test-specific values:

```
# Test environment variables
OPENAI_API_KEY=your_test_openai_api_key
SUPABASE_URL=your_test_supabase_url
SUPABASE_KEY=your_test_supabase_key
NODE_ENV=test
LOG_LEVEL=error
```

Alternatively, you can copy the template:

```bash
cp .env.test.example .env.test
# Now edit .env.test with your values
```

## Running Tests

### All Tests

To run all tests:

```bash
npm test
```

### Specific Test Groups

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# Specific domain tests
npm run test:domain:user
npm run test:domain:challenge
```

### Test with Coverage

To run tests with coverage reporting:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

## Test Structure

Tests are organized following the structure of the application:

```
tests/
├── unit/                  # Unit tests
│   ├── core/              # Core domain tests
│   │   ├── challenge/     # Challenge domain tests
│   │   ├── user/          # User domain tests
│   │   └── ...
│   └── infra/             # Infrastructure tests
├── integration/           # Integration tests
│   ├── api/               # API endpoint tests
│   ├── repositories/      # Repository tests
│   └── services/          # Service integration tests
└── e2e/                   # End-to-end tests
    ├── challenge-flow.js  # Challenge creation to evaluation
    └── user-onboarding.js # User creation and profile generation
```

## Test Utilities

### Environment Loading

The `tests/loadEnv.js` utility centralizes environment variable loading for tests:

```javascript
const { getTestConfig, hasRequiredVars } = require('./loadEnv');

// Use the config
const config = getTestConfig();

// Check if required variables are present
if (hasRequiredVars('openai')) {
  // Run OpenAI tests
}
```

### Test Fixtures

Reusable fixtures are available in the `tests/fixtures` directory:

```javascript
const { createTestUser, createTestChallenge } = require('./fixtures');

// Create a test user
const user = await createTestUser();

// Create a test challenge
const challenge = await createTestChallenge(user.email);
```

## Writing Tests

### Unit Test Example

```javascript
const { expect } = require('chai');
const { Challenge } = require('../../src/core/challenge/models/Challenge');

describe('Challenge Model', () => {
  it('should properly initialize a challenge', () => {
    const challenge = new Challenge({
      userEmail: 'test@example.com',
      focusArea: 'AI Ethics',
      type: 'critical-thinking',
    });
    
    expect(challenge.userEmail).to.equal('test@example.com');
    expect(challenge.status).to.equal('active');
  });
});
```

### Integration Test Example

```javascript
const { expect } = require('chai');
const { getTestConfig } = require('../loadEnv');
const { ChallengeRepository } = require('../../src/core/challenge/repositories/ChallengeRepository');
const { createTestChallenge } = require('../fixtures');

describe('Challenge Repository', () => {
  let repository;
  let testChallenge;
  
  before(async () => {
    repository = new ChallengeRepository();
    testChallenge = await createTestChallenge('test@example.com');
  });
  
  after(async () => {
    await repository.delete(testChallenge.id);
  });
  
  it('should retrieve a challenge by ID', async () => {
    const challenge = await repository.getById(testChallenge.id);
    expect(challenge).to.exist;
    expect(challenge.id).to.equal(testChallenge.id);
  });
});
```

## Mock Patterns

For external dependencies like OpenAI, we use mocks to avoid actual API calls during testing:

```javascript
const sinon = require('sinon');
const { OpenAIClient } = require('../../src/lib/openai/OpenAIClient');

// Example of mocking the OpenAI client
const mockOpenAI = () => {
  return sinon.stub(OpenAIClient.prototype, 'createResponse').resolves({
    id: 'mock-response-id',
    choices: [
      {
        message: {
          content: 'Mocked response content'
        }
      }
    ]
  });
};
```

## Continuous Integration

Tests are automatically run in the CI pipeline for:
- Pull requests to main branch
- Direct pushes to main branch

See `.github/workflows/test.yml` for CI configuration details. 