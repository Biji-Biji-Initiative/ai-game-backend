# Domain Events System

## Overview

The event bus system provides a way for different parts of the application to communicate and react to events without tight coupling. The system has been enhanced to include:

1. Improved error handling for subscribers
2. Better logging and metrics
3. Event history for debugging
4. Future extension points for distributed systems
5. Type registration for better documentation

## Components

The event system consists of two main components:

1. **RobustEventBus** (`RobustEventBus.js`) - The new, enhanced event bus implementation
2. **DomainEvents** (`domainEvents.js`) - Compatibility layer for existing code

## Using the Event Bus

### In Existing Code (Compatibility)

Existing code can continue to use the domain events system as before:

```javascript
import domainEvents from '../../common/events/domainEvents.js';

// Register a handler
domainEvents.register('user.created', (eventData) => {
  console.log('User created:', eventData);
});

// Dispatch an event
domainEvents.dispatch('user.created', { id: '123', name: 'John' });
```

### In New Code (Enhanced Features)

New code should use the `RobustEventBus` directly for enhanced features:

```javascript
import robustEventBus from '../../common/events/RobustEventBus.js';

// Register an event type (for documentation and validation)
robustEventBus.registerEventType('payment.processed', {
  description: 'Fired when a payment has been processed',
  category: 'payment',
  schema: {
    type: 'object',
    properties: {
      amount: { type: 'number' },
      currency: { type: 'string' },
      status: { type: 'string' }
    }
  }
});

// Register a handler with more options
robustEventBus.on('payment.processed', (eventEnvelope) => {
  const { data, correlationId } = eventEnvelope;
  console.log('Payment processed:', data.amount, data.currency);
}, {
  handlerId: 'payment-notification-handler'
});

// Register a one-time handler
robustEventBus.once('payment.processed', (eventEnvelope) => {
  console.log('This handler will only run once');
});

// Publish an event with additional metadata
robustEventBus.publish('payment.processed', {
  amount: 100,
  currency: 'USD',
  status: 'completed'
}, {
  correlationId: 'txn-123',
  sourceId: 'payment-service'
});

// Get metrics about event processing
const metrics = robustEventBus.getMetrics();
console.log('Events published:', metrics.publishedEvents);
console.log('Failed events:', metrics.failedEvents);
console.log('Average processing time:', metrics.averageProcessingTimes);
```

## Migration Path

1. **Step 1:** Continue using `domainEvents.js` for backward compatibility
2. **Step 2:** For new event types, register them with `robustEventBus.registerEventType()` for better documentation
3. **Step 3:** For new services/components, use `RobustEventBus` directly
4. **Step 4:** Gradually migrate existing code to use `RobustEventBus` where possible

## Advantages of the New System

### Better Error Handling

The new system prevents a single failing handler from affecting others:

```javascript
// A failing handler will be logged but won't crash the application
robustEventBus.on('some.event', () => {
  throw new Error('Handler error!');
});
```

### Metrics and Monitoring

```javascript
// Get metrics about event processing
const metrics = robustEventBus.getMetrics();
console.log(metrics);
```

### Event History

```javascript
// Enable history recording
const bus = new RobustEventBus({ recordHistory: true });

// Get event history
const history = bus.getEventHistory({ 
  eventName: 'user.created',
  limit: 10
});
```

### Correlation IDs for Tracing

```javascript
// Publish with correlation ID for tracing across systems
robustEventBus.publish('order.created', orderData, {
  correlationId: requestId
});
```

## Future Extensions

The system is designed to be extended in the future for:

1. **Distributed Events** - Adding support for message queues or event streams
2. **Persistent Event Log** - Storing events in a database for replay
3. **Schema Validation** - Validating event data against schemas
4. **Event Sourcing** - Building state from event streams

## Standard Event Types

The system includes a set of standard event types defined in `domainEvents.js`:

- User Domain: `USER_CREATED`, `USER_UPDATED`, etc.
- Challenge Domain: `CHALLENGE_CREATED`, `CHALLENGE_COMPLETED`, etc.
- Evaluation Domain: `EVALUATION_CREATED`, etc.
- Progress Domain: `PROGRESS_UPDATED`, etc.
- And many more... 