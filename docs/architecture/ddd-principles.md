# Domain-Driven Design Principles

This document provides a comprehensive guide to the Domain-Driven Design (DDD) principles implemented in our application.

## Overview

Domain-Driven Design is a software development approach that focuses on understanding the problem domain, creating a rich domain model, and using ubiquitous language to bridge the gap between technical and domain experts. Our implementation follows these core principles to create a maintainable and business-aligned codebase.

## Core DDD Concepts

### 1. Bounded Contexts

Our system is divided into the following bounded contexts (domains):

- **Challenge Domain**: Manages challenge creation, templates, and responses
- **User Domain**: Handles user profiles, preferences, and authentication
- **Evaluation Domain**: Manages assessment of user responses and feedback
- **Focus Area Domain**: Manages learning topics and skill categorization
- **Progress Domain**: Tracks user advancement and learning journey
- **Personality Domain**: Handles AI persona customization
- **Prompt Domain**: Cross-cutting concern for AI prompt generation

Each bounded context has clearly defined boundaries and its own domain model.

### 2. Domain Model Elements

#### Entities

Entities have distinct identities that persist throughout their lifecycle:

```javascript
// Challenge entity with identity
class Challenge {
  constructor(id, props) {
    this.id = id || uuidv4();
    this.title = props.title;
    this.description = props.description;
    this._domainEvents = [];
  }
  
  // Domain logic
  isCompleted() { /* ... */ }
  
  // Domain events handling
  addDomainEvent(eventType, eventData = {}) {
    this._domainEvents.push({
      type: eventType,
      data: {
        ...eventData,
        entityId: this.id,
        entityType: this.constructor.name,
      },
    });
  }
  
  getDomainEvents() {
    return [...this._domainEvents];
  }
  
  clearDomainEvents() {
    this._domainEvents = [];
  }
}
```

#### Value Objects

Value objects are immutable objects defined by their attributes, not by identity:

```javascript
// Email value object
class Email {
  constructor(value) {
    if (!this.isValid(value)) {
      throw new Error('Invalid email format');
    }
    this._value = value;
    Object.freeze(this); // Immutability
  }
  
  get value() {
    return this._value;
  }
  
  isValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  equals(other) {
    return other instanceof Email && this._value === other._value;
  }
  
  toString() {
    return this._value;
  }
}

// Factory function for safer creation
const createEmail = (email) => {
  try {
    return new Email(email);
  } catch (error) {
    return null;
  }
};

// Standard ensureVO utility for consistent usage
const ensureVO = (valueOrVO, VOClass, createFn) => {
  if (valueOrVO instanceof VOClass) {
    return valueOrVO;
  }
  return createFn(valueOrVO);
};

// Usage example
function processUser(emailOrEmailVO) {
  // Convert to VO if needed
  const emailVO = ensureVO(emailOrEmailVO, Email, createEmail);
  
  if (!emailVO) {
    throw new Error("Invalid email");
  }
  
  // Now use emailVO safely
}

Value objects in our system include:
- `Email` - Represents a valid email address
- `UserId` - Represents a user identifier
- `ChallengeId` - Represents a challenge identifier
- `FocusArea` - Represents a focus area for challenges
- `DifficultyLevel` - Represents a difficulty level

#### Aggregates

Aggregates encapsulate related entities and value objects:

- **Challenge Aggregate**: Challenge (root), ChallengeTemplate, ChallengeResponse
- **User Aggregate**: User (root), UserPreference, SkillLevel
- **Evaluation Aggregate**: Evaluation (root), EvaluationCriteria, FeedbackItem

Each aggregate has a single root entity that serves as the entry point. External references should only point to the aggregate root, not to contained entities.

### 3. Domain Services

Domain services implement business logic that doesn't naturally fit within entities:

```javascript
// Example domain service
class ChallengeGenerationService {
  constructor({
    challengeTemplateRepository,
    focusAreaRepository,
    promptBuilder
  }) {
    this.challengeTemplateRepository = challengeTemplateRepository;
    this.focusAreaRepository = focusAreaRepository;
    this.promptBuilder = promptBuilder;
  }
  
  async generateChallenge(userId, focusAreaId) {
    // Domain logic for generating challenges
  }
}
```

### 4. Repositories

Repositories provide an abstraction over data storage, allowing domain objects to be retrieved and persisted:

```javascript
// Repository implementation with domain events
class ChallengeRepository {
  async findById(id) { /* ... */ }
  async findByUserId(userId) { /* ... */ }
  
  async save(challenge) {
    // Validate challenge
    if (!challenge) {
      throw new ValidationError('Challenge object is required');
    }
    if (!(challenge instanceof Challenge)) {
      throw new ValidationError('Object must be a Challenge instance');
    }
    
    // Collect domain events before saving
    const domainEvents = challenge.getDomainEvents ? challenge.getDomainEvents() : [];
    
    // Clear events from the entity to prevent double publishing
    if (challenge.clearDomainEvents) {
      challenge.clearDomainEvents();
    }
    
    // Use mapper to convert domain entity to database format
    const challengeData = this.mapper.toPersistence(challenge);
    
    // Save to database (transaction handled internally)
    return this.withTransaction(async (transaction) => {
      // Database operations...
      
      // Return both the result and domain events
      return {
        result: savedChallenge,
        domainEvents: domainEvents
      };
    }, {
      publishEvents: true,
      eventBus: domainEvents
    });
  }
  
  async update(challenge) { /* ... */ }
  async delete(id) { /* ... */ }
}
```

### 5. Factories

Factories encapsulate the complex creation logic of domain objects:

```javascript
// Challenge factory
class ChallengeFactory {
  createFromTemplate(template, userId, focusAreaId) {
    // Complex creation logic
    return new Challenge(/* ... */);
  }
}
```

## Data Mapper Pattern

The Data Mapper pattern is a key architectural pattern in our DDD implementation. It decouples our domain models from the persistence layer, allowing our domain entities to focus on business rules and behavior rather than database concerns.

### Implementation

We have implemented the following mappers:

1. **ChallengeMapper**: Handles conversion between Challenge domain entities and database format
2. **UserMapper**: Handles conversion between User domain entities and database format
3. **ProgressMapper**: Handles conversion between Progress domain entities and database format
4. **UserJourneyMapper**: Handles conversion between UserJourney domain entities and database format
5. **FocusAreaConfigMapper**: Handles conversion between FocusArea configuration entities and database format

### Usage Example

Here's how repositories use the mappers:

```javascript
// Example from ProgressRepository
findById(id) {
  // ... validation and database query ...
  
  // Using mapper to convert database record to domain entity
  return progressMapper.toDomain(data);
}

save(progress) {
  // ... validation ...
  
  // Convert to database format using mapper
  const progressData = progressMapper.toPersistence(progress);
  
  // ... save to database ...
  
  // Convert database result back to domain entity using mapper
  return progressMapper.toDomain(data);
}
```

### Benefits

1. **Domain Model Purity**: Our domain models no longer have database-specific code (like `toDatabase()`), making them focused purely on domain logic.
2. **Separation of Concerns**: The responsibility of mapping between domain and persistence layers is handled by specialized mapper classes.
3. **Maintainability**: When database schema changes occur, only the mappers need to be updated, not the domain models.
4. **Testability**: Domain models can be tested without database dependencies, and mappers can be tested in isolation.

## Working with Value Objects

Value objects represent concepts in our domain that are defined by their attributes rather than their identity. We've implemented several value objects to improve type safety and domain validation.

### Creation

Value Objects provide strong validation. When creating them, the constructor may throw if the input is invalid:

```javascript
import { Email } from "../core/common/valueObjects/index.js";

// May throw if email is invalid
const emailVO = new Email("user@example.com");
```

To handle failures gracefully, use the factory functions:

```javascript
import { createEmail } from "../core/common/valueObjects/index.js";

// Returns null if email is invalid (no exception)
const emailVO = createEmail("user@example.com");
if (emailVO) {
  // Safe to use the value object
}
```

### Standard Pattern: ensureVO Utility

Many components need to accept either a primitive value or an already-created Value Object. To standardize this pattern, we use the `ensureVO` utility function:

```javascript
import { ensureVO, Email, createEmail } from "../core/common/valueObjects/index.js";

function processUser(userEmail) {
  // Convert to VO if needed
  const emailVO = ensureVO(userEmail, Email, createEmail);
  
  if (!emailVO) {
    throw new Error("Invalid email");
  }
  
  // Now use emailVO safely
}

// Works with either format
processUser("user@example.com");
processUser(new Email("user@example.com"));
```

## Domain Events

Domain events allow for loose coupling between domain components. When significant domain actions occur, events are published and can be handled by subscribers.

```javascript
// Publishing a domain event
class ChallengeCompletedEvent {
  constructor(challengeId, userId, score) {
    this.challengeId = challengeId;
    this.userId = userId;
    this.score = score;
    this.timestamp = new Date();
  }
}

// Event is published when a challenge is completed
domainEventPublisher.publish(new ChallengeCompletedEvent(challenge.id, user.id, score));
```

### Implementation

The domain event system is implemented in `domainEvents.js` and is used throughout the domain models to signal important state changes.

## Layered Architecture

Our implementation follows a layered architecture approach:

1. **External Interfaces Layer**: API routes, CLI interface
2. **Application Layer**: Coordinators, use cases, error handlers
3. **Domain Layer**: Domain models, services, repository interfaces
4. **Infrastructure Layer**: Repository implementations, external service clients

### Layer Responsibilities

#### External Interfaces Layer
- API controllers and routes
- Request/response DTOs
- Authentication middleware
- Input validation

#### Application Layer
- Coordinates workflows across domains
- Handles application-level concerns like pagination, sorting
- Orchestrates domain services
- Maps domain objects to DTOs

#### Domain Layer
- Business rules and logic
- Domain entities and value objects
- Domain events
- Repository interfaces (ports)
- Domain services
- Pure business logic with no dependencies on infrastructure

#### Infrastructure Layer
- Repository implementations
- External service clients
- Database connection handling
- Caching
- Messaging
- Logging
- Implements adapters for the ports defined in the domain layer

## DTO Pattern

In addition to the Data Mapper pattern, we've implemented the DTO (Data Transfer Object) pattern to decouple our API contracts from our domain models. DTOs represent the shape of data transferred between the API and client.

## Standardized Error Handling

We've implemented standardized error handling throughout the application to ensure consistent error responses and proper domain-specific errors.

### Error Handling Wrappers

We use three main error handling wrappers:

1. **applyControllerErrorHandling**: For controllers to standardize HTTP responses
2. **applyServiceErrorHandling**: For domain services to map errors to domain-specific types
3. **applyRepositoryErrorHandling**: For repositories to manage persistence errors

### Example

```javascript
class DifficultyLevelRepository extends BaseRepository {
  constructor(options = {}) {
    super({ /* config */ });
    
    // Apply standardized error handling to methods
    this.findAll = applyRepositoryErrorHandling(this, 'findAll');
    this.findByCode = applyRepositoryErrorHandling(this, 'findByCode');
    this.save = applyRepositoryErrorHandling(this, 'save');
    // ... more methods
  }
  
  // Method implementations without try/catch blocks
  async findAll() {
    // Implementation that can throw errors
    // The wrapper will catch and transform them appropriately
  }
}
```

## Best Practices

1. **Respect Bounded Contexts**: Keep domain models within their proper bounded contexts. Cross-context communication should be done through clearly defined interfaces.

2. **Use Value Objects for Validation**: Employ value objects for validation and encapsulation of domain rules related to specific types.

3. **Apply Domain Events for Integration**: Use domain events to trigger cross-domain processes without creating tight coupling.

4. **Keep Domain Logic Pure**: Domain models should be free from infrastructure concerns like persistence or external services.

5. **Enforce Aggregate Rules**: External references should only point to aggregate roots, not contained entities.

6. **Use Repository Pattern Correctly**: Repositories should work with entire aggregates, not individual entities within an aggregate.

7. **Apply Data Mappers**: Use data mappers to translate between domain model and persistence representation.

8. **Enforce Immutability**: Value objects should be immutable to prevent unexpected state changes.

9. **Use Factories for Complex Creation**: When entity creation involves complex logic, use factory methods.

10. **Maintain Ubiquitous Language**: Ensure code terms match the language used by domain experts.

## Benefits of DDD

The DDD approach provides significant benefits for our system:

1. **Maintainability**: Clear boundaries make the system easier to understand and modify
2. **Extensibility**: New features can be added with minimal impact on existing functionality
3. **Testability**: Domain logic is isolated and easily testable
4. **Business alignment**: The code structure mirrors the business domain, facilitating communication
5. **Scalability**: Bounded contexts can be deployed independently if needed 