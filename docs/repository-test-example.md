# Repository Test Examples for Entity-Based Event Collection

This document provides example test code to verify that repositories properly implement the entity-based domain event collection pattern.

## Unit Test Examples

### 1. Testing the `save` Method

```javascript
import { expect } from 'chai';
import { spy, stub } from 'sinon';
import FocusArea from '../../core/focusArea/models/FocusArea.js';
import FocusAreaRepository from '../../core/focusArea/repositories/focusAreaRepository.js';

describe('FocusAreaRepository - Entity-Based Event Collection', () => {
  let repository;
  let mockEventBus;
  let mockDb;
  let mockTransaction;
  
  beforeEach(() => {
    // Set up mock event bus
    mockEventBus = {
      publish: spy()
    };
    
    // Set up mock transaction
    mockTransaction = {
      from: stub().returnsThis(),
      select: stub().returnsThis(),
      insert: stub().returnsThis(),
      update: stub().returnsThis(),
      delete: stub().returnsThis(),
      eq: stub().returnsThis(),
      single: stub().returnsThis(),
      maybeSingle: stub()
    };
    
    // Set up mock database
    mockDb = {
      from: stub().returnsThis(),
      transaction: stub().resolves(mockTransaction),
      begin: stub().resolves(mockTransaction)
    };
    
    // Create repository instance with mocks
    repository = new FocusAreaRepository({
      db: mockDb,
      eventBus: mockEventBus,
      logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }
    });
    
    // Add transaction methods to repository for testing
    repository.beginTransaction = stub().resolves(mockTransaction);
    mockTransaction.commit = stub().resolves();
    mockTransaction.rollback = stub().resolves();
  });
  
  it('should collect domain events when saving an entity', async () => {
    // Create a focus area with events
    const focusArea = new FocusArea({
      userId: 'user-123',
      name: 'Test Focus Area'
    });
    
    // Spy on domain event methods
    const getDomainEventsSpy = spy(focusArea, 'getDomainEvents');
    const clearDomainEventsSpy = spy(focusArea, 'clearDomainEvents');
    
    // Mock database responses
    mockTransaction.maybeSingle.resolves({ data: null, error: null });
    mockTransaction.single.resolves({
      data: {
        id: focusArea.id,
        user_id: 'user-123',
        name: 'Test Focus Area',
        description: '',
        active: true,
        priority: 1,
        metadata: {}
      },
      error: null
    });
    
    // Save the entity
    await repository.save(focusArea);
    
    // Verify domain events were collected and cleared
    expect(getDomainEventsSpy.calledOnce).to.be.true;
    expect(clearDomainEventsSpy.calledOnce).to.be.true;
    expect(getDomainEventsSpy.calledBefore(clearDomainEventsSpy)).to.be.true;
    
    // Verify transaction was used with publishEvents
    expect(repository.beginTransaction.calledOnce).to.be.true;
    expect(mockTransaction.commit.calledOnce).to.be.true;
    
    // Events should not be published directly in the save method
    expect(mockEventBus.publish.called).to.be.false;
  });
});
```

### 2. Testing the `delete` Method

```javascript
it('should collect domain events when deleting an entity', async () => {
  const entityId = 'entity-123';
  
  // Mock finding the entity
  mockTransaction.maybeSingle.resolves({
    data: {
      id: entityId,
      user_id: 'user-123',
      name: 'Test Focus Area',
      description: '',
      active: true,
      priority: 1,
      metadata: {}
    },
    error: null
  });
  
  // Mock the delete operation
  mockTransaction.delete.returnsThis();
  mockTransaction.eq.returnsThis();
  mockTransaction.select.resolves({
    error: null,
    data: { id: entityId }
  });
  
  // Spy on FocusArea methods
  const originalFromDatabase = FocusArea.fromDatabase;
  const focusAreaInstance = new FocusArea({
    id: entityId,
    userId: 'user-123',
    name: 'Test Focus Area'
  });
  
  // Stub the static method to return our spied instance
  FocusArea.fromDatabase = stub().returns(focusAreaInstance);
  
  // Spy on domain event methods
  const addDomainEventSpy = spy(focusAreaInstance, 'addDomainEvent');
  const getDomainEventsSpy = spy(focusAreaInstance, 'getDomainEvents');
  const clearDomainEventsSpy = spy(focusAreaInstance, 'clearDomainEvents');
  
  // Delete the entity
  await repository.deleteById(entityId);
  
  // Verify domain event was added for deletion
  expect(addDomainEventSpy.calledOnce).to.be.true;
  expect(addDomainEventSpy.args[0][0]).to.equal('FOCUS_AREA_DELETED');
  
  // Verify domain events were collected and cleared
  expect(getDomainEventsSpy.calledOnce).to.be.true;
  expect(clearDomainEventsSpy.calledOnce).to.be.true;
  
  // Restore the static method
  FocusArea.fromDatabase = originalFromDatabase;
  
  // Events should not be published directly in the delete method
  expect(mockEventBus.publish.called).to.be.false;
});
```

### 3. Testing Batch Operations

```javascript
it('should collect domain events from multiple entities in batch operations', async () => {
  // Create focus areas with events
  const focusAreas = [
    new FocusArea({
      userId: 'user-123',
      name: 'Focus Area 1'
    }),
    new FocusArea({
      userId: 'user-123',
      name: 'Focus Area 2'
    })
  ];
  
  // Add extra events to simulate user actions
  focusAreas[0].activate();
  focusAreas[1].update({ priority: 2 });
  
  // Spy on domain event methods for each entity
  const getDomainEventsSpies = focusAreas.map(fa => spy(fa, 'getDomainEvents'));
  const clearDomainEventsSpies = focusAreas.map(fa => spy(fa, 'clearDomainEvents'));
  
  // Mock database responses for upsert operations
  mockTransaction.upsert = stub().returnsThis();
  mockTransaction.onConflict = stub().returnsThis();
  mockTransaction.select.returnsThis();
  mockTransaction.single.onFirstCall().resolves({
    data: {
      id: focusAreas[0].id,
      user_id: 'user-123',
      name: 'Focus Area 1',
      description: '',
      active: true,
      priority: 1,
      metadata: {}
    },
    error: null
  }).onSecondCall().resolves({
    data: {
      id: focusAreas[1].id,
      user_id: 'user-123',
      name: 'Focus Area 2',
      description: '',
      active: true,
      priority: 2,
      metadata: {}
    },
    error: null
  });
  
  // Save the batch
  await repository.saveBatch('user-123', focusAreas);
  
  // Verify domain events were collected and cleared for all entities
  getDomainEventsSpies.forEach(spy => {
    expect(spy.calledOnce).to.be.true;
  });
  
  clearDomainEventsSpies.forEach(spy => {
    expect(spy.calledOnce).to.be.true;
  });
  
  // Verify transaction was used
  expect(repository.beginTransaction.calledOnce).to.be.true;
  expect(mockTransaction.commit.calledOnce).to.be.true;
  
  // No direct event publishing should occur
  expect(mockEventBus.publish.called).to.be.false;
});
```

## Integration Test Examples

Integration tests should verify the end-to-end flow, including actual event publishing after transaction commit.

```javascript
import { expect } from 'chai';
import { spy } from 'sinon';
import FocusArea from '../../core/focusArea/models/FocusArea.js';
import { focusAreaRepository } from '../../core/focusArea/repositories/focusAreaRepository.js';
import { getEventBus } from '../../core/common/events/domainEvents.js';

describe('FocusAreaRepository - Integration Tests', () => {
  let realEventBus;
  let publishSpy;
  
  beforeEach(() => {
    // Get the real event bus
    realEventBus = getEventBus();
    
    // Spy on the publish method without affecting its behavior
    publishSpy = spy(realEventBus, 'publish');
  });
  
  afterEach(() => {
    // Restore the original publish method
    if (publishSpy && publishSpy.restore) {
      publishSpy.restore();
    }
  });
  
  it('should publish events after successful transaction', async () => {
    // Create a focus area with events
    const focusArea = new FocusArea({
      userId: 'user-integration-test',
      name: 'Integration Test Focus Area'
    });
    
    // Add additional event
    focusArea.update({ priority: 3 });
    
    // Save the entity
    const savedFocusArea = await focusAreaRepository.save(focusArea);
    
    // Verify entity was saved
    expect(savedFocusArea).to.exist;
    expect(savedFocusArea.id).to.equal(focusArea.id);
    
    // Verify events were published
    expect(publishSpy.callCount).to.be.at.least(1);
    
    // Verify proper event format
    const publishCall = publishSpy.getCall(0);
    const event = publishCall.args[0];
    
    expect(event).to.be.an('object');
    expect(event).to.have.property('type');
    expect(event).to.have.property('data');
    expect(event.data).to.have.property('entityId', focusArea.id);
    expect(event.data).to.have.property('entityType', 'FocusArea');
    expect(event).to.have.property('metadata');
    expect(event.metadata).to.have.property('correlationId');
    expect(event.metadata).to.have.property('timestamp');
    
    // Clean up - delete the created entity
    await focusAreaRepository.deleteById(focusArea.id);
  });
  
  it('should not publish events when transaction fails', async () => {
    // Create a focus area with invalid data to cause transaction failure
    const invalidFocusArea = new FocusArea({
      userId: 'user-integration-test',
      name: 'Invalid Focus Area'
    });
    
    // Hack to make the entity invalid without triggering validation in constructor
    Object.defineProperty(invalidFocusArea, 'userId', {
      get: function() { return null; } // This will make the save fail
    });
    
    // Reset the spy to have clear count
    publishSpy.resetHistory();
    
    // Try to save the entity, which should fail
    try {
      await focusAreaRepository.save(invalidFocusArea);
      // If we get here, the test should fail
      expect(false).to.be.true('Save should have failed');
    } catch (error) {
      // Expected failure
      expect(error).to.exist;
    }
    
    // Verify no events were published
    expect(publishSpy.callCount).to.equal(0);
  });
});
```

## Tips for Testing Events

1. **Spy on entity methods**: Use spies on `getDomainEvents()` and `clearDomainEvents()` to verify they're called correctly.

2. **Mock the database**: Avoid hitting the real database in unit tests.

3. **Spy on transaction methods**: Verify that repository operations use the transaction properly.

4. **Check event publishing timing**: Events should only be published after transaction commit, not within repository methods.

5. **Verify event structure**: Make sure events follow the standardized format.

6. **Test rollback scenarios**: Verify no events are published when transactions fail.

7. **Clean up after integration tests**: Always clean up any data created during integration tests. 