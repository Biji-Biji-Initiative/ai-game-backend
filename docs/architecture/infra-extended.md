# Extended Infrastructure Components

This document extends the infrastructure documentation with details about additional components present in the codebase but not fully covered in the main infrastructure documentation.

## Health Checks (`/src/core/infra/health`)

### Overview

The Health Check component provides system-wide health monitoring capabilities, allowing both internal monitoring and external health check endpoints for services like Kubernetes or load balancers.

### Key Components

- `HealthCheckService` - Service that orchestrates health checks across components
- `HealthCheckController` - HTTP controller exposing health check endpoints

### Usage

```javascript
// In server startup
import { healthCheckScheduler } from './core/infra/monitoring/healthCheckScheduler.js';

// Register component health checks
healthCheckScheduler.registerHealthCheck(
  'database',
  async () => {
    const result = await dbConnection.runHealthCheck();
    return {
      status: result.status,
      message: result.message
    };
  },
  true // Critical component
);

// Start periodic health checks
healthCheckScheduler.startHealthChecks({
  intervalMs: 60000, // Check every minute
  logAllChecks: false,
  sendToSentry: true
});
```

## Caching (`/src/core/infra/cache`)

### Overview

The caching component provides a unified interface for various caching strategies, including in-memory and Redis-based caching.

### Key Components

- `CacheService` - Abstract interface for caching implementations
- `InMemoryCacheService` - Local memory-based cache implementation
- `RedisCacheService` - Redis-based distributed cache implementation
- `CacheManager` - Factory and management utility for caches

### Usage

```javascript
// Using the cache in a service
class ChallengeService {
  constructor({ cacheManager, challengeRepository }) {
    this.cacheManager = cacheManager;
    this.challengeRepository = challengeRepository;
    this.cache = this.cacheManager.getCache('challenges');
  }
  
  async getChallengeById(id) {
    // Try to get from cache first
    const cached = await this.cache.get(`challenge:${id}`);
    if (cached) {
      return cached;
    }
    
    // Fetch from repository
    const challenge = await this.challengeRepository.findById(id);
    if (challenge) {
      // Store in cache with expiration
      await this.cache.set(`challenge:${id}`, challenge, { ttl: 3600 });
    }
    
    return challenge;
  }
}
```

## Monitoring (`/src/core/infra/monitoring`)

### Overview

The monitoring component provides system-wide monitoring, metrics collection, and alerting capabilities.

### Key Components

- `healthCheckScheduler` - Schedules and manages health checks
- `metricsCollector` - Collects and aggregates metrics
- `errorMonitor` - Tracks and reports errors
- `performanceMonitor` - Measures performance metrics
- `openaiMonitor` - Specific monitoring for OpenAI integration

### Usage

```javascript
// Setting up error monitoring
import { errorMonitor } from '../../core/infra/monitoring/errorMonitor.js';

// Register domain-specific error monitoring
errorMonitor.registerDomain('challenge', {
  shouldCapture: (error) => {
    // Custom logic to determine if error should be captured
    return error.code !== 'CHALLENGE_NOT_FOUND';
  }
});

// Report an error
errorMonitor.captureError(error, {
  domain: 'challenge',
  user: { id: req.user.id },
  context: { challengeId: req.params.id }
});
```

## OpenAI Integration (`/src/core/infra/openai`)

### Overview

The OpenAI integration component provides infrastructure for interacting with OpenAI services, including client configuration, request handling, and error management.

### Key Components

- `client.js` - OpenAI API client with circuit breaker and retry logic
- `configFactory.js` - Configuration factory for OpenAI clients
- `healthCheck.js` - Health check function for OpenAI service
- `rateLimiter.js` - Rate limiting for OpenAI API calls

### Usage

```javascript
// Creating an OpenAI client with configuration
import { createOpenAIClient } from '../../core/infra/openai/client.js';

const openAIClient = createOpenAIClient({
  apiKey: config.openai.apiKey,
  organization: config.openai.organization,
  maxRetries: 3,
  timeout: 30000
});

// Using the client with circuit breaker protection
try {
  const completion = await openAIClient.createCompletion({
    model: 'text-davinci-003',
    prompt: 'Hello, world!',
    max_tokens: 50
  });
  
  // Process completion
} catch (error) {
  if (error.code === 'CIRCUIT_OPEN') {
    // Circuit breaker is open, use fallback
    return fallbackResponse();
  }
  
  // Handle other errors
  throw error;
}
```

## Messaging (`/src/core/infra/messaging`)

### Overview

The messaging component provides infrastructure for asynchronous communication using message queues or pub/sub systems.

### Key Components

- `messagePublisher.js` - Interface for publishing messages
- `messageConsumer.js` - Interface for consuming messages
- `messageHandlers.js` - Message handling logic
- `adapters/` - Implementations for different messaging providers

### Usage

```javascript
// Publishing a message
import { messagePublisher } from '../../core/infra/messaging/messagePublisher.js';

// In a service
async function completeChallenge(userId, challengeId, score) {
  // Domain logic
  // ...
  
  // Publish message for asynchronous processing
  await messagePublisher.publish('challenge.completed', {
    userId,
    challengeId,
    score,
    timestamp: new Date().toISOString()
  });
  
  return result;
}

// Consuming messages (setup during application startup)
import { messageConsumer } from '../../core/infra/messaging/messageConsumer.js';
import { challengeCompletedHandler } from './messageHandlers.js';

// Register message handlers
messageConsumer.subscribe('challenge.completed', challengeCompletedHandler);
```

## API Utilities (`/src/core/infra/api`)

### Overview

The API utilities component provides infrastructure for API-specific concerns like pagination, CORS, and API versioning.

### Key Components

- `pagination.js` - Utilities for handling paginated responses
- `corsConfig.js` - CORS configuration
- `apiResponse.js` - Standardized API response structure
- `apiVersion.js` - API versioning utilities

### Usage

```javascript
// Using pagination
import { createPagination } from '../../core/infra/api/pagination.js';

// In a controller method
async function listChallenges(req, res) {
  const { page, limit } = req.query;
  
  // Create pagination parameters
  const pagination = createPagination({ page, limit });
  
  // Get paginated results
  const { data, total } = await challengeService.listChallenges(pagination);
  
  // Format paginated response
  return res.json({
    success: true,
    data,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit)
    }
  });
}
```

## Services (`/src/core/infra/services`)

### Overview

The services component provides infrastructure services that support the application but don't belong to a specific domain.

### Key Components

- `enhanced-circuit-breaker.js` - Circuit breaker implementation for external service calls
- `throttler.js` - Request throttling service
- `rateLimiter.js` - Rate limiting implementation
- `tokenBucket.js` - Token bucket algorithm implementation

### Usage

```javascript
// Using the circuit breaker
import { CircuitBreaker } from '../../core/infra/services/enhanced-circuit-breaker.js';

// Create a circuit breaker for an external service
const paymentServiceBreaker = new CircuitBreaker('payment-service', {
  failureThreshold: 0.5, // 50% failure rate triggers open circuit
  resetTimeout: 30000, // 30 seconds until trying again
  timeout: 5000 // 5 second timeout for operations
});

// Use the circuit breaker
async function processPayment(paymentData) {
  return paymentServiceBreaker.execute(async () => {
    // Call to external payment service
    return await paymentService.process(paymentData);
  });
}
```

## Persistence (`/src/core/infra/persistence`)

### Overview

The persistence component provides infrastructure for interacting with persistent storage, beyond just database access.

### Key Components

- `unitOfWork.js` - Implementation of Unit of Work pattern
- `transactionManager.js` - Transaction management utilities
- `persistenceOptions.js` - Configuration for persistence behavior

### Usage

```javascript
// Using Unit of Work pattern
import { createUnitOfWork } from '../../core/infra/persistence/unitOfWork.js';

// In a service method
async function transferFunds(fromAccountId, toAccountId, amount) {
  // Create unit of work
  const unitOfWork = await createUnitOfWork();
  
  try {
    // Start transaction
    await unitOfWork.begin();
    
    // Get repositories with active transaction
    const accountRepo = unitOfWork.getRepository('account');
    
    // Execute operations
    const fromAccount = await accountRepo.findById(fromAccountId);
    const toAccount = await accountRepo.findById(toAccountId);
    
    // Update accounts
    fromAccount.balance -= amount;
    toAccount.balance += amount;
    
    // Save changes
    await accountRepo.save(fromAccount);
    await accountRepo.save(toAccount);
    
    // Commit transaction
    await unitOfWork.commit();
    
    return { success: true };
  } catch (error) {
    // Rollback transaction on error
    await unitOfWork.rollback();
    throw error;
  }
}
```

## Integration with Architecture

These infrastructure components support the application's architecture by:

1. **Providing Cross-Cutting Concerns**: Health checks, monitoring, and caching are essential cross-cutting concerns that support the entire application.

2. **Supporting External Integrations**: The OpenAI and messaging components provide robust interfaces for interacting with external services.

3. **Enhancing Reliability**: Circuit breakers, health checks, and monitoring contribute to system reliability and resilience.

4. **Maintaining Separation of Concerns**: These components keep infrastructure concerns separate from domain logic, following clean architecture principles. 