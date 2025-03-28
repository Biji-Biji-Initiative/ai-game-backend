# ADR-003: Domain Event System Design

## Status
Accepted

## Date
2023-10-05

## Context
As part of our Domain-Driven Design implementation, we needed a mechanism for different domains to communicate without creating direct dependencies between them. Traditional approaches like direct method calls between services would lead to tight coupling, making the system less maintainable and harder to test.

We identified several key requirements for cross-domain communication:

1. **Loose Coupling**: Domains should be able to communicate without direct dependencies
2. **Asynchronous Processing**: Events should support both synchronous and asynchronous handling
3. **Type Safety**: Event types and payloads should be type-safe
4. **Error Isolation**: Errors in one event handler should not affect others
5. **Testability**: The event system should be easy to mock and test
6. **Scalability**: The design should accommodate future growth in event types and handlers
7. **Observability**: We need visibility into event flow for debugging and monitoring

## Decision
We have decided to implement a publish/subscribe (pub/sub) pattern for domain events with the following design:

1. **Centralized Event Bus**: A singleton event bus that manages event registration, publication, and subscription.

2. **Event Registry**: A registry of event types with their handlers, supporting multiple handlers per event type.

3. **Typed Events**: Each event has a specific type identifier and a structured payload.

4. **Domain Event Objects**: Events are immutable objects with metadata (timestamp, source) and payload data.

5. **Handler Registration**: Domains register handlers for specific event types they're interested in.

6. **Event Publication**: Domains publish events to the central bus without knowing who will handle them.

7. **Synchronous by Default**: Events are processed synchronously by default, with the option to handle them asynchronously if needed.

8. **Error Handling**: Each handler's errors are caught and logged, preventing one handler failure from affecting others.

9. **Event History**: A limited history of recent events is maintained for debugging purposes.

## Implementation

The core implementation will be in `src/core/shared/domainEvents.js`:

```javascript
// Simple implementation of the event bus
const domainEvents = {
  // Handler registry: eventType -> array of handlers
  _handlers: {},
  
  // Event history for debugging
  _eventHistory: [],
  
  // Register a handler for an event type
  registerHandler(eventType, handler) {
    if (!this._handlers[eventType]) {
      this._handlers[eventType] = [];
    }
    const handlerId = `${eventType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this._handlers[eventType].push({ id: handlerId, handler });
    return handlerId;
  },
  
  // Unregister a handler by its ID
  unregisterHandler(handlerId) {
    for (const eventType in this._handlers) {
      this._handlers[eventType] = this._handlers[eventType].filter(h => h.id !== handlerId);
    }
  },
  
  // Publish an event
  async publish(eventType, data) {
    const event = {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    };
    
    // Store in history (limited size)
    this._eventHistory.unshift(event);
    if (this._eventHistory.length > 100) {
      this._eventHistory.pop();
    }
    
    // No handlers for this event type
    if (!this._handlers[eventType]) {
      return;
    }
    
    // Call all handlers, catching errors
    const results = await Promise.all(
      this._handlers[eventType].map(async ({ handler }) => {
        try {
          return await handler(event);
        } catch (error) {
          console.error(`Error in handler for ${eventType}:`, error);
          return { error };
        }
      })
    );
    
    return results;
  },
  
  // Get event history (for debugging)
  getEventHistory(options = {}) {
    const { eventType, limit = 10 } = options;
    let history = [...this._eventHistory];
    
    if (eventType) {
      history = history.filter(event => event.type === eventType);
    }
    
    return history.slice(0, limit);
  }
};
```

## Consequences

### Positive
1. **Decoupled Domains**: Domains can communicate without direct dependencies
2. **Flexible Handler Registration**: Handlers can be registered and unregistered dynamically
3. **Error Isolation**: Errors in one handler don't affect others
4. **Debugging Support**: Event history helps with debugging
5. **Simplicity**: Straightforward implementation that's easy to understand
6. **Testability**: Easy to mock and test

### Negative
1. **In-Memory Only**: The current implementation is in-memory only, not persisted
2. **No Distributed Support**: Won't work across multiple service instances
3. **Limited History**: Only keeps a limited number of events in memory
4. **No Retry Mechanism**: Failed handlers don't retry automatically
5. **Synchronous Processing**: Could impact performance for long-running handlers

### Mitigations
1. **Future Enhancement**: Plan for a more robust implementation with persistence if needed
2. **Async Handlers**: Critical handlers can use async processing internally
3. **Monitoring**: Add logging and monitoring to detect handler failures
4. **Handler Timeouts**: Consider adding timeouts for long-running handlers

## Future Considerations
1. **Event Persistence**: Store events in a database for reliable processing
2. **Distributed Events**: Support events across multiple service instances
3. **Event Sourcing**: Consider event sourcing for critical domains
4. **Retry Policies**: Add configurable retry policies for failed handlers
5. **Event Schemas**: Define strict schemas for event data

## References
- Enterprise Integration Patterns by Gregor Hohpe
- Domain-Driven Design by Eric Evans
- Internal architectural guidelines on loose coupling 