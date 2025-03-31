# Cache Invalidation System

This document describes the cache invalidation system implemented in PERF-1.

## Overview

The cache invalidation system provides a robust, centralized mechanism for maintaining cache consistency across the application. It ensures that when data is updated, all related caches are properly invalidated to prevent stale data.

## Components

### 1. CacheInvalidationManager

The `CacheInvalidationManager` is the central component that handles cache invalidation operations:

- **Entity-based invalidation**: Invalidates caches related to specific entities
- **Pattern-based invalidation**: Invalidates caches matching specific patterns
- **Domain-specific invalidation**: Specialized methods for each domain (User, Challenge, etc.)
- **Metrics tracking**: Collects metrics on invalidation operations for monitoring

### 2. BaseRepository Cache Integration

The `BaseRepository` class now includes built-in cache invalidation:

- Automatic invalidation after successful transactions
- Domain-aware invalidation based on entity type
- Configurable via `invalidateCache` option in `withTransaction`

### 3. Event-Based Invalidation

The system includes event listeners that automatically invalidate caches in response to domain events:

- Invalidates relevant caches when entities are created, updated, or deleted
- Handles cross-domain invalidation (e.g., when a Challenge affects User data)
- Provides redundant coverage to ensure cache consistency

### 4. Monitoring API

A monitoring API is provided at `/api/system/metrics/cache` to track cache performance:

- Hit/miss rates
- Invalidation counts by entity type
- Failure rates
- Manual invalidation capabilities

## Usage

### Repository Operations

Cache invalidation happens automatically for repositories that extend `BaseRepository`:

```javascript
// When saving an entity
await userRepository.save(user);
// Cache is automatically invalidated after successful save
```

### Manual Invalidation

For operations outside repositories, you can use the `CacheInvalidationManager` directly:

```javascript
import { getCacheInvalidationManager } from '../core/infra/cache/cacheFactory.js';

const cacheInvalidator = getCacheInvalidationManager();

// Invalidate a specific entity
await cacheInvalidator.invalidateEntity('user', userId);

// Invalidate user-related caches
await cacheInvalidator.invalidateUserCaches(userId);

// Invalidate a specific pattern
await cacheInvalidator.invalidatePattern('user:list:*');
```

### Monitoring

To view cache metrics, make a GET request to `/api/system/metrics/cache` (admin authentication required).

To manually invalidate a cache, make a POST request to `/api/system/cache/invalidate` with one of these payloads:

```json
// Invalidate by pattern
{
  "pattern": "user:list:*"
}

// Invalidate by entity
{
  "entityType": "user",
  "entityId": "123"
}

// Invalidate list caches for a type
{
  "entityType": "challenge"
}
```

## Best Practices

1. **Use Domain Events**: Whenever possible, emit domain events to trigger cache invalidation rather than calling the cache invalidator directly.

2. **Be Specific**: Invalidate only the caches that are directly affected by a change, not entire domains.

3. **Consider Relationships**: When invalidating an entity, consider what related entities might also need invalidation.

4. **Monitor Performance**: Keep an eye on cache hit rates and invalidation counts to ensure the caching strategy is effective.

5. **Handle Errors Gracefully**: Cache invalidation errors should be logged but should not cause operations to fail.

## Appendix: Cache Key Patterns

The system uses consistent cache key patterns for each domain:

- `{domain}:byId:{id}` - Individual entity by ID
- `{domain}:list:{criteria}` - Lists of entities
- `{domain}:search:{query}` - Search results
- `{domain}:byUser:{userId}:{criteria}` - User-specific data

Example: `user:byId:123`, `challenge:list:recent`, `evaluation:byUser:456:active` 