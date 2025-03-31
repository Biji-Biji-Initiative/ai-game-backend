# PERF-1: Implement Robust Cache Invalidation

## Problem Statement

The codebase currently has inconsistent cache invalidation:

1. **Ad-hoc Invalidation**: Some repositories implement their own cache invalidation logic with direct cache access.
2. **Missing Integration**: Despite having a good `CacheInvalidationManager`, it's not consistently used across repositories.
3. **Inconsistent Patterns**: Different domains follow different patterns for invalidation.
4. **Risk of Stale Data**: Without systematic invalidation, users may see outdated data.

## Solution Approach

We'll implement a comprehensive cache invalidation strategy that:

1. **Centralizes Invalidation Logic**: Use the existing `CacheInvalidationManager` for all invalidation needs.
2. **Standardizes Invalidation Patterns**: Define when and how caches should be invalidated.
3. **Integrates with Domain Events**: Use domain events to trigger cache invalidation automatically.
4. **Ensures Consistency**: Makes sure all repositories handle invalidation the same way.

## Implementation Steps

### 1. Enhance the `BaseRepository` Class

The `BaseRepository` already has a `withTransaction` method that handles domain events. We'll extend this to also handle cache invalidation:

```javascript
async withTransaction(fn, options = {}) {
  const { 
    publishEvents = true, 
    eventBus = this.eventBus,
    invalidateCache = true,   // NEW: Option to control cache invalidation
    cacheInvalidator = this.cacheInvalidator  // NEW: Cache invalidation manager
  } = options;
  
  // ... existing transaction logic ...
  
  // After successful commit:
  
  // 1. Publish domain events if enabled
  if (publishEvents && collectedEvents.length > 0 && eventBus) {
    await this._publishDomainEvents(collectedEvents, eventBus);
  }
  
  // 2. NEW: Invalidate related caches if enabled
  if (invalidateCache && cacheInvalidator && result) {
    await this._invalidateRelatedCaches(result, cacheInvalidator);
  }
  
  return result;
}

// NEW: Helper method to invalidate related caches
async _invalidateRelatedCaches(result, cacheInvalidator) {
  // Handle single entity or collections
  const entities = Array.isArray(result) ? result : [result];
  
  for (const entity of entities) {
    if (!entity || !entity.id) continue;
    
    // Determine entity type from repository domain name
    const entityType = this.domainName.toLowerCase();
    
    // Invalidate entity and all related caches
    await cacheInvalidator.invalidateEntity(entityType, entity.id);
    
    // For specific entity types, perform additional invalidation
    switch (entityType) {
      case 'user':
        await cacheInvalidator.invalidateUserCaches(entity.id);
        break;
      case 'challenge':
        await cacheInvalidator.invalidateChallengeCaches(entity.id);
        break;
      case 'evaluation':
        // Get related IDs from the entity if available
        const userId = entity.userId || null;
        const challengeId = entity.challengeId || null;
        await cacheInvalidator.invalidateEvaluationCaches(entity.id, userId, challengeId);
        break;
      // Add other domain-specific invalidation logic as needed
    }
  }
}
```

### 2. Update `BaseRepository` Constructor

Add the cache invalidation manager to the `BaseRepository` constructor:

```javascript
constructor(options = {}) {
  const {
    db,
    tableName,
    domainName = 'unknown',
    logger: loggerInstance,
    maxRetries = 3,
    validateUuids = false,
    eventBus = null,
    cacheInvalidator = null  // NEW: Cache invalidation manager
  } = options;

  // ... existing code ...
  
  this.cacheInvalidator = cacheInvalidator || getCacheInvalidationManager();
}
```

### 3. Create Cache Invalidation Event Handlers

Add event handlers that trigger cache invalidation based on domain events:

```javascript
// In src/application/events/CacheInvalidationEventHandlers.js

import { EventTypes } from '../../core/common/events/domainEvents.js';
import { getCacheInvalidationManager } from '../../core/infra/cache/cacheFactory.js';

export function registerCacheInvalidationEventHandlers(eventBus) {
  const cacheInvalidator = getCacheInvalidationManager();
  
  // User-related events
  eventBus.subscribe(EventTypes.USER_CREATED, async (event) => {
    await cacheInvalidator.invalidateUserCaches(event.data.userId);
    await cacheInvalidator.invalidateListCaches('user');
  });
  
  eventBus.subscribe(EventTypes.USER_UPDATED, async (event) => {
    await cacheInvalidator.invalidateUserCaches(event.data.userId);
  });
  
  // Challenge-related events
  eventBus.subscribe(EventTypes.CHALLENGE_CREATED, async (event) => {
    await cacheInvalidator.invalidateChallengeCaches(event.data.challengeId);
    await cacheInvalidator.invalidateListCaches('challenge');
    
    // Also invalidate user's challenges if userId is available
    if (event.data.userId) {
      await cacheInvalidator.invalidatePattern(`challenge:byUser:${event.data.userId}:*`);
    }
  });
  
  // ... add more event handlers for other domain events ...
}
```

### 4. Update Repository Implementations

Update specific repositories to use the centralized invalidation logic:

1. **Challenge Repository**:
```javascript
// In save() method
return this.withTransaction(async (transaction) => {
  // ... existing save logic ...
  
  return {
    result: savedChallenge,
    domainEvents: domainEvents
  };
}, {
  publishEvents: true,
  eventBus: this.eventBus,
  invalidateCache: true  // Ensure cache invalidation happens
});
```

2. **User Repository**:
```javascript
// Similar update to withTransaction call
```

3. **Evaluation Repository**:
```javascript
// Similar update to withTransaction call
```

### 5. Add Cache Invalidation Dashboard Metrics

Add metrics collection to monitor cache invalidation:

```javascript
// In CacheInvalidationManager.js
constructor(cacheService) {
  // ... existing code ...
  
  this.metrics = {
    invalidationsByEntityType: {},
    patternInvalidations: 0,
    keyInvalidations: 0,
    failedInvalidations: 0
  };
}

// Update methods to track metrics
async invalidateEntity(entityType, entityId) {
  // ... existing code ...
  
  // Track metrics
  if (!this.metrics.invalidationsByEntityType[entityType]) {
    this.metrics.invalidationsByEntityType[entityType] = 0;
  }
  this.metrics.invalidationsByEntityType[entityType]++;
  
  // ... rest of method ...
}
```

### 6. Update Dependency Injection Container

Make sure all repositories get the cache invalidation manager:

```javascript
// In dependency container setup
import { getCacheInvalidationManager } from '../core/infra/cache/cacheFactory.js';

// When setting up repositories
container.register('userRepository', (c) => {
  return new UserRepository({
    db: c.resolve('dbClient'),
    logger: c.resolve('logger'),
    eventBus: c.resolve('eventBus'),
    cacheInvalidator: getCacheInvalidationManager()  // Add this line
  });
});

// Do the same for other repositories
```

## Benefits

1. **Consistency**: Standardized approach across all repositories
2. **Automatic Invalidation**: Cache invalidation triggered by domain events
3. **Improved Performance**: Ensures fresh data without manual invalidation
4. **Maintainability**: Centralized logic makes it easier to update invalidation rules
5. **Monitoring**: Better insights into cache invalidation patterns

## Testing Strategy

1. **Unit Tests**: Test the `_invalidateRelatedCaches` method in isolation
2. **Integration Tests**: Verify correct invalidation behavior for each entity type
3. **Performance Tests**: Measure cache hit/miss rates before and after changes

## Rollout Plan

1. **Phase 1**: Update `BaseRepository` with cache invalidation logic
2. **Phase 2**: Register event handlers for cache invalidation
3. **Phase 3**: Update specific repositories to use the central invalidation logic
4. **Phase 4**: Add monitoring and validate performance improvements 