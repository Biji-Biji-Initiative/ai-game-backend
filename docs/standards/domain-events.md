# Domain Event Standards

## Standardized Event Payload Structure

All domain events in the system follow a consistent structure to improve reliability, maintainability, and debugging. This document outlines the standardized format that all event publishers and subscribers should conform to.

## Event Structure

Every domain event published in the system follows this structure:

```javascript
{
  // Type of the event from EventTypes enum
  type: 'EVENT_TYPE',
  
  // Essential identification data - ALWAYS AVAILABLE
  data: {
    entityId: '123',   // ID of the entity that triggered the event
    entityType: 'User' // Type of the entity that triggered the event
  },
  
  // Extended data specific to the event - ALWAYS AVAILABLE
  payload: {
    userId: '456',            // User ID related to the event (if applicable)
    // ...other event-specific fields
    entityId: '123',          // Duplicated from data for backward compatibility
    entityType: 'User'        // Duplicated from data for backward compatibility
  },
  
  // Metadata about the event itself
  metadata: {
    timestamp: '2023-01-01T12:00:00Z',                // When the event was created
    correlationId: 'user-123-1672577600000'           // For tracing related events
  }
}
```

## Field Descriptions

### Required Fields

- **type**: The event type identifier from the EventTypes enum.
- **data.entityId**: The ID of the entity that triggered the event.
- **data.entityType**: The type of entity that triggered the event.
- **payload**: Contains the complete event data, including all fields needed by handlers.

### Common Optional Fields

- **payload.userId**: The ID of the user related to the event (if applicable).
- **metadata.correlationId**: An identifier to correlate related events.
- **metadata.timestamp**: When the event was created.

## Publishing Events

When publishing events, use the Entity base class's `addDomainEvent` method, which automatically structures events properly:

```javascript
// Inside an entity method
this.addDomainEvent(EventTypes.USER_UPDATED, {
  userId: this.id,
  changes: { name: this.name }
});
```

## Handling Events

When handling events, use the utility functions from `eventUtils.js` to extract fields consistently:

```javascript
import { getUserIdFromEvent, getEntityIdFromEvent } from '../../core/common/events/eventUtils.js';

eventBus.subscribe(EventTypes.USER_UPDATED, async (event) => {
  // Get userId using the utility function (handles both data and payload locations)
  const userId = getUserIdFromEvent(event);
  
  // Get entityId with optional type context
  const entityId = getEntityIdFromEvent(event, 'user');
  
  // Access other payload fields directly
  const changes = event.payload.changes;
});
```

## Standardization Utilities

The system includes utilities to standardize events for backward compatibility:

- `standardizeEvent(event)`: Ensures an event follows the standard structure
- `getUserIdFromEvent(event)`: Extracts userId from an event regardless of structure
- `getEntityIdFromEvent(event, entityType)`: Extracts entityId from an event

## Backward Compatibility

For backward compatibility, event handlers should use the utility functions when accessing event data. These functions handle both the new standardized format and legacy formats. 