# Domain Logic Placement: Entities vs. Services

## Overview

This document outlines our approach to placing domain logic in either Entities (Domain Models) or Services, following Domain-Driven Design (DDD) principles. The proper placement of domain logic is crucial for maintaining a clean architecture and ensuring that business rules are properly encapsulated.

## Principles

### Entity Logic

**Entities should contain:**

1. **State Validation and Invariants**
   - Validation of properties
   - Enforcement of business rules that must always be true
   - Self-verification of entity state integrity

2. **Domain-Specific Behavior**
   - Methods that change the entity's state
   - Business rules that are intrinsic to the entity's lifecycle
   - Calculations or derivations based solely on the entity's own properties

3. **Domain Events**
   - Generation of domain events when state changes
   - Tracking of events for later publication

### Service Logic

**Domain Services should contain:**

1. **Multi-Entity Operations**
   - Coordination between multiple entities/aggregates
   - Operations that span aggregate boundaries
   - Complex business processes involving multiple domain objects

2. **External Integration**
   - Interactions with infrastructure (repositories, messaging, etc.)
   - Domain operations requiring external resources

3. **Stateless Operations**
   - Algorithms or calculations that don't belong to a single entity
   - Operations that don't modify entity state directly

## Implementation Guidelines

### Entity Example: User

```javascript
class User {
    // STATE VALIDATION
    _enforceInvariants() {
        if (!this.email) {
            throw new UserValidationError('User must have an email address');
        }
        // More invariant checks...
    }
    
    // DOMAIN BEHAVIOR
    completeOnboarding() {
        if (!this.focusArea) {
            throw new UserInvalidStateError('Cannot complete onboarding without a focus area');
        }
        this.onboardingCompleted = true;
        this.updatedAt = new Date().toISOString();
        // Domain event generation...
        return this;
    }
    
    // STATE-CHANGING METHODS
    updateActivity() {
        this.lastActive = new Date().toISOString();
        this.updatedAt = this.lastActive;
        // Domain event generation...
        return this;
    }
    
    // DOMAIN EVENTS
    addDomainEvent(eventType, eventData) {
        if (!this._domainEvents) {
            this._domainEvents = [];
        }
        this._domainEvents.push({
            eventType,
            eventData,
        });
    }
}
```

### Service Example: UserService

```javascript
class UserService {
    // MULTI-ENTITY OPERATIONS
    async synchronizeWithPersonality(userId) {
        const user = await this.userRepository.findById(userId);
        const personality = await this.personalityRepository.findByUserId(userId);
        // Coordination logic between entities...
    }
    
    // EXTERNAL INTEGRATION
    async getUserByEmail(email) {
        // Repository interaction
        const cacheKey = `user:email:${email.value}`;
        return this.cache.getOrSet(cacheKey, async () => {
            return this.userRepository.findByEmail(email.value);
        });
    }
    
    // BUSINESS PROCESS ORCHESTRATION
    async createUser(userData) {
        // Factory use for entity creation
        const user = UserFactory.createUser(userData);
        // Check if user already exists (cross-aggregate check)
        // Save to repository
        // Publish events
        // Update cache
    }
}
```

### Factory Example: UserFactory

```javascript
class UserFactory {
    // COMPLEX ENTITY CREATION
    static createUser(userData) {
        // Validate and convert email to Value Object
        // Create user with default values
        // Return fully initialized entity
    }
    
    // SPECIALIZED ENTITY CREATION
    static createAdminUser(userData) {
        const user = this.createUser(userData);
        if (!user.hasRole('admin')) {
            user.addRole('admin');
        }
        return user;
    }
}
```

## Anti-Patterns to Avoid

1. **Anemic Domain Model**
   - Entities with only getters/setters but no real behavior
   - Business logic lives entirely in services

2. **God Entities**
   - Entities that know too much about other entities
   - Entities that include operations that should belong in services

3. **Service Overload**
   - Services that contain logic that should be in entities
   - Services changing entity state directly rather than through entity methods

4. **Repository Logic Leakage**
   - Business rules embedded in repositories
   - Repositories that do more than CRUD operations

## Decision Framework

When deciding where to place domain logic, ask the following questions:

1. **Does the logic relate to just a single entity's state?**
   - Yes → Entity
   - No → Service

2. **Does the logic require knowledge of multiple aggregates?**
   - Yes → Service
   - No → Entity (potentially)

3. **Is the logic about creating complex entity instances?**
   - Yes → Factory
   - No → Entity or Service

4. **Does the logic involve infrastructure concerns?**
   - Yes → Service
   - No → Entity (potentially)

## Concrete Examples in Our Codebase

### Proper Entity Logic

- **User.completeOnboarding()**: This belongs in the entity because it's about changing the User's state according to business rules.
- **Challenge.isCompleted()**: This is a proper entity method as it's checking the entity's own state.

### Proper Service Logic

- **UserService.getUserByEmail()**: Correctly placed in service as it involves repository access.
- **ChallengeService.getChallengesForUser()**: Properly in service as it retrieves multiple entities with caching.

### Proper Factory Logic

- **UserFactory.createUser()**: Complex entity creation logic properly moved to a factory.
- **ChallengeFactory.createFromTemplate()**: Specialized entity creation correctly in a factory.

## Conclusion

Proper domain logic placement leads to:

1. **More maintainable code**
2. **Better encapsulation of business rules**
3. **Easier testing**
4. **Clearer domain model**

When in doubt, follow Conway's Law: "Design your code to reflect the real-world domain it represents." 