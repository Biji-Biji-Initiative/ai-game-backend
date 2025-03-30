# Domain Events

This document explains how domain events are implemented and used in our application.

## Overview

Domain events are a core part of our Domain-Driven Design (DDD) implementation. They enable communication between bounded contexts while maintaining loose coupling and allow for an event-driven architecture that's both maintainable and extensible.

A domain event represents something significant that has happened in the domain, such as:
- A user has been registered
- A challenge has been completed
- A user's progress has been updated
- An evaluation has been finalized

## Purpose of Domain Events

Domain events serve several important purposes:

1. **Decoupling Domains**: Allow communication between bounded contexts without direct dependencies
2. **Audit Trail**: Provide a record of all significant actions in the system
3. **Event Sourcing**: Support for event sourcing patterns if needed
4. **Cross-Domain Processes**: Enable workflows that span multiple domains
5. **Extensibility**: Make it easy to add new reactions to existing events

## Implementation

### Event Structure

Our domain events follow a standard structure:

```javascript
// Example domain event class
export class UserRegisteredEvent {
  constructor(userId, email, timestamp = new Date()) {
    this.userId = userId;
    this.email = email;
    this.timestamp = timestamp;
    this.eventType = 'USER_REGISTERED'; // Used for routing
  }
}
```

Each event includes:
- A unique event type for routing
- All relevant data needed by handlers
- A timestamp (usually the time the event was created)
- Any identifiers needed to reference related domain objects

### Event Publisher

The event publisher is a central component that allows domain objects to publish events:

```javascript
// Domain event publisher implementation
export class DomainEventPublisher {
  constructor({ logger }) {
    this.handlers = new Map();
    this.logger = logger;
  }
  
  // Register a handler for a specific event type
  subscribe(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType).push(handler);
    this.logger.info(`Handler registered for event type: ${eventType}`);
    
    return () => this.unsubscribe(eventType, handler); // Return unsubscribe function
  }
  
  // Remove a handler for a specific event type
  unsubscribe(eventType, handler) {
    if (!this.handlers.has(eventType)) return false;
    
    const handlers = this.handlers.get(eventType);
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
      this.logger.info(`Handler unregistered for event type: ${eventType}`);
      return true;
    }
    
    return false;
  }
  
  // Publish an event to all registered handlers
  async publish(event) {
    if (!event || !event.eventType) {
      this.logger.warn('Attempted to publish invalid event');
      return;
    }
    
    const handlers = this.handlers.get(event.eventType) || [];
    
    this.logger.info(`Publishing event ${event.eventType} to ${handlers.length} handlers`);
    
    const promises = handlers.map(handler => {
      try {
        return Promise.resolve(handler(event));
      } catch (error) {
        this.logger.error(`Error in event handler for ${event.eventType}: ${error.message}`);
        return Promise.resolve(); // Prevent one handler failure from affecting others
      }
    });
    
    return Promise.all(promises);
  }
}
```

### Event Handlers

Event handlers are functions that respond to specific events:

```javascript
// Example event handler
function handleUserRegistered(event) {
  // Send welcome email
  emailService.sendWelcomeEmail(event.email);
  
  // Create initial profile
  userProfileService.createInitialProfile(event.userId);
  
  // Log registration
  analyticsService.trackUserRegistration(event.userId, event.timestamp);
}

// Register the handler
domainEventPublisher.subscribe('USER_REGISTERED', handleUserRegistered);
```

## Using Domain Events in the Application

### Publishing Events from Domain Services

Domain services publish events when significant domain actions occur:

```javascript
// Example from UserService
async registerUser(userData) {
  // Validate user data
  
  // Create user in repository
  const user = await this.userRepository.create({
    email: userData.email,
    password: await this.hashPassword(userData.password),
    name: userData.name
  });
  
  // Publish domain event
  await this.eventPublisher.publish(new UserRegisteredEvent(
    user.id,
    user.email
  ));
  
  return user;
}
```

### Publishing Events from Domain Entities

Domain entities can also publish events, using an events collector pattern:

```javascript
// Example domain entity that collects events
class Challenge {
  constructor(id, props) {
    this.id = id;
    this.title = props.title;
    this.status = props.status || 'DRAFT';
    this._domainEvents = [];
  }
  
  complete(userId, score) {
    if (this.status === 'COMPLETED') {
      throw new Error('Challenge already completed');
    }
    
    this.status = 'COMPLETED';
    this.completedBy = userId;
    this.score = score;
    this.completedAt = new Date();
    
    // Add domain event to collection
    this._domainEvents.push(new ChallengeCompletedEvent(
      this.id,
      userId,
      score,
      this.completedAt
    ));
  }
  
  // Get collected events
  getDomainEvents() {
    return [...this._domainEvents];
  }
  
  // Clear events after they've been published
  clearEvents() {
    this._domainEvents = [];
  }
}

// In repository or service
async completeChallenge(challengeId, userId, score) {
  const challenge = await this.challengeRepository.findById(challengeId);
  
  challenge.complete(userId, score);
  
  // Save the updated challenge
  await this.challengeRepository.update(challenge);
  
  // Publish collected events
  const events = challenge.getDomainEvents();
  await Promise.all(events.map(event => this.eventPublisher.publish(event)));
  
  // Clear events after publishing
  challenge.clearEvents();
  
  return challenge;
}
```

## Event Handler Registration

Event handlers are registered during application startup:

```javascript
// In application bootstrap
function registerEventHandlers(container) {
  const eventPublisher = container.get('domainEventPublisher');
  const userService = container.get('userService');
  const progressService = container.get('progressService');
  const notificationService = container.get('notificationService');
  
  // Register handlers for user events
  eventPublisher.subscribe('USER_REGISTERED', event => 
    progressService.initializeUserProgress(event.userId)
  );
  
  eventPublisher.subscribe('USER_REGISTERED', event => 
    notificationService.sendWelcomeNotification(event.userId)
  );
  
  // Register handlers for challenge events
  eventPublisher.subscribe('CHALLENGE_COMPLETED', event => 
    progressService.updateProgressForChallenge(event.userId, event.challengeId, event.score)
  );
  
  // ... more handler registrations
}
```

## Cross-Domain Communication

Domain events enable communication between bounded contexts without creating direct dependencies:

1. The User domain publishes `UserRegisteredEvent`
2. The Progress domain subscribes to this event to initialize user progress
3. The Notification domain also subscribes to send welcome notifications

This approach maintains the autonomy of each domain while allowing necessary coordination.

## Asynchronous Processing

For better performance, event handling can be processed asynchronously:

```javascript
// Example async event handler
async function handleLongRunningProcess(event) {
  // Queue the task for background processing
  await backgroundJobService.enqueue('process-user-data', {
    userId: event.userId,
    timestamp: event.timestamp
  });
}

// Register the async handler
domainEventPublisher.subscribe('USER_REGISTERED', handleLongRunningProcess);
```

## Testing Domain Events

### Testing Event Publishing

```javascript
// Test that events are published
it('should publish UserRegisteredEvent when user is registered', async () => {
  // Arrange
  const eventPublisherMock = {
    publish: sinon.stub().resolves()
  };
  
  const userService = new UserService({
    userRepository: userRepositoryMock,
    eventPublisher: eventPublisherMock,
    // other dependencies
  });
  
  // Act
  await userService.registerUser({
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User'
  });
  
  // Assert
  expect(eventPublisherMock.publish.calledOnce).to.be.true;
  const publishedEvent = eventPublisherMock.publish.firstCall.args[0];
  expect(publishedEvent.eventType).to.equal('USER_REGISTERED');
  expect(publishedEvent.email).to.equal('test@example.com');
});
```

### Testing Event Handlers

```javascript
// Test that handlers respond correctly to events
it('should initialize user progress when UserRegisteredEvent is received', async () => {
  // Arrange
  const progressServiceMock = {
    initializeUserProgress: sinon.stub().resolves()
  };
  
  const handler = event => progressServiceMock.initializeUserProgress(event.userId);
  
  // Act
  await handler(new UserRegisteredEvent('user-123', 'test@example.com'));
  
  // Assert
  expect(progressServiceMock.initializeUserProgress.calledWith('user-123')).to.be.true;
});
```

## Best Practices

1. **Keep Events Focused**: Each event should represent a single significant occurrence
2. **Include Necessary Context**: Events should include all data handlers will need
3. **Make Events Immutable**: Events should be immutable once created
4. **Use Past Tense**: Name events in past tense (e.g., `UserRegistered` not `RegisterUser`)
5. **Consider Event Versioning**: Add version information for long-lived events
6. **Use Event Interfaces**: Consider using interfaces to define event structure
7. **Error Handling**: Ensure handlers have proper error handling to prevent cascading failures
8. **Avoid Circular Events**: Be careful not to create circular event chains
9. **Document Event Flows**: Maintain documentation of event flows for system understanding
10. **Performance Considerations**: Be mindful of event handler performance, especially for high-frequency events

## Conclusion

Domain events provide a powerful mechanism for maintaining loose coupling between domains while enabling complex workflows across the system. By publishing events for significant domain occurrences and subscribing to them with appropriate handlers, we can build a flexible, extensible application that aligns with Domain-Driven Design principles. 