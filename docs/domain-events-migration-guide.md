# Domain Events Migration Guide

This document provides a comprehensive guide for migrating from direct event publishing to the standardized entity-based domain event collection pattern. Follow these steps to update your code consistently across the codebase.

## Overview of the Migration

We're transitioning from directly calling `eventBus.publish()` to using entity-based event collection, where:

1. Domain events are collected by entities via `entity.addDomainEvent()`
2. Repositories retrieve these events via `entity.getDomainEvents()`
3. Repositories publish these events after successful transactions
4. Event handlers receive a standardized event structure

**IMPORTANT CHANGE**: The `eventBus.publish()` method now only accepts the standardized event object format. The string-based approach (`eventBus.publish('EVENT_TYPE', eventData)`) is no longer supported.

## Step 1: Identifying Places to Update

First, identify all the places in your code where direct event publishing is used:

```bash
grep -r "eventBus.publish" --include="*.js" src/
```

Common patterns to look for:

```javascript
// Old pattern 1: Direct publishing with eventType and data
await eventBus.publish('USER_STATUS_CHANGED', {
  userId: 'user-123',
  oldStatus: 'pending',
  newStatus: 'active'
});

// Old pattern 2: Using named methods
await userEvents.publishUserCreated(userId, email);

// Old pattern 3: Using domain event helpers
await domainEvents.publishEvent(EventTypes.USER_CREATED, userData);
```

## Step 2: Updating Entities

Ensure that all your domain entities:

1. Extend the base `Entity` class (or implement similar functionality)
2. Have methods for domain-specific state changes
3. Use `addDomainEvent()` to capture events when state changes

```javascript
// Before: Domain-specific state change without events
setActiveStatus() {
  this.status = 'active';
  this.lastStatusChange = new Date().toISOString();
}

// After: Domain-specific state change with events
setActiveStatus() {
  const oldStatus = this.status;
  this.status = 'active';
  this.lastStatusChange = new Date().toISOString();
  
  // Add domain event
  this.addDomainEvent('USER_STATUS_CHANGED', {
    oldStatus,
    newStatus: this.status,
    changedAt: this.lastStatusChange
  });
}
```

## Step 3: Updating Repositories

1. Update your repositories to collect and return domain events from entities
2. Use `withTransaction` with the `publishEvents: true` option
3. Remove any direct event publishing code

```javascript
// Before
async save(user) {
  // Database operations...
  
  // Direct event publishing after save
  await this.eventBus.publishEvent(EventTypes.USER_UPDATED, {
    userId: user.id,
    changes: { /* changes */ }
  });
  
  return savedUser;
}

// After
async save(user) {
  // Collect domain events
  const domainEvents = user.getDomainEvents();
  
  return this.withTransaction(async transaction => {
    // Database operations...
    
    // Clear domain events from entity
    user.clearDomainEvents();
    
    // Return both result and collected events
    return {
      result: savedUser,
      domainEvents
    };
  }, {
    publishEvents: true,
    eventBus: this.eventBus
  });
}
```

## Step 4: Updating Services and Coordinators

Replace direct event publishing in services and coordinators with entity-based collection:

```javascript
// Before
async setFocusArea(userId, focusArea) {
  // Update user focus area in database
  await this.userRepository.updateFocusArea(userId, focusArea);
  
  // Direct event publishing
  await this.eventBus.publish(EventTypes.USER_FOCUS_AREA_SET, {
    userId,
    focusArea
  });
}

// After
async setFocusArea(userId, focusArea) {
  // Get user entity
  const user = await this.userRepository.findById(userId);
  if (!user) {
    throw new EntityNotFoundError(`User with ID ${userId} not found`);
  }
  
  // Update focus area on entity (which adds domain event)
  user.setFocusArea(focusArea);
  
  // Save entity (which publishes events after transaction)
  await this.userRepository.save(user);
}
```

## Step 5: Updating Event Handlers

Update your event handlers to work with the standardized event structure:

```javascript
// Before
eventBus.subscribe('USER_CREATED', function(eventData) {
  const userId = eventData.userId;
  const email = eventData.email;
  
  // Handler logic...
});

// After
eventBus.subscribe('USER_CREATED', function(event) {
  // Destructure standardized event format
  const { id, type, data, metadata } = event;
  const { entityId, entityType, email } = data;
  const { correlationId, timestamp } = metadata;
  
  // Handler logic with improved context
  console.log(`Processing ${type} event (ID: ${id}) for user ${entityId}`);
  console.log(`Event was created at ${timestamp} with correlation ID ${correlationId}`);
  
  // Handler logic...
});
```

## Step 6: Removing Deprecated Direct Publishing Methods

Once all usage has been migrated, remove any deprecated direct publishing helper methods:

```javascript
// Remove these deprecated functions
export async function publishUserCreated(userId, email) {
  // Deprecated implementation...
}

export async function publishUserUpdated(userId, changes) {
  // Deprecated implementation...
}
```

## Migration Examples

### Example 1: User Status Change

**Before:**
```javascript
// In UserService.js
async activateUser(userId) {
  const user = await this.userRepository.findById(userId);
  if (!user) {
    throw new EntityNotFoundError(`User ${userId} not found`);
  }
  
  user.status = 'active';
  await this.userRepository.update(userId, { status: 'active' });
  
  // Direct event publishing
  await this.eventBus.publish('USER_STATUS_CHANGED', {
    userId,
    newStatus: 'active',
    timestamp: new Date().toISOString()
  });
}
```

**After:**
```javascript
// In User.js (entity)
activate() {
  if (this.status === 'active') {
    return; // Already active
  }
  
  const oldStatus = this.status;
  this.status = 'active';
  
  // Collect domain event
  this.addDomainEvent('USER_STATUS_CHANGED', {
    oldStatus,
    newStatus: this.status,
    timestamp: new Date().toISOString()
  });
}

// In UserService.js
async activateUser(userId) {
  const user = await this.userRepository.findById(userId);
  if (!user) {
    throw new EntityNotFoundError(`User ${userId} not found`);
  }
  
  // Update entity state and collect event
  user.activate();
  
  // Save entity, which publishes events
  await this.userRepository.save(user);
}
```

### Example 2: System Events Without Entities

For system events that don't naturally belong to an entity, consider:

**Before:**
```javascript
// In SystemMonitorService.js
async reportSystemStatus() {
  const metrics = await this.getSystemMetrics();
  
  // Direct event publishing
  await this.eventBus.publish('SYSTEM_STATUS_UPDATED', {
    cpuUsage: metrics.cpu,
    memoryUsage: metrics.memory,
    timestamp: new Date().toISOString()
  });
}
```

**After (Option 1 - Create a System entity):**
```javascript
// Create a System entity to handle system-wide events
class System extends Entity {
  constructor(data = {}) {
    super(data);
    this.metrics = data.metrics || {};
  }
  
  updateMetrics(metrics) {
    this.metrics = metrics;
    
    this.addDomainEvent('SYSTEM_STATUS_UPDATED', {
      cpuUsage: metrics.cpu,
      memoryUsage: metrics.memory
    });
  }
}

// In SystemMonitorService.js
async reportSystemStatus() {
  const metrics = await this.getSystemMetrics();
  
  // Create a System entity for this operation
  const system = new System({ id: 'system-1' });
  system.updateMetrics(metrics);
  
  // Publish events directly from entity
  const events = system.getDomainEvents();
  for (const event of events) {
    await this.eventBus.publish(event);
  }
}
```

**After (Option 2 - Use standardized event format directly):**
```javascript
// In SystemMonitorService.js
async reportSystemStatus() {
  const metrics = await this.getSystemMetrics();
  
  // Create a standardized system event
  const systemEvent = {
    type: 'SYSTEM_STATUS_UPDATED',
    data: {
      entityId: 'system-1',
      entityType: 'System',
      cpuUsage: metrics.cpu,
      memoryUsage: metrics.memory
    },
    metadata: {
      timestamp: new Date().toISOString(),
      correlationId: `system-status-${Date.now()}`
    }
  };
  
  // Publish using standardized format
  await this.eventBus.publish(systemEvent);
}
```

## Testing Your Migration

1. **Unit Testing**:
   - Test that entities correctly add domain events when state changes
   - Test that repositories collect and return domain events
   - Test that services properly update entities and save them

2. **Integration Testing**:
   - Verify that events are published after successful transactions
   - Verify that all event handlers receive the standardized event format
   - Verify that errors in event handlers don't affect the main transaction

3. **Monitoring**:
   - Add logging to track event publishing during the transition
   - Monitor for any dropped or duplicate events

## Troubleshooting

1. **Events not being published**:
   - Check that `publishEvents: true` is set in `withTransaction` options
   - Verify that events are being collected before the transaction

2. **Invalid event format errors**:
   - Ensure events follow the standardized structure with `type`, `data`, and `metadata`
   - Verify that `data` includes `entityId` and `entityType`

3. **Duplicate events**:
   - Check that `clearDomainEvents()` is called after collection
   - Ensure that entity updates only trigger relevant events once

## Timeline for Migration

1. **Week 1**: Update core entities and repositories 
2. **Week 2**: Update services and coordinators
3. **Week 3**: Update event handlers and tests
4. **Week 4**: Remove deprecated methods and complete testing

## Support and Questions

For questions about this migration, please contact the architecture team or refer to the `docs/event-handling-standard.md` document for more details on the standardized approach.

## Bulk Migration Approach

For a more efficient implementation across multiple repositories, we have developed an automated approach:

### Enhanced BaseRepository

We've enhanced the `BaseRepository` with helper methods to standardize the implementation:

```javascript
// In BaseRepository.js
async _saveWithEvents(entity, saveOperation, options = {}) {
  // Collect domain events from the entity before saving
  const domainEvents = entity.getDomainEvents ? entity.getDomainEvents() : [];
  
  return this.withTransaction(async (transaction) => {
    // Execute the provided save operation with transaction
    const savedEntity = await saveOperation(transaction);
    
    // Clear domain events from the original entity
    if (entity.clearDomainEvents) {
      entity.clearDomainEvents();
    }
    
    // Return both the result and domain events
    return {
      result: savedEntity,
      domainEvents
    };
  }, {
    publishEvents: true,
    eventBus: options.eventBus || this.eventBus
  });
}
```

### Automated Migration Scripts

We've created scripts to automate the migration:

1. `scripts/update-repositories.js`: Automatically updates repositories to use entity-based event collection
2. `scripts/update-repository-checklist.js`: Updates the migration checklist with current status

### How to Run the Bulk Migration

1. **Prepare the environment**:
   ```bash
   npm install glob --save-dev  # Ensure glob package is installed
   ```

2. **Run a dry-run to see what would be changed**:
   ```bash
   node scripts/update-repositories.js --dry-run --verbose
   ```

3. **Run the actual update**:
   ```bash
   node scripts/update-repositories.js
   ```

4. **Update the checklist**:
   ```bash
   node scripts/update-repository-checklist.js reports/repository-update-[timestamp].json
   ```

5. **Run tests to verify the changes**:
   ```bash
   npm test
   ```

See `docs/bulk-migration-summary.md` for a complete overview of the bulk migration approach. 