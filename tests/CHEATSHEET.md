# Test Commands Cheat Sheet

Quick reference for running tests in our new domain-driven structure.

## Basic Test Commands

| Command | Description |
|---------|-------------|
| `npm run test:run` | Interactive test runner (recommended for beginners) |
| `npm test` | Run all tests |
| `npm run test:check-structure` | Check test structure status |

## Domain Tests

| Command | Description |
|---------|-------------|
| `npm run test:domains` | Run all domain tests |
| `npm run test:domain:challenge` | Run challenge domain tests |
| `npm run test:domain:focusArea` | Run focus area domain tests |
| `npm run test:domain:evaluation` | Run evaluation domain tests |
| `npm run test:domain:prompt` | Run prompt domain tests |

## Integration Tests

| Command | Description |
|---------|-------------|
| `npm run test:integration` | Run cross-domain integration tests |
| `npm run test:external` | Run external service integration tests |
| `npm run test:e2e` | Run end-to-end workflow tests |

## Special Tests

| Command | Description |
|---------|-------------|
| `npm run test:real-api` | Run tests with real APIs (requires API keys) |
| `npm run test:shared` | Run tests for shared utilities and components |

## Test Setup & Maintenance

| Command | Description |
|---------|-------------|
| `npm run test:setup` | Create test directory structure |
| `npm run test:cleanup` | Organize tests into the right directories |
| `npm run test:move-legacy` | Migrate tests from old locations |
| `npm run test:cleanup-legacy` | Clean up empty legacy directories |

## Debug Options

| Command | Description |
|---------|-------------|
| `DEBUG=true npm test` | Run tests with debug logging enabled |
| `DEBUG=true npm run test:domain:challenge` | Run specific domain tests with debug logging |

## Single File Testing

To run a specific test file:

```
npx mocha tests/domains/challenge/Challenge.test.js
```

## Test Pattern

To run tests matching a pattern:

```
npx mocha --grep "should create" tests/domains/**/*.test.js
```

## Using In-Memory Repositories

In your test setup:

```javascript
const { createInMemoryChallengeRepository } = require('../../helpers/inMemory/inMemoryRepository');

// Create repository
const repo = createInMemoryChallengeRepository();

// Use in tests
await repo.save(entity);
const result = await repo.findById(id);
```

## Test Factory

```javascript
const { createTestChallenge } = require('../../helpers/testFactory');

// Create test data with default values
const challenge = createTestChallenge();

// Override specific properties
const customChallenge = createTestChallenge({
  title: 'Custom Title',
  difficulty: 'advanced'
});
``` 