# Testing Strategy

This document outlines the testing strategy and patterns used in our application.

## Testing Levels

We implement a comprehensive testing approach with the following levels:

### 1. Unit Tests

Unit tests verify that individual components (functions, classes, modules) work correctly in isolation.

- **Location**: Co-located with source code in `__tests__` directories
- **Naming Convention**: `[filename].test.js`
- **Tools**: Jest, Vitest
- **Focus**: Individual functions, classes, pure logic
- **Coverage Target**: 80%+ of all business logic

### 2. Integration Tests

Integration tests verify that multiple components work together correctly.

- **Location**: `tests/integration/`
- **Naming Convention**: `[feature].integration.test.js`
- **Tools**: Jest, Supertest
- **Focus**: API endpoints, database operations, service interactions
- **Coverage Target**: 70%+ of critical integration points

### 3. End-to-End Tests

E2E tests verify that complete user flows work correctly from start to finish.

- **Location**: `tests/e2e/`
- **Naming Convention**: `[flow].e2e.test.js`
- **Tools**: Playwright or Cypress
- **Focus**: Critical user journeys, full application flows
- **Coverage**: Key user journeys

### 4. External Integration Tests

Tests for external service integrations (marked as optional in CI).

- **Location**: `tests/external/`
- **Naming Convention**: `[service].external.test.js`
- **Tools**: Jest with appropriate mocks
- **Focus**: OpenAI, Supabase, and other external service integrations
- **Execution**: Run on-demand and in nightly builds (not in PR CI)

## Testing Patterns

### Repository Pattern Testing

For repositories that interact with databases:

```javascript
describe('UserRepository', () => {
  beforeEach(async () => {
    // Set up test database
    await resetTestDatabase();
  });
  
  it('should find a user by id', async () => {
    // Arrange
    const testUser = await seedTestUser();
    const repo = new UserRepository(db);
    
    // Act
    const user = await repo.findById(testUser.id);
    
    // Assert
    expect(user).toMatchObject({
      id: testUser.id,
      email: testUser.email
    });
  });
});
```

### Service Pattern Testing

For testing service classes with dependencies:

```javascript
describe('ChallengeService', () => {
  // Mock dependencies
  const mockRepository = {
    findById: jest.fn(),
    save: jest.fn()
  };
  
  // System under test
  const service = new ChallengeService(mockRepository);
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should get challenge by id', async () => {
    // Arrange
    const testChallenge = { id: 'test-id', title: 'Test Challenge' };
    mockRepository.findById.mockResolvedValue(testChallenge);
    
    // Act
    const result = await service.getChallenge('test-id');
    
    // Assert
    expect(mockRepository.findById).toHaveBeenCalledWith('test-id');
    expect(result).toEqual(testChallenge);
  });
});
```

### API Endpoint Testing

For testing HTTP endpoints:

```javascript
describe('User API', () => {
  it('should return user profile', async () => {
    // Arrange: Create test user & token
    const { user, token } = await createTestUserAndToken();
    
    // Act: Call the API
    const response = await request(app)
      .get(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`);
    
    // Assert: Verify response
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: user.id,
      email: user.email
    });
  });
});
```

### Testing External Dependencies

For testing with external services:

```javascript
describe('OpenAI Client', () => {
  it('should call OpenAI API and return result', async () => {
    // Skip if not running external tests
    if (!process.env.RUN_EXTERNAL_TESTS) {
      return;
    }
    
    // Arrange
    const client = new OpenAIClient(apiKey);
    
    // Act
    const result = await client.generateChatCompletion({
      messages: [{ role: 'user', content: 'Hello' }]
    });
    
    // Assert
    expect(result).toBeDefined();
    expect(result.choices[0].message).toBeDefined();
  });
  
  it('should throw appropriate error on API failure', async () => {
    // Always run - uses mocked response
    const client = new OpenAIClient('invalid-key');
    
    // Act & Assert
    await expect(client.generateChatCompletion({
      messages: [{ role: 'user', content: 'Hello' }]
    })).rejects.toThrow(AuthenticationError);
  });
});
```

## Mocking Strategies

### Database Mocking

For unit tests, we mock the database layer:

```javascript
// Mock the database module
jest.mock('../../core/infra/db/database.js', () => ({
  query: jest.fn(),
  // other methods...
}));

// Import the mocked module
import { query } from '../../core/infra/db/database.js';

describe('UserRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should query the database', async () => {
    // Arrange: Set up the mock return value
    query.mockResolvedValue({ rows: [{ id: '123', name: 'Test User' }] });
    
    // Act: Call the function that uses the database
    const repo = new UserRepository();
    const user = await repo.findById('123');
    
    // Assert: Verify correct query was made
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM users'), 
      ['123']
    );
    expect(user).toEqual({ id: '123', name: 'Test User' });
  });
});
```

### External API Mocking

For mocking external APIs:

```javascript
// Mock the OpenAI module
jest.mock('../../core/infra/external/openai.js');

// Import the mocked module
import { OpenAIClient } from '../../core/infra/external/openai.js';

describe('ChallengeGenerator', () => {
  // Mock implementation
  beforeEach(() => {
    OpenAIClient.mockImplementation(() => ({
      createChatCompletion: jest.fn().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ challenge: 'Test' }) } }]
      })
    }));
  });
  
  it('should generate challenge using OpenAI', async () => {
    // Act
    const generator = new ChallengeGenerator(new OpenAIClient());
    const challenge = await generator.generate('javascript', 'beginner');
    
    // Assert
    expect(challenge).toEqual({ challenge: 'Test' });
  });
});
```

## Test Data Management

We use a combination of strategies for test data:

### 1. Factories

For generating test entities:

```javascript
// User factory
function createUser(overrides = {}) {
  return {
    id: uuidv4(),
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    createdAt: new Date(),
    ...overrides
  };
}

// In tests
const user = createUser({ name: 'Custom Name' });
```

### 2. Fixtures

For complex test datasets:

```javascript
// Load fixture
const challengeFixtures = require('../fixtures/challenges.json');

// In tests
const testChallenge = challengeFixtures.find(c => c.id === 'challenge-1');
```

### 3. Database Seeding

For integration tests:

```javascript
// Seed test database
async function seedTestData() {
  await db.query(`INSERT INTO users (id, email, name) VALUES ($1, $2, $3)`, 
    ['test-id', 'test@example.com', 'Test User']);
  // More seeding...
}

// In test setup
beforeAll(async () => {
  await resetDatabase();
  await seedTestData();
});
```

## CI/CD Integration

Our testing strategy integrates with our CI/CD pipeline:

1. **PR Checks**: Unit and integration tests run on every PR
2. **Pre-Merge**: E2E tests run before merging to main branches
3. **Nightly Builds**: External integration tests run in nightly builds
4. **Coverage Reports**: Test coverage is reported to ensure minimum thresholds

## Documentation Standards

For test documentation:

1. **Test Description**: Each test should have a clear description
2. **Arrange-Act-Assert**: Follow the AAA pattern for test structure
3. **Comments**: Add comments for complex test setup or assertions
4. **Focused Tests**: Each test should focus on a single behavior

## Testing Commands

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run external tests
npm run test:external

# Generate coverage report
npm run test:coverage
``` 