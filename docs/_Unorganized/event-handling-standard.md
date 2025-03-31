# Domain Event Handling Standard

## Overview

This document outlines the standard approach for domain event handling in our application. Following Domain-Driven Design (DDD) best practices, we use the "collect events, dispatch after save" pattern to ensure data consistency between event publishing and state changes.

## Core Principles

1. **Encapsulation**: Domain events are encapsulated within domain entities
2. **Transaction Safety**: Events are only published after successful persistence of state changes
3. **Consistency**: All domains follow the same event handling pattern
4. **Separation of Concerns**: Domain entities track events, repositories handle publishing

## Standard Event Structure

All domain events should have this structure:

```javascript
{
  type: "EVENT_TYPE", // Constant from EventTypes
  data: {
    entityId: "123", // ID of the source entity
    entityType: "User", // Type of entity that generated the event
    // Other domain-specific data...
  },
  metadata: {
    timestamp: "2023-01-01T00:00:00.000Z", // ISO timestamp
    correlationId: "user-123-1672531200000" // For tracing related events
  }
}
```

## Implementation Guide

### 1. Entity-Level Event Collection

Domain entities should:

```javascript
class MyEntity extends Entity {
  // Method to add domain events
  addDomainEvent(eventType, eventData) {
    if (!this._domainEvents) {
      this._domainEvents = [];
    }
    
    // Create a standardized event structure
    const event = {
      type: eventType,
      data: {
        ...eventData,
        entityId: this.id,
        entityType: this.constructor.name,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        correlationId: `${this.constructor.name.toLowerCase()}-${this.id}-${Date.now()}`
      }
    };
    
    this._domainEvents.push(event);
  }
  
  // Business method example
  changeStatus(newStatus) {
    const oldStatus = this.status;
    this.status = newStatus;
    
    // Record domain event to be published later
    this.addDomainEvent(EventTypes.STATUS_CHANGED, {
      oldStatus,
      newStatus,
    });
  }
}
```

### 2. Repository-Level Event Publishing

Repositories should use the `withTransaction` pattern:

```javascript
class MyRepository extends BaseRepository {
  async save(entity) {
    // Extract domain events before saving
    const domainEvents = entity.getDomainEvents ? entity.getDomainEvents() : [];
    
    // Clear events from the entity to prevent double publishing
    if (entity.clearDomainEvents) {
      entity.clearDomainEvents();
    }
    
    // Use withTransaction to ensure events are only published after successful commit
    return this.withTransaction(async (transaction) => {
      // Save the entity to database...
      
      // Return both the result and the domain events for publishing after commit
      return {
        result: savedEntity,
        domainEvents: domainEvents
      };
    }, {
      publishEvents: true,
      eventBus: this.eventBus
    });
  }
}
```

### 3. Event Handler Registration

Event handlers should be registered in a centralized location:

```javascript
// In your domain's event handler registration file
function registerEventHandlers() {
  eventBus.subscribe(EventTypes.USER_CREATED, async (event) => {
    // Handle the event...
  });
  
  eventBus.subscribe(EventTypes.CHALLENGE_COMPLETED, async (event) => {
    // Handle the event...
  });
}
```

## Best Practices

1. **Always Use the Entity for Event Creation**:
   - Use entity methods to record domain events
   - Avoid directly publishing events
   
2. **Strongly Type Events**:
   - Use predefined constants from `EventTypes`
   - Include relevant context in event data
   
3. **Group Related Handlers**:
   - Organize event handlers by domain
   - Register handlers in domain-specific modules
   
4. **Ensure Idempotent Handlers**:
   - Design handlers to be safely re-executable
   - Avoid side effects that can't be repeated

5. **Consider Event Versioning**:
   - Include version information for long-lived events
   - Design for backward compatibility

## Anti-Patterns to Avoid

1. ❌ **Direct event publishing outside repositories**
2. ❌ **Inconsistent event structures**
3. ❌ **Publishing events before state is persisted**
4. ❌ **Using events for queries/lookups instead of commands**
5. ❌ **Tight coupling between event publishers and handlers**

## Migration Guide

When migrating existing code:

1. Extend entities from base `Entity` class
2. Replace direct event publishing with `addDomainEvent()`
3. Ensure repositories use the `withTransaction` pattern
4. Update event handlers to work with standardized event structure 