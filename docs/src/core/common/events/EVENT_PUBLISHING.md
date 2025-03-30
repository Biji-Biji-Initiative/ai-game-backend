# Domain Event Publishing Pattern

## Overview

This document describes the pattern for publishing domain events in the application. The pattern follows the "collect events, dispatch after save" approach, which ensures that domain events are only published after the relevant state changes have been successfully persisted to the database.

## The Pattern

1. **Collect Events During Domain Operations**: Domain entities register events during their operations
2. **Temporarily Store Events in the Entity**: Events are stored within the entity object
3. **Save Entity to Repository**: The repository persists the entity to the database
4. **Publish Events After Successful Persistence**: Events are published only after the entity has been successfully saved

## Implementation Guidelines

### Domain Entities

Domain entities should:

1. Maintain a collection of domain events (`domainEvents` array)
2. Provide methods to add events to this collection
3. Provide a method to clear events after they have been published

Example:
```javascript
class MyEntity {
  constructor() {
    this.domainEvents = [];
  }
  
  addDomainEvent(event) {
    this.domainEvents.push(event);
  }
  
  clearEvents() {
    this.domainEvents = [];
  }
  
  performOperation() {
    // Perform state change
    this.state = 'new_state';
    
    // Register event to be published later
    this.addDomainEvent(new DomainEvent('OPERATION_PERFORMED', { entityId: this.id }));
  }
}
```

### Repositories

Repositories should:

1. Extract the domain events from the entity before saving
2. Clear the events from the entity to prevent double-publishing
3. Save the entity to the database
4. Publish the collected events only after successful persistence

Example:
```javascript
async save(entity) {
  // Collect domain events for publishing after successful save
  const domainEvents = [...entity.domainEvents];
  
  // Clear the events from the entity to prevent double-publishing
  entity.clearEvents();
  
  // Save the entity to the database
  const savedData = await this.db.save(entity.toDatabase());
  
  // Publish the collected events after successful persistence
  for (const event of domainEvents) {
    await this.eventBus.publish(event);
  }
  
  return this.fromDatabase(savedData);
}
```

## Benefits

This pattern provides several benefits:

1. **Data Consistency**: Events are only published after the entity state is safely persisted
2. **Transactional Integrity**: If the save operation fails, no events are published
3. **Proper Sequencing**: Events are published in the order they were created
4. **Reduced Coupling**: Event publication is decoupled from domain logic

## Anti-Patterns to Avoid

1. **Publishing Events During Domain Operations**: This can lead to events being published even if the save operation fails
2. **Publishing Events Before Save**: This breaks the transactional integrity
3. **Exposing Event Bus to Domain Entities**: Domain entities should not have direct access to the event bus
4. **Not Clearing Events After Publishing**: This can lead to events being published multiple times

## Example Use Cases

1. **Entity Creation**: Publish `ENTITY_CREATED` event after the entity is saved to the database
2. **Status Change**: Publish `STATUS_CHANGED` event after the new status is persisted
3. **Completion Events**: Publish `OPERATION_COMPLETED` events only after the completion state is saved

By following this pattern consistently, we ensure that our event-driven functionality is reliable and maintains data integrity. 