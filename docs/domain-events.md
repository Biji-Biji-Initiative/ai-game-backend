# Domain Event Publishing Guidelines

## Overview

This document describes the standardized pattern for collecting and publishing domain events in our application. Events should be collected during domain operations and published **only after successful database transaction commit**.

## The Problem

Publishing domain events before transaction commit can lead to inconsistencies if the transaction later fails and rolls back. For example:

1. Entity state is changed in memory
2. Events are collected from the entity
3. Database write operation begins
4. Events are published (🚨 TOO EARLY!)
5. Database operation fails and rolls back
6. Now downstream systems that received the event have an inconsistent view of the data

## The Solution: Post-Commit Event Publishing

We've implemented a standardized pattern that ensures events are only published after the database transaction has successfully committed:

1. Collect domain events before database operations
2. Clear events from the entity
3. Perform database operations within a transaction
4. Only if the transaction commits successfully, publish the events

## Implementation Pattern

### Step 1: Collect Domain Events

Before any database operations, collect domain events from the entity:

```javascript
// Extract domain events before saving
const domainEvents = entity.getDomainEvents ? entity.getDomainEvents() : [];

// Clear events from the entity to prevent double publishing
if (entity.clearDomainEvents) {
    entity.clearDomainEvents();
}
```

### Step 2: Use the withTransaction Method

All operations that publish domain events should use the `withTransaction` method from BaseRepository:

```javascript
return this.withTransaction(async (transaction) => {
    // Perform database operations using the transaction object
    const { data, error } = await transaction
        .from(this.tableName)
        .insert(dbData)
        .select()
        .single();
        
    if (error) {
        throw new DatabaseError("Operation failed", { cause: error });
    }
    
    // Create the result model
    const savedEntity = EntityMapper.fromDatabase(data);
    
    // Return both the result and the domain events for publishing after commit
    return {
        result: savedEntity,
        domainEvents: domainEvents
    };
}, {
    publishEvents: true,
    eventBus: this.eventBus
});
```

## How It Works

1. `withTransaction` begins a database transaction
2. Your function is executed with the transaction object
3. If your function returns an object with `{ result, domainEvents }`, the events will be stored
4. After the transaction commits successfully, the domain events are published
5. If any error occurs, the transaction is rolled back and no events are published
6. Your function's result value is returned to the caller

## Example Implementations

### Example 1: UserRepository.save

```javascript
save(user) {
    // Validate user object
    // ...
    
    // Extract domain events before saving
    const domainEvents = user.getDomainEvents ? user.getDomainEvents() : [];
    
    // Clear events from the entity
    if (user.clearDomainEvents) {
        user.clearDomainEvents();
    }
    
    // Use withTransaction to ensure events are published only after successful commit
    return this.withTransaction(async (transaction) => {
        // Database operations...
        
        // Return both the result and the domain events
        return {
            result: savedUser,
            domainEvents: domainEvents
        };
    }, {
        publishEvents: true,
        eventBus: this.eventBus
    });
}
```

### Example 2: UserJourneyRepository.recordEvent

```javascript
async recordEvent(email, eventType, eventData = {}, challengeId = null) {
    // Create and validate event
    // ...
    
    // Collect domain events
    const domainEvents = userJourneyEvent.getDomainEvents();
    userJourneyEvent.clearDomainEvents();
    
    // Use transaction
    return await this.withTransaction(async (transaction) => {
        // Insert into database using transaction
        // ...
        
        // Return both the saved event and domain events
        return {
            result: savedEvent,
            domainEvents: domainEvents
        };
    }, {
        publishEvents: true,
        eventBus: this.eventBus
    });
}
```

## Best Practices

1. **Always** use `withTransaction` when publishing domain events
2. Collect domain events **before** database operations, not after
3. Clear domain events from the entity after collecting them
4. Use `createErrorCollector` for non-critical event publishing operations
5. If an operation modifies multiple entities, collect events from all of them before the transaction
6. Return both the result and domain events from the transaction function

## Error Handling

The `BaseRepository._publishDomainEvents` method handles event publishing errors automatically:

1. Uses `createErrorCollector` to collect errors during publishing
2. Logs errors but doesn't throw them (non-critical)
3. Continues publishing remaining events even if some fail

## When Not Using This Pattern

When domain events don't need database transaction protection (rare), you can still use the `createErrorCollector` pattern:

```javascript
const errorCollector = createErrorCollector();
try {
    await this.eventBus.publish(event.type, event.payload);
} catch (error) {
    errorCollector.collect(error, 'event_publishing');
    this.logger.error('Error publishing event', { error: error.message });
}
```

## Migration Guide

When migrating repositories to this pattern:

1. Identify all repository methods that publish domain events
2. Replace direct event publishing with the `withTransaction` pattern
3. Return both result and domain events from the transaction function
4. Set `publishEvents: true` in the options

## Conclusion

Following this pattern ensures our domain events are only published after successful transactions, maintaining consistency between our database state and published events. This is critical for downstream systems that rely on these events for further processing. 