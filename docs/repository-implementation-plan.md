# Repository Implementation Plan for Standardized Domain Events

This document outlines the step-by-step plan for implementing our standardized entity-based domain event collection pattern across all repositories in the codebase.

## Repositories to Update

Based on the codebase analysis, we need to update the following repositories:

1. **Core Domain Repositories**:
   - `UserRepository` (already updated)
   - `ChallengeRepository`
   - `FocusAreaRepository`
   - `EvaluationRepository`
   - `ProgressRepository`
   - `PersonalityRepository`
   - `UserJourneyRepository`
   - `AdaptiveRepository`

2. **Subdomain Repositories**:
   - `ChallengeTypeRepository`
   - `DifficultyLevelRepository`
   - `FormatTypeRepository`
   - `FocusAreaConfigRepository`
   - `EvaluationCategoryRepository`

## Required Changes for Each Repository

For each repository, the following changes need to be implemented:

### 1. Modify Save Method

The `save` method needs to be updated to:
- Collect domain events from entities
- Pass these events to the transaction
- Clear events from the entity after collection

```javascript
async save(entity) {
  if (!(entity instanceof EntityType)) {
    throw new ValidationError('Invalid entity type');
  }
  
  // Collect domain events before saving
  const domainEvents = entity.getDomainEvents();
  
  return this.withTransaction(async (transaction) => {
    // Database operations...
    
    // Clear domain events from the original entity
    entity.clearDomainEvents();
    
    // Return both the result and the domain events
    return {
      result: savedEntity,
      domainEvents
    };
  }, {
    publishEvents: true,
    eventBus: this.eventBus
  });
}
```

### 2. Modify Delete Method

The `delete` method needs to be updated to:
- Find the entity first
- Add a deletion event to the entity
- Collect events before deletion
- Pass these events to the transaction

```javascript
async delete(id) {
  // Find the entity first
  const entity = await this.findById(id, true);
  
  // Add domain event for deletion
  entity.addDomainEvent(EventTypes.ENTITY_DELETED, {
    action: 'deleted'
  });
  
  // Collect domain events
  const domainEvents = entity.getDomainEvents();
  
  return this.withTransaction(async (transaction) => {
    // Delete database record...
    
    // Clear domain events
    entity.clearDomainEvents();
    
    return {
      result: { deleted: true, id },
      domainEvents
    };
  }, {
    publishEvents: true,
    eventBus: this.eventBus
  });
}
```

### 3. Modify Batch Operations

Methods like `saveBatch` need to:
- Collect events from all entities
- Pass all events to the transaction
- Clear events from all entities

### 4. Remove Direct Event Publishing

Remove all direct calls to `eventBus.publish()`, replacing them with entity-based event collection.

## Example Implementation

Here's a complete example for updating `FocusAreaRepository`:

```javascript
async save(focusArea) {
  if (!(focusArea instanceof FocusArea)) {
    throw new ValidationError('Object must be a FocusArea instance', {
      entityType: this.domainName
    });
  }
  
  // Collect domain events before saving
  const domainEvents = focusArea.getDomainEvents();
  
  return this.withTransaction(async (transaction) => {
    // Check if this is a new focus area or an update
    const existingFocusArea = await this.findById(focusArea.id).catch(() => null);
    const isUpdate = existingFocusArea !== null;
    
    // Convert focus area to database format
    const focusAreaData = {
      id: focusArea.id,
      user_id: focusArea.userId,
      name: focusArea.name,
      description: focusArea.description || '',
      priority: focusArea.priority || 1,
      metadata: focusArea.metadata || {},
      created_at: focusArea.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    let result;
    
    if (isUpdate) {
      // Update existing focus area
      const { data, error } = await transaction
        .from(this.tableName)
        .update(focusAreaData)
        .eq('id', focusArea.id)
        .select()
        .single();
        
      if (error) {
        throw new DatabaseError(`Failed to update focus area: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'update',
          metadata: { focusAreaId: focusArea.id }
        });
      }
      result = data;
    }
    else {
      // Insert new focus area
      const { data, error } = await transaction
        .from(this.tableName)
        .insert(focusAreaData)
        .select()
        .single();
        
      if (error) {
        throw new DatabaseError(`Failed to create focus area: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'create',
          metadata: { focusAreaId: focusArea.id }
        });
      }
      result = data;
    }
    
    // Create domain object from database result
    const savedFocusArea = FocusArea.fromDatabase(result);
    
    // Clear domain events from the original entity
    focusArea.clearDomainEvents();
    
    return {
      result: savedFocusArea,
      domainEvents
    };
  }, {
    publishEvents: true,
    eventBus: this.eventBus,
    invalidateCache: true,
    cacheInvalidator: this.cacheInvalidator
  });
}
```

## Implementation Steps

1. Create a branch for repository updates: `git checkout -b feature/domain-event-standardization-repositories`

2. For each repository:
   - Verify that the associated entity extends the base `Entity` class
   - Update the `save` method to collect and return domain events
   - Update the `delete` method to add and collect domain events
   - Update batch operations to follow the same pattern
   - Remove all direct event publishing code
   - Add tests to verify correct event collection and publishing

3. Update repository tests to verify:
   - Events are collected from entities
   - Events are passed to the transaction
   - Events are cleared from entities after collection
   - No direct event publishing occurs

4. Run integration tests to ensure the full flow works correctly

5. Document any repository-specific considerations

## Migration Strategy

We'll follow this migration approach:

1. **Repository-by-Repository**: Update one repository at a time, starting with the most critical ones
2. **Testing After Each Update**: Run tests after each repository update to ensure functionality
3. **Deployment**: Deploy in phases, starting with less critical repositories

## Testing Verification

For each repository update, verify:

1. Domain events are collected correctly
2. Events are published after successful transactions
3. The standardized event structure is maintained
4. No events are published for failed transactions
5. Legacy code using these repositories continues to work

## Rollback Plan

In case of issues:
1. The updated repositories should be compatible with existing code
2. We can temporarily reintroduce direct event publishing if needed

## Timeline

1. Week 1: Update core domain repositories
2. Week 2: Update subdomain repositories
3. Week 3: Test and refine
4. Week 4: Deploy to production 