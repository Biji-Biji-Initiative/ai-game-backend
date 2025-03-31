# Cache Invalidation Standardization Guide

This guide explains the standardized approach to cache invalidation implemented as part of PERF-1. It provides a consistent pattern for all repositories to follow when invalidating caches after data changes.

## Overview

The system now uses a centralized cache invalidation strategy through the `BaseRepository` class. This ensures that:

1. All repositories invalidate caches in a consistent manner
2. Cache invalidation happens automatically after successful transactions
3. Domain-specific invalidation patterns are followed for each entity type
4. Invalidation is triggered by both direct repository operations and domain events

## How Cache Invalidation Works

### In BaseRepository

The `BaseRepository` class now handles cache invalidation through:

1. **Constructor Initialization**: Every repository gets a `cacheInvalidator` instance, falling back to the global one if not provided
2. **Transaction Support**: The `withTransaction` method has `invalidateCache` and `cacheInvalidator` options
3. **Automatic Invalidation**: After successful transactions, related caches are automatically invalidated
4. **Domain-Specific Logic**: The `_invalidateRelatedCaches` method contains entity-specific invalidation patterns

### Invalidation Patterns

The system follows these patterns when invalidating caches:

1. **Direct Entity Invalidation**: Always invalidate the specific entity by ID
2. **Related Entity Invalidation**: Invalidate related entities based on relationships
3. **List Cache Invalidation**: Always invalidate list-type caches for modified entity types
4. **Domain-Specific Patterns**: Apply special invalidation rules for different entity types

## Implementation Guide

### 1. For Existing Repositories

Ensure each repository method that modifies data uses `withTransaction` with proper cache invalidation options:

```javascript
return this.withTransaction(async (transaction) => {
  // Database operations
  
  return {
    result: savedEntity,
    domainEvents: domainEvents
  };
}, {
  publishEvents: true,
  eventBus: this.eventBus, 
  invalidateCache: true,  // Enable cache invalidation
  cacheInvalidator: this.cacheInvalidator  // Use repository's invalidator
});
```

### 2. For New Repositories

1. Extend `BaseRepository`
2. Use `withTransaction` for all operations that modify data
3. Set `invalidateCache: true` in transaction options
4. Return proper domain events for event-based invalidation

Example:

```javascript
class MyNewRepository extends BaseRepository {
  constructor(options = {}) {
    super({
      db: options.db || supabaseClient,
      tableName: 'my_entities',
      domainName: 'myentity',
      logger: options.logger,
      eventBus: options.eventBus,
      // No need to explicitly pass cacheInvalidator - BaseRepository handles it
    });
  }
  
  async save(entity) {
    // Use withTransaction with cache invalidation
    return this.withTransaction(async (txn) => {
      // Database operations
      return { result: savedEntity, domainEvents: [] };
    }, { 
      invalidateCache: true 
    });
  }
}
```

### 3. For Domain Events

If your entity emits domain events, the events can trigger cache invalidation automatically.

Register event handlers to invalidate caches:

```javascript
// In your event handlers setup
eventBus.subscribe(EventTypes.MY_ENTITY_UPDATED, async (event) => {
  const cacheInvalidator = getCacheInvalidationManager();
  await cacheInvalidator.invalidateEntity('myentity', event.data.entityId);
  // Add any additional invalidation patterns needed
});
```

## Testing Cache Invalidation

Verify that your cache invalidation is working by:

1. Adding logging to see which cache keys are being invalidated
2. Creating integration tests that verify cache hits/misses after operations
3. Monitoring cache statistics in production

Example test:

```javascript
describe('Cache invalidation', () => {
  it('should invalidate entity cache after update', async () => {
    // Arrange: Create an entity and cache it
    const entity = await repository.save(newEntity);
    await cacheService.set(`myentity:byId:${entity.id}`, entity);
    
    // Act: Update the entity
    entity.name = 'Updated Name';
    await repository.save(entity);
    
    // Assert: Cache should be invalidated
    const cachedEntity = await cacheService.get(`myentity:byId:${entity.id}`);
    expect(cachedEntity).to.be.null;
  });
});
```

## Common Issues and Solutions

### Cache Not Being Invalidated

- Check that `invalidateCache: true` is set in your `withTransaction` options
- Verify the entity has an `id` property
- Ensure `domainName` is correctly set in the repository constructor

### Too Many Keys Being Invalidated

- Use more specific invalidation patterns
- Consider using entity version numbers for more targeted invalidation

### Performance Issues

- Monitor invalidation metrics
- Consider batching invalidation operations
- Use more specific patterns instead of wildcard invalidation when possible

## Monitoring Cache Invalidation

The `CacheInvalidationManager` now tracks metrics on invalidation operations, which can be monitored through:

```javascript
const metrics = cacheInvalidator.getMetrics();
console.log(`Total invalidations: ${metrics.totalInvalidations}`);
console.log(`By entity type:`, metrics.invalidationsByEntityType);
```

## Conclusion

By following this standardized approach to cache invalidation, we ensure that:

1. All repositories handle cache invalidation consistently
2. Cache invalidation happens at the right times in the transaction lifecycle
3. Related caches are properly invalidated to prevent stale data
4. The system is more maintainable with centralized invalidation logic 