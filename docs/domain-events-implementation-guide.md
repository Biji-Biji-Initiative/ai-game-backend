# Domain Events Implementation Guide

This guide provides practical examples of how to implement and use the standardized domain event pattern in your code. The examples demonstrate the recommended approach for collecting domain events in entities and dispatching them after successful transactions.

## 1. Raising Domain Events in Entities

Domain events should be raised when significant state changes occur in an entity. The `Entity` base class provides methods for managing domain events.

### Example: Raising Events in a User Entity

```javascript
class User extends Entity {
  constructor(data) {
    super(data?.id);
    // Initialize user properties
    this.email = data?.email;
    this.name = data?.name;
    this.status = data?.status || 'active';
    // Other initialization...
  }
  
  activate() {
    if (this.status === 'active') {
      return; // Already active, no change needed
    }
    
    const previousStatus = this.status;
    this.status = 'active';
    
    // Add domain event for state change
    this.addDomainEvent('USER_ACTIVATED', {
      previousStatus,
      currentStatus: 'active'
    });
    
    return this;
  }
  
  deactivate(reason) {
    if (this.status === 'inactive') {
      return; // Already inactive, no change needed
    }
    
    const previousStatus = this.status;
    this.status = 'inactive';
    
    // Add domain event for state change
    this.addDomainEvent('USER_DEACTIVATED', {
      previousStatus,
      currentStatus: 'inactive',
      reason
    });
    
    return this;
  }
  
  changeEmail(newEmail) {
    if (this.email === newEmail) {
      return;
    }
    
    const previousEmail = this.email;
    this.email = newEmail;
    
    // Add domain event for email change
    this.addDomainEvent('USER_EMAIL_CHANGED', {
      previousEmail,
      newEmail
    });
    
    return this;
  }
}
```

## 2. Handling Domain Events in Repositories

Repositories are responsible for collecting domain events from entities and dispatching them after successful transactions.

### Example: Repository with Domain Event Handling

```javascript
class UserRepository extends BaseRepository {
  constructor(db, eventBus, cacheInvalidator) {
    super(db, 'users', 'User');
    this.eventBus = eventBus;
    this.cacheInvalidator = cacheInvalidator;
  }
  
  async save(user) {
    if (!(user instanceof User)) {
      throw new ValidationError('Invalid user object provided');
    }
    
    // Collect domain events before saving
    const domainEvents = user.getDomainEvents();
    
    return this.withTransaction(async (transaction) => {
      // Convert domain model to database format
      const dbData = UserMapper.toDatabase(user);
      
      // Database operations to save user...
      // ...
      
      // Return both the result and domain events for publishing after commit
      return {
        result: savedUser,
        domainEvents: domainEvents
      };
    }, {
      publishEvents: true,     // Enable event publishing
      eventBus: this.eventBus, // Event bus to use
      invalidateCache: true,   // Enable cache invalidation
      cacheInvalidator: this.cacheInvalidator
    });
  }
}
```

## 3. Using Domain Events in Service Layer

The service layer should focus on orchestrating domain logic rather than publishing events directly.

### Example: Service Using Domain Events

```javascript
class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }
  
  async activateUser(userId) {
    // 1. Load entity
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundError(`User with ID ${userId} not found`);
    }
    
    // 2. Apply domain logic to entity (which adds events)
    user.activate();
    
    // 3. Save entity (which publishes events after successful transaction)
    return this.userRepository.save(user);
  }
  
  async changeUserEmail(userId, newEmail) {
    // 1. Load entity
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundError(`User with ID ${userId} not found`);
    }
    
    // 2. Apply domain logic to entity (which adds events)
    user.changeEmail(newEmail);
    
    // 3. Save entity (which publishes events after successful transaction)
    return this.userRepository.save(user);
  }
}
```

## 4. Handling Domain Events with Subscribers

Event subscribers should be registered to handle domain events.

### Example: Event Subscriber

```javascript
// Setup event handlers in app initialization
function setupEventHandlers(eventBus) {
  // User events
  eventBus.on('USER_ACTIVATED', handleUserActivated);
  eventBus.on('USER_DEACTIVATED', handleUserDeactivated);
  eventBus.on('USER_EMAIL_CHANGED', handleUserEmailChanged);
  
  // Other event handlers...
}

// Event handler implementation
async function handleUserEmailChanged(event) {
  const { previousEmail, newEmail, entityId } = event.data;
  
  logger.info(`User ${entityId} changed email from ${previousEmail} to ${newEmail}`);
  
  // Perform actions in response to email change
  // For example:
  // - Send confirmation email
  // - Update external systems
  // - Update search indexes
}
```

## 5. Testing Domain Events

When testing, ensure that you verify the domain events are properly emitted by entities and published by repositories.

### Example: Testing Domain Events

```javascript
describe('User Domain Events', () => {
  it('should emit USER_EMAIL_CHANGED event when email is changed', () => {
    // Arrange
    const user = new User({ id: '123', email: 'old@example.com' });
    
    // Act
    user.changeEmail('new@example.com');
    
    // Assert
    const events = user.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('USER_EMAIL_CHANGED');
    expect(events[0].data.previousEmail).toBe('old@example.com');
    expect(events[0].data.newEmail).toBe('new@example.com');
    expect(events[0].data.entityId).toBe('123');
  });
});
```

## Best Practices

1. **Focus on Significant State Changes**: Only emit domain events for meaningful changes in the domain.
2. **Keep Events Focused**: Each event should represent a single concept or state change.
3. **Include Sufficient Context**: Ensure events contain enough information for handlers to act upon.
4. **Use Entity Methods for State Changes**: Encapsulate state changes in entity methods that also emit events.
5. **Test Event Emission**: Write tests to verify that proper events are emitted under the right conditions.
6. **Clear Events After Publishing**: Always clear domain events from entities after they've been published.
7. **Handle Events Asynchronously**: Event handlers should be asynchronous and non-blocking.
8. **Use Correlation IDs**: Make use of the built-in correlation IDs for tracing event chains.

## Conclusion

By following this pattern of collecting domain events in entities and publishing them after successful transactions, you can:

1. Maintain strong consistency between your data and events
2. Prevent event leaks (events published for failed transactions)
3. Make your domain model clearer and more focused on business logic
4. Simplify your service layer by removing direct event publishing code
5. Create better separation of concerns throughout your system

This approach aligns with domain-driven design principles and helps create a more maintainable and robust system. 