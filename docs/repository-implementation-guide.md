# Repository Implementation Guide for Entity-Based Event Collection

This guide provides detailed step-by-step instructions for updating repositories to use the standardized entity-based domain event collection pattern.

## Overview

The new pattern requires these key changes:
1. Replacing direct `eventBus.publish()` calls with entity-based event collection
2. Using the entity's methods to collect and clear domain events
3. Ensuring all events are published after successful transactions
4. Removing any legacy event publishing code

## Repository Update Checklist

For each repository, follow these steps:

1. [ ] Update the `save` method
2. [ ] Update the `delete` method
3. [ ] Update any batch operation methods
4. [ ] Remove direct event publishing code

## Step 1: Updating the `save` Method

### Before:
```javascript
async save(entity) {
  // Database operations...
  
  // Direct event publishing
  try {
    await this.eventBus.publish(EventTypes.ENTITY_UPDATED, {
      entityId: entity.id,
      changes: { /* changes */ }
    });
  } catch (error) {
    this._log('error', 'Failed to publish event', { error });
  }
  
  return savedEntity;
}
```

### After:
```javascript
async save(entity) {
  // Collect domain events from the entity before saving
  const domainEvents = entity.getDomainEvents();
  
  return this.withTransaction(async (transaction) => {
    // Database operations using transaction...
    
    // Clear domain events from the original entity
    entity.clearDomainEvents();
    
    // Return both the result and domain events for publishing
    return {
      result: savedEntity,
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

### Key Changes:
1. Replace `this._withRetry()` or direct database operations with `this.withTransaction()`
2. Collect domain events before any database operations
3. Use the transaction for all database operations
4. Clear domain events after collecting them
5. Return both the result and domain events
6. Set `publishEvents: true` in the transaction options

## Step 2: Updating the `delete` Method

### Before:
```javascript
async delete(id) {
  await this.findById(id, true); // Throws if not found
  
  // Database operations...
  
  // Direct event publishing
  try {
    await this.eventBus.publish(EventTypes.ENTITY_DELETED, {
      entityId: id
    });
  } catch (error) {
    this._log('error', 'Failed to publish event', { error });
  }
  
  return true;
}
```

### After:
```javascript
async delete(id) {
  return this.withTransaction(async (transaction) => {
    // First find the entity to ensure it exists
    const { data: entityRecord, error: findError } = await transaction
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    if (findError) {
      throw new DatabaseError(`Failed to find entity for deletion: ${findError.message}`, {
        cause: findError,
        entityType: this.domainName,
        operation: 'delete',
        metadata: { id }
      });
    }
    
    if (!entityRecord) {
      throw new EntityNotFoundError(`Entity with ID ${id} not found`, {
        entityId: id,
        entityType: this.domainName
      });
    }
    
    // Convert to domain entity to collect events
    const entity = EntityClass.fromDatabase(entityRecord);
    
    // Add domain event for deletion
    entity.addDomainEvent(EventTypes.ENTITY_DELETED, {
      entityId: id,
      action: 'deleted'
    });
    
    // Collect domain events from the entity
    const domainEvents = entity.getDomainEvents();
    
    // Delete from the database
    const { error: deleteError } = await transaction
      .from(this.tableName)
      .delete()
      .eq('id', id);
      
    if (deleteError) {
      throw new DatabaseError(`Failed to delete entity: ${deleteError.message}`, {
        cause: deleteError,
        entityType: this.domainName,
        operation: 'delete',
        metadata: { id }
      });
    }
    
    // Clear events from entity
    entity.clearDomainEvents();
    
    return {
      result: { deleted: true, id },
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

### Key Changes:
1. Find the entity inside the transaction
2. Create a domain entity instance
3. Add a deletion event to the entity
4. Collect domain events from the entity
5. Perform deletion inside the transaction
6. Return both the result and domain events

## Step 3: Updating Batch Operations

### Before:
```javascript
async saveBatch(entities) {
  const savedEntities = [];
  
  for (const entity of entities) {
    try {
      const savedEntity = await this.save(entity);
      savedEntities.push(savedEntity);
      
      // Direct event publishing
      await this.eventBus.publish(EventTypes.ENTITY_BATCH_UPDATED, {
        entityId: entity.id
      });
    } catch (error) {
      this._log('error', 'Failed to save entity', { error });
    }
  }
  
  return savedEntities;
}
```

### After:
```javascript
async saveBatch(entities) {
  return this.withTransaction(async (transaction) => {
    const savedEntities = [];
    const allDomainEvents = [];
    const errorCollector = createErrorCollector();
    
    for (const entity of entities) {
      try {
        // Collect domain events from each entity
        const entityEvents = entity.getDomainEvents();
        allDomainEvents.push(...entityEvents);
        
        // Clear events from the entity so they don't get published twice
        entity.clearDomainEvents();
        
        // Save entity using the transaction
        const dbData = EntityMapper.toDatabase(entity);
        
        const { data, error } = await transaction
          .from(this.tableName)
          .upsert(dbData, { onConflict: 'id' })
          .select()
          .single();
          
        if (error) {
          throw new DatabaseError(`Failed to save entity: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'saveBatch',
            metadata: { entityId: entity.id }
          });
        }
        
        // Create domain object from database result
        const savedEntity = EntityClass.fromDatabase(data);
        savedEntities.push(savedEntity);
      } catch (error) {
        errorCollector.collect(error, `save_entity_${entity.id}`);
        this._log('error', 'Error saving entity in batch', {
          entityId: entity.id,
          error: error.message
        });
      }
    }
    
    // If all failed, throw an error
    if (savedEntities.length === 0 && errorCollector.hasErrors()) {
      const errors = errorCollector.getErrors();
      throw new DatabaseError(`Failed to save any entities in batch: ${errors[0].error.message}`, {
        entityType: this.domainName,
        operation: 'saveBatch',
        metadata: { errorCount: errors.length }
      });
    }
    
    return {
      result: savedEntities,
      domainEvents: allDomainEvents
    };
  }, {
    publishEvents: true,
    eventBus: this.eventBus,
    invalidateCache: true,
    cacheInvalidator: this.cacheInvalidator
  });
}
```

### Key Changes:
1. Perform all operations inside a single transaction
2. Collect events from all entities
3. Clear events from each entity after collection
4. Return both the result and all collected domain events

## Step 4: Testing Your Changes

For each repository update, test:

1. **Individual save**:
   ```javascript
   const entity = new Entity({...});
   entity.update({...}); // This should add a domain event
   const saved = await repository.save(entity);
   ```

2. **Batch operations**:
   ```javascript
   const entities = [new Entity({...}), new Entity({...})];
   entities[0].update({...}); // This should add a domain event
   const saved = await repository.saveBatch(entities);
   ```

3. **Delete operation**:
   ```javascript
   const deleted = await repository.delete(id);
   ```

4. **Transaction rollback**:
   ```javascript
   // Create entity that will trigger validation error
   const invalidEntity = new Entity({...invalid data...});
   
   // This should fail and no events should be published
   try {
     await repository.save(invalidEntity);
   } catch (error) {
     // Expected
   }
   ```

## Implementation Order

1. Start with repositories that are already mostly compliant (e.g., UserRepository)
2. Then update core domain repositories with the most event publishing
3. Finally update secondary repositories

## Common Issues and Solutions

1. **Events not being published**:
   - Check that `publishEvents: true` is set
   - Verify that domain entities extend the base `Entity` class

2. **Events being published twice**:
   - Make sure to call `entity.clearDomainEvents()` after collecting events

3. **Transaction not used properly**:
   - Ensure all database operations use the transaction parameter 