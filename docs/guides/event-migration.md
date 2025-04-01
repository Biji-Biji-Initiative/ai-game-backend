# Event Structure Migration Guide

This guide helps developers migrate code to the new standardized event payload structure.

## Overview

We've standardized the domain event structure to improve consistency and reliability. This migration guide explains how to:

1. Update event publishing code to use the standardized structure
2. Update event handling code to work with both legacy and standardized events
3. Use the provided utility functions for backward compatibility

## Legacy vs. Standardized Structure

**Legacy Structure** (varied formats):
```javascript
// Format 1 (data only)
{
  type: 'USER_UPDATED',
  data: {
    userId: '123',
    changes: { name: 'New Name' }
  }
}

// Format 2 (direct properties)
{
  type: 'USER_UPDATED',
  userId: '123',
  changes: { name: 'New Name' }
}
```

**New Standardized Structure**:
```javascript
{
  type: 'USER_UPDATED',
  data: {
    entityId: '123',   // Entity identification
    entityType: 'User' // Entity type
  },
  payload: {           // Event-specific data
    userId: '123',
    changes: { name: 'New Name' },
    entityId: '123',
    entityType: 'User'
  },
  metadata: {          // Event metadata
    timestamp: '2023-01-01T12:00:00Z',
    correlationId: 'user-123-1672577600000'
  }
}
```

## Migration Steps

### 1. Update Event Publishers

If you publish events directly:

```javascript
// BEFORE
eventBus.publish('USER_UPDATED', {
  userId: '123',
  changes: { name: 'New Name' }
});

// AFTER - Option 1: Use standardizeEvent utility
import { standardizeEvent } from '../../core/common/events/eventUtils.js';

eventBus.publish(standardizeEvent({
  type: 'USER_UPDATED',
  data: {
    userId: '123',
    changes: { name: 'New Name' },
    entityId: '123',
    entityType: 'User'
  }
}));

// AFTER - Option 2: Structure manually
eventBus.publish({
  type: 'USER_UPDATED',
  data: {
    entityId: '123',
    entityType: 'User'
  },
  payload: {
    userId: '123',
    changes: { name: 'New Name' },
    entityId: '123',
    entityType: 'User'
  },
  metadata: {
    timestamp: new Date().toISOString(),
    correlationId: `user-123-${Date.now()}`
  }
});
```

For domain entities:

```javascript
// BEFORE - Assuming direct event creation in entity
this._domainEvents.push({
  type: 'USER_UPDATED',
  data: {
    userId: this.id,
    changes: { name: this.name }
  }
});

// AFTER - Use entity.addDomainEvent method
this.addDomainEvent('USER_UPDATED', {
  changes: { name: this.name }
});
```

### 2. Update Event Handlers

```javascript
// BEFORE
eventBus.subscribe('USER_UPDATED', (event) => {
  const userId = event.data?.userId;
  const changes = event.data?.changes;
  
  // Process event...
});

// AFTER - Using utility functions
import { getUserIdFromEvent } from '../../core/common/events/eventUtils.js';

eventBus.subscribe('USER_UPDATED', (event) => {
  const userId = getUserIdFromEvent(event);
  const changes = event.payload?.changes || event.data?.changes;
  
  // Process event...
});
```

### 3. Using Utility Functions

```javascript
import { 
  standardizeEvent, 
  getUserIdFromEvent, 
  getEntityIdFromEvent 
} from '../../core/common/events/eventUtils.js';

// Standardize any event format
const standardized = standardizeEvent(event);

// Get userId from any event format
const userId = getUserIdFromEvent(event);

// Get entity ID from any event format (with optional entity type context)
const challengeId = getEntityIdFromEvent(event, 'challenge');
```

## Testing Migration

To test your migration:

1. For event publishers: Verify events contain both `data` and `payload` properties
2. For event handlers: Test with both old and new event formats
3. For event utilities: Verify they extract the correct values from legacy events

## Common Migration Errors

1. **Missing entityId/entityType**: Ensure these are always provided in both `data` and `payload`
2. **Accessing the wrong property**: Use utility functions to avoid directly accessing event properties
3. **Not handling payload nulls**: Check `event.payload?.property` to handle cases where payload is null

## Timeline

- **Current**: Both formats supported through compatibility utilities
- **Next 6 months**: Phase out direct `data` access in handlers, use `payload` instead
- **Future**: Consider standardizing on `payload` only after all code is updated

For additional assistance, see the detailed examples in `/docs/standards/domain-events.md`. 