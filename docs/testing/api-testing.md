# API Testing Guide

## Overview

This guide focuses on testing the API layer of our AI Gaming Backend project. API testing involves validating the endpoints, request handling, response formatting, authentication, and error handling of our REST API.

## Table of Contents
- [Introduction to API Testing](#introduction-to-api-testing)
- [API Test Structure](#api-test-structure)
- [Setting Up API Tests](#setting-up-api-tests)
- [Testing Authentication](#testing-authentication)
- [Testing Request Validation](#testing-request-validation)
- [Testing Response Formats](#testing-response-formats)
- [Testing Error Handling](#testing-error-handling)
- [Testing Rate Limiting](#testing-rate-limiting)
- [Performance Testing](#performance-testing)
- [Best Practices](#best-practices)

## Introduction to API Testing

API testing ensures that our endpoints correctly handle requests, process them, and return appropriate responses. These tests validate:

- Proper routing and HTTP method handling
- Request validation and parameter processing
- Authentication and authorization
- Business logic execution
- Response formatting and status codes
- Error handling
- Rate limiting and security features

## API Test Structure

API tests are typically structured in tiers:

1. **Unit tests** - Testing individual controller methods in isolation
2. **Integration tests** - Testing controllers with their dependencies
3. **End-to-end tests** - Testing complete API flows from HTTP request to response

```
/tests
  /unit
    /controllers
      player-controller.test.js
      game-controller.test.js
  /integration
    /api
      player-routes.test.js
      game-routes.test.js
  /e2e
    api-flows.test.js
```

## Setting Up API Tests

For API testing, we use Jest as our test runner and Supertest for HTTP assertions:

```javascript
// Example setup for a controller test
const request = require('supertest');
const express = require('express');
const PlayerController = require('../../src/controllers/player-controller');
const playerService = require('../../src/services/player-service');

// Mock dependencies
jest.mock('../../src/services/player-service');

// Setup express app with routes
const app = express();
app.use(express.json());
app.use('/api/players', PlayerController.router);

describe('Player API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  
  it('should return a list of players', async () => {
    // Arrange
    const mockPlayers = [
      { id: 'player-1', name: 'Player One', level: 5 },
      { id: 'player-2', name: 'Player Two', level: 7 }
    ];
    playerService.getAllPlayers.mockResolvedValue(mockPlayers);
    
    // Act & Assert
    const response = await request(app)
      .get('/api/players')
      .expect('Content-Type', /json/)
      .expect(200);
      
    expect(response.body).toHaveLength(2);
    expect(response.body[0].id).toBe('player-1');
    expect(playerService.getAllPlayers).toHaveBeenCalled();
  });
});
```

## Testing Authentication

Testing authentication involves verifying that protected routes require valid authentication and that authentication mechanisms work as expected:

```javascript
describe('Authentication', () => {
  it('should reject requests without authentication', async () => {
    await request(app)
      .get('/api/players/me')
      .expect(401);
  });
  
  it('should accept requests with valid authentication', async () => {
    const token = generateValidToken({ id: 'user-1' });
    
    await request(app)
      .get('/api/players/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
  
  it('should reject requests with expired tokens', async () => {
    const expiredToken = generateExpiredToken({ id: 'user-1' });
    
    await request(app)
      .get('/api/players/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401)
      .expect(res => {
        expect(res.body.error).toContain('expired');
      });
  });
});
```

## Testing Request Validation

Request validation tests ensure that our API properly validates input data:

```javascript
describe('Request Validation', () => {
  it('should validate required fields', async () => {
    await request(app)
      .post('/api/players')
      .send({}) // Missing required fields
      .expect(400)
      .expect(res => {
        expect(res.body.errors).toContainEqual(
          expect.objectContaining({ field: 'name' })
        );
      });
  });
  
  it('should validate field formats', async () => {
    await request(app)
      .post('/api/players')
      .send({
        name: 'Valid Name',
        email: 'invalid-email' // Invalid email format
      })
      .expect(400)
      .expect(res => {
        expect(res.body.errors).toContainEqual(
          expect.objectContaining({ field: 'email' })
        );
      });
  });
});
```

## Testing Response Formats

Response format tests ensure our API returns properly structured data:

```javascript
describe('Response Formats', () => {
  it('should return paginated results for list endpoints', async () => {
    // Arrange
    const mockPlayers = Array(25).fill().map((_, i) => ({
      id: `player-${i}`,
      name: `Player ${i}`
    }));
    playerService.getAllPlayers.mockResolvedValue({
      items: mockPlayers.slice(0, 10),
      total: 25,
      page: 1,
      pageSize: 10
    });
    
    // Act & Assert
    const response = await request(app)
      .get('/api/players?page=1&pageSize=10')
      .expect(200);
      
    expect(response.body).toMatchObject({
      items: expect.any(Array),
      total: 25,
      page: 1,
      pageSize: 10
    });
    expect(response.body.items).toHaveLength(10);
  });
  
  it('should include HATEOAS links in responses', async () => {
    const playerId = 'player-123';
    playerService.getPlayerById.mockResolvedValue({
      id: playerId,
      name: 'Test Player'
    });
    
    const response = await request(app)
      .get(`/api/players/${playerId}`)
      .expect(200);
      
    expect(response.body._links).toBeDefined();
    expect(response.body._links.self).toBe(`/api/players/${playerId}`);
    expect(response.body._links.games).toBe(`/api/players/${playerId}/games`);
  });
});
```

## Testing Error Handling

Error handling tests verify that our API properly handles various error conditions:

```javascript
describe('Error Handling', () => {
  it('should handle resource not found errors', async () => {
    const nonExistentId = 'non-existent-id';
    playerService.getPlayerById.mockRejectedValue(
      new Error('Player not found')
    );
    
    await request(app)
      .get(`/api/players/${nonExistentId}`)
      .expect(404)
      .expect(res => {
        expect(res.body.error).toContain('not found');
      });
  });
  
  it('should handle server errors gracefully', async () => {
    playerService.getAllPlayers.mockRejectedValue(
      new Error('Database connection failed')
    );
    
    await request(app)
      .get('/api/players')
      .expect(500)
      .expect(res => {
        expect(res.body.error).toBeDefined();
        // Should not expose internal error details
        expect(res.body.error).not.toContain('Database connection');
      });
  });
});
```

## Testing Rate Limiting

Rate limiting tests ensure that our API properly limits request rates:

```javascript
describe('Rate Limiting', () => {
  it('should limit requests from the same IP', async () => {
    // Make requests up to the limit
    for (let i = 0; i < 100; i++) {
      await request(app)
        .get('/api/players')
        .expect(200);
    }
    
    // This request should be rate-limited
    await request(app)
      .get('/api/players')
      .expect(429)
      .expect(res => {
        expect(res.body.error).toContain('rate limit');
        expect(res.headers['retry-after']).toBeDefined();
      });
  });
});
```

## Performance Testing

Performance tests ensure our API maintains acceptable response times:

```javascript
describe('Performance', () => {
  it('should respond to simple requests within 100ms', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/api/health')
      .expect(200);
      
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });
  
  it('should handle high load', async () => {
    const requestCount = 50;
    const concurrentRequests = Array(requestCount)
      .fill()
      .map(() => request(app).get('/api/players'));
    
    const responses = await Promise.all(concurrentRequests);
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });
});
```

## Best Practices

1. **Test independently**: Each test should be independent and not rely on the state from other tests.
2. **Use descriptive test names**: Name tests after the specific behavior or requirement being tested.
3. **Mock external dependencies**: Use mocks for databases, external APIs, etc.
4. **Test happy and sad paths**: Test both successful scenarios and error cases.
5. **Test security concerns**: Include tests for authentication, authorization, and input validation.
6. **Clean up after tests**: Ensure tests clean up any resources they create.
7. **Maintain test isolation**: Tests should not affect the production environment.
8. **Use environment variables**: Use separate environment variables for testing.
9. **Test edge cases**: Include tests for boundary conditions and unusual inputs.
10. **Keep tests fast**: API tests should run quickly to provide fast feedback.

---

For more information about testing other layers of the application, refer to the [Domain Testing Guide](./domain-testing.md) and the main [Testing Guide](../guides/testing-guide.md). 