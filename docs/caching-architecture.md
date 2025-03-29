# Caching Architecture

## Overview

This document outlines the caching architecture implemented in our application, which provides optimized data access patterns, reduced database load, and improved application performance.

## Key Components

### 1. Cache Service

The `CacheService` is the central component that provides a standardized interface for all caching operations. It features:

- Pluggable cache providers (Redis, In-Memory)
- Domain-specific TTL management
- Automatic JSON serialization/deserialization
- Comprehensive logging and metrics
- Consistent error handling
- Performance optimization for cache operations

```javascript
// Usage example:
const { getCacheService } = require('./infra/cache/cacheFactory');
const cache = getCacheService();

// Simple get/set operations
await cache.set('user:byId:123', userData, 600); // TTL in seconds
const user = await cache.get('user:byId:123');

// Get or compute with factory function
const product = await cache.getOrSet('product:byId:456', async () => {
  return await productRepository.findById('456');
}, 300);
```

### 2. Cache Providers

#### Redis Cache Provider

The `RedisCacheProvider` implements the cache provider interface using Redis as the backend storage. It provides:

- Persistent caching across application instances
- Pattern-based key operations with Redis wildcards
- Automatic reconnection handling
- Connection pooling
- Support for Redis clusters

#### Memory Cache Provider

The `MemoryCacheProvider` implements the cache provider interface using an in-memory store (NodeCache). It's ideal for:

- Local development
- Testing environments
- Single-instance deployments
- Scenarios where Redis isn't available

### 3. Cache Invalidation Manager

The `CacheInvalidationManager` provides centralized and standardized cache invalidation patterns:

- Entity-based invalidation (`invalidateEntity`)
- Domain-specific invalidation methods:
  - `invalidateUserCaches`
  - `invalidateChallengeCaches`
  - `invalidateFocusAreaCaches`
  - `invalidateEvaluationCaches`
  - `invalidatePersonalityCaches`
- Pattern-based invalidation with wildcards
- List cache invalidation

```javascript
// Usage example:
const { getCacheInvalidationManager } = require('./infra/cache/cacheFactory');
const cacheInvalidator = getCacheInvalidationManager();

// Invalidate user-related caches
await cacheInvalidator.invalidateUserCaches('user-123');

// Invalidate challenge-related caches
await cacheInvalidator.invalidateChallengeCaches('challenge-456');
```

## Cache Key Structure

We use a standardized cache key structure for consistency and organization:

```
<entity-type>:<operation>:<id>[:additional-parameters]
```

Examples:
- `user:byId:123` - User entity with ID 123
- `challenge:byUser:456:10:0:all:createdAt:desc` - Challenges for user 456 with pagination and sorting
- `evaluation:search:{"userId":"789"}:20:0:score:asc` - Evaluation search with filters and options

## TTL Management

TTL (Time-To-Live) values are centrally managed and domain-specific:

| Domain | Operation | TTL (seconds) | Reasoning |
|--------|-----------|--------------|-----------|
| User | By ID | 600 | User data changes infrequently |
| User | List | 120 | Lists may change more often |
| Challenge | By ID | 600 | Challenge data is relatively stable |
| Challenge | By User | 300 | User-specific lists change more frequently |
| Challenge | List | 120 | Lists change frequently |
| Evaluation | By ID | 600 | Evaluation data is stable once created |
| Evaluation | By User | 300 | User-specific lists change more frequently |
| Personality | By ID | 900 | Personality data changes very infrequently |

## Service Integration

Domain services integrate with the cache architecture through the factory-provided instances:

```javascript
const { getCacheService, getCacheInvalidationManager } = require('../../infra/cache/cacheFactory');
const cache = getCacheService();
const cacheInvalidator = getCacheInvalidationManager();

class UserService {
  async getUserById(userId) {
    const cacheKey = `user:byId:${userId}`;
    
    return cache.getOrSet(cacheKey, async () => {
      return this.repository.findById(userId);
    });
  }
  
  async updateUser(userId, userData) {
    // Update user
    const updatedUser = await this.repository.update(userId, userData);
    
    // Invalidate caches
    await cacheInvalidator.invalidateUserCaches(userId);
    
    return updatedUser;
  }
}
```

## Cache Configuration

The cache system is highly configurable through environment variables:

| Config | Default | Description |
|--------|---------|-------------|
| `cache.provider` | `memory` | Cache provider type (`redis` or `memory`) |
| `cache.defaultTTL` | `300` | Default TTL in seconds |
| `cache.logHits` | `true` | Whether to log cache hits |
| `cache.logMisses` | `true` | Whether to log cache misses |
| `cache.enabled` | `true` | Enable/disable caching globally |
| `redis.host` | `localhost` | Redis host |
| `redis.port` | `6379` | Redis port |
| `redis.password` | | Redis password (if any) |
| `redis.db` | `0` | Redis database number |
| `redis.prefix` | `app:cache:` | Key prefix for Redis keys |

## Best Practices

1. **Use Cache Keys Consistently**: Always use the established key structure and create constants for cache key prefixes.
2. **Invalidate Broadly**: When in doubt, invalidate more broadly to ensure data consistency.
3. **Appropriate TTLs**: Set TTLs based on how frequently data changes.
4. **Handle Cache Failures Gracefully**: The system is designed to fall back to the database if cache operations fail.
5. **Don't Cache Everything**: Only cache data that is:
   - Expensive to compute
   - Frequently accessed
   - Relatively static
   - Not extremely large in size
6. **Monitor Cache Performance**: Use the built-in metrics to track hit rates and optimize TTLs.

## Future Improvements

The following improvements are planned for the cache architecture:

1. Cache warmup strategies for frequently accessed data
2. Advanced cache analytics and monitoring
3. Read-through and write-through caching patterns
4. Distributed cache invalidation with Redis pub/sub
5. Cache segmentation by tenant/user for multi-tenant applications

## Conclusion

This caching architecture provides a robust, flexible, and efficient way to improve application performance. By centralizing caching logic and providing standardized patterns, we ensure consistent and maintainable caching throughout the application. 