# Domain Event Handling Standard

## Overview

This document outlines the standardized approach to domain event handling in our DDD architecture. It provides clear guidelines on how to implement, collect, and publish domain events across all domains.

> **IMPORTANT**: We have implemented a strict standardized event format with no backward compatibility. All domain events must follow the structure outlined in this document, with no exceptions. Legacy event publishing patterns are no longer supported.

## Core Principles

1. **Entity-Based Event Collection**
   - Domain events should be collected in entities via `addDomainEvent()`
   - Events are only published after successful persistence
   - This ensures data consistency and prevents subscribers from acting on data that doesn't exist

2. **Standardized Event Structure**
   - All domain events must follow a consistent structure
   - Events contain essential metadata for tracing and debugging
   - Events are self-contained with all necessary context
   - **Event format is strictly enforced at the infrastructure level**

3. **Transaction-Based Publishing**
   - Events are published only after the transaction commits successfully
   - The repository is responsible for publishing events
   - This approach makes event publishing more reliable and consistent

## Standardized Event Structure

All domain events must follow this structure with no exceptions:

```javascript
{
  type: "EVENT_TYPE", // Constant from EventTypes - REQUIRED
  data: {
    entityId: "123", // ID of the source entity - REQUIRED
    entityType: "User", // Type of entity that generated the event - REQUIRED
    // Other domain-specific data...
  },
  metadata: {
    timestamp: "2023-01-01T00:00:00.000Z", // ISO timestamp - auto-added if missing
    correlationId: "user-123-1672531200000" // For tracing related events - auto-added if missing
  }
}
```

> **Note**: The event bus will reject any events that don't conform to this structure. All events must include `type`, `data` with `entityId` and `entityType` properties.

## Implementation Patterns

### 1. Entity Implementation

All domain entities should implement event collection through the Entity base class:

```javascript
// All entities should extend the Entity base class
class User extends Entity {
  constructor(data) {
    super(data?.id); // Initialize with ID or generate new one
    // Regular entity initialization...
  }

  // Example domain method that raises an event
  activate() {
    if (this.status !== 'active') {
      this.status = 'active';
      this.updatedAt = new Date().toISOString();
      
      // Collect the domain event for later publishing
      this.addDomainEvent('USER_ACTIVATED', {
        // Additional context - entity ID and type are added automatically
        previousStatus: this.status
      });
    }
    return this;
  }
}
```

### 2. Repository Implementation

Repositories are responsible for persisting the entity and publishing its events:

```javascript
class UserRepository extends BaseRepository {
  // Save method with event handling
  async save(user) {
    // Validate the user
    if (!user || !user.isValid()) {
      throw new ValidationError('Invalid user data');
    }
    
    // Collect domain events before saving
    const domainEvents = user.getDomainEvents();
    
    return this.withTransaction(async (transaction) => {
      // Database operations to save the user...
      const result = /* saved user data */;
      
      // Return both the result and domain events
      return {
        result: savedUser,
        domainEvents: domainEvents
      };
    }, {
      publishEvents: true, // Enable event publishing
      eventBus: this.eventBus,
      invalidateCache: true
    });
  }
}
```

### 3. Event Bus Implementation

Our `RobustEventBus` strictly enforces the standard event format:

```javascript
// The event bus now only accepts standardized events
await eventBus.publish({
  type: 'USER_REGISTERED',
  data: {
    entityId: '123', // REQUIRED
    entityType: 'User', // REQUIRED
    email: 'user@example.com'
  },
  metadata: {
    // Optional - will be auto-added if missing
    correlationId: 'registration-flow-5674',
    timestamp: new Date().toISOString()
  }
});
```

## Best Practices

1. **Always Use Entity Methods to Change State**
   - State changes should go through entity methods, which can collect appropriate events
   - Don't modify entity state directly outside the entity

2. **Keep Events Focused**
   - Each event should represent a single logical change
   - Don't combine multiple changes into a single event

3. **Include Sufficient Context**
   - Events should contain enough information for handlers to process them independently
   - Avoid requiring event handlers to query additional data when possible

4. **Update Event Handlers**
   - All event handlers must access data from the standardized event structure
   - Example:
     ```javascript
     // Event handler
     eventBus.on('USER_ACTIVATED', (event) => {
       const { entityId, entityType, previousStatus } = event.data;
       const { timestamp, correlationId } = event.metadata;
       
       // Process the event
     });
     ```

5. **No Direct Publishing**
   - Never publish events directly - always use entity-based collection
   - The only exception is for system events that don't have a corresponding entity

## Breaking Changes from Previous Pattern

The updated event handling system has these breaking changes:

1. **No String-Based Event Publishing**
   - `eventBus.publish('EVENT_NAME', { data })` is no longer supported
   - Always use the standardized object structure

2. **Required Entity Context**
   - All events must include `entityId` and `entityType` in the data object
   - System events without entities should use appropriate placeholders

3. **Strict Structure Validation**
   - The event bus will reject malformed events that don't follow the standard structure
   - Validation happens at publish time

## Example Workflow

1. **Domain Logic**
   ```javascript
   // Service method
   async updateUserProfile(userId, profileData) {
     // Get the user
     const user = await this.userRepository.findById(userId);
     
     // Update via domain method that collects events
     user.updateProfile(profileData);
     
     // Save the user, which also publishes events
     return await this.userRepository.save(user);
   }
   ```

2. **Event Handler**
   ```javascript
   // Register event handler
   eventBus.on('USER_PROFILE_UPDATED', async (event) => {
     const { entityId, entityType, changedFields } = event.data;
     const { timestamp, correlationId } = event.metadata;
     
     // Respond to the event
     await notificationService.sendProfileUpdateNotification(entityId, changedFields);
   });
   ```

By strictly following this pattern, we ensure consistent, reliable event publishing throughout the entire codebase. 