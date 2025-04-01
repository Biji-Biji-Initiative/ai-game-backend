# Domain Event Standardization Guide

This guide explains how to work with our official standardized domain event structure and provides utilities to simplify adoption.

## Event Structure Standard

All domain events in the system adhere to this standard structure:

```javascript
{
  type: "EVENT_TYPE", // Event type from EventTypes enum
  data: {
    entityId: "123",  // ID of the entity that triggered the event
    entityType: "User", // Type of entity that triggered the event
    // All event-specific data goes here...
    userId: "456", // Common for user-related events
    // ... other properties
  },
  metadata: {
    timestamp: "2023-01-01T12:00:00Z", // When the event occurred
    correlationId: "user-123-1672531200000" // For tracing related events
  }
}
```

## Key Points

1. The `data` object contains **all** event information, including required `entityId` and `entityType`
2. User-related data, like `userId`, should be included in the `data` object
3. The `metadata` object contains information about the event itself, not about the business operation
4. All events must include these required properties - they are validated at the infrastructure level

## Utility Functions

To simplify working with domain events, we provide utility functions in `src/core/common/events/eventUtils.js`:

### standardizeEvent(event)

Ensures an event follows the standardized structure:

```javascript
import { standardizeEvent } from '../../core/common/events/eventUtils.js';

// Takes a potentially incomplete event and standardizes it
const standardized = standardizeEvent({
  type: 'USER_UPDATED',
  data: {
    entityId: '123',
    entityType: 'User',
    name: 'New Name'
  }
});

// standardized event will include required metadata
```

### getUserIdFromEvent(event)

Extracts user ID from an event:

```javascript
import { getUserIdFromEvent } from '../../core/common/events/eventUtils.js';

eventBus.subscribe('USER_UPDATED', (event) => {
  const userId = getUserIdFromEvent(event); // Returns event.data.userId or userEmail
  
  // Process using userId...
});
```

### getEntityIdFromEvent(event, entityType)

Extracts entity ID from an event, optionally filtering by entity type:

```javascript
import { getEntityIdFromEvent } from '../../core/common/events/eventUtils.js';

eventBus.subscribe('CHALLENGE_COMPLETED', (event) => {
  const challengeId = getEntityIdFromEvent(event, 'Challenge');
  
  // Process using challengeId...
});
```

## Guidelines for Event Publishing

### Using Entity Base Class

When working with domain entities, use the `addDomainEvent` method:

```javascript
// Inside a domain entity method
this.addDomainEvent('USER_PROFILE_UPDATED', {
  changes: { name: 'New Name' },
  // No need to add entityId or entityType - handled automatically
});
```

### Direct Event Bus Publishing

When publishing events directly (uncommon):

```javascript
import { standardizeEvent } from '../../core/common/events/eventUtils.js';

eventBus.publish(standardizeEvent({
  type: 'SYSTEM_INITIALIZED',
  data: {
    entityId: 'system-123',
    entityType: 'System',
    version: '1.0.0'
  }
}));
```

## Guidelines for Event Handling

When handling events:

```javascript
import { getUserIdFromEvent } from '../../core/common/events/eventUtils.js';

eventBus.subscribe('USER_CREATED', async (event) => {
  // Use utility functions to extract commonly needed IDs
  const userId = getUserIdFromEvent(event);
  
  // Access other data directly from event.data
  const { fullName, email } = event.data;
  
  // Access metadata when needed
  const { timestamp, correlationId } = event.metadata;
  
  // Handle the event...
});
```

## Common Mistakes

1. **Accessing data from wrong location**: Always access event data from `event.data`, not from the root event object
2. **Missing required fields**: Events must have `entityId` and `entityType` in the data object
3. **Putting business data in metadata**: The metadata object is for event metadata only, not business data

## Use with BaseRepository

The BaseRepository handles publishing domain events collected from entities:

```javascript
// After saving an entity
const domainEvents = entity.getDomainEvents();
entity.clearDomainEvents();

// Events are published after successful commit
await this._publishDomainEvents(domainEvents, this.eventBus);
```

By following these guidelines, we ensure consistent, reliable event handling throughout the system. 