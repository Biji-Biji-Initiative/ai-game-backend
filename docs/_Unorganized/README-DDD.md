# Domain-Driven Design Implementation

## Data Mapper Pattern

The Data Mapper pattern is a key architectural pattern in our DDD implementation. It decouples our domain models from the persistence layer, allowing our domain entities to focus on business rules and behavior rather than database concerns.

### Implementation

We have implemented the following mappers:

1. **ChallengeMapper**: Handles conversion between Challenge domain entities and database format
2. **UserMapper**: Handles conversion between User domain entities and database format
3. **ProgressMapper**: Handles conversion between Progress domain entities and database format
4. **UserJourneyMapper**: Handles conversion between UserJourney domain entities and database format
5. **FocusAreaConfigMapper**: Handles conversion between FocusArea configuration entities and database format

### Benefits

1. **Domain Model Purity**: Our domain models no longer have database-specific code (like `toDatabase()`), making them focused purely on domain logic.
2. **Separation of Concerns**: The responsibility of mapping between domain and persistence layers is handled by specialized mapper classes.
3. **Maintainability**: When database schema changes occur, only the mappers need to be updated, not the domain models.
4. **Testability**: Domain models can be tested without database dependencies, and mappers can be tested in isolation.

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

## DTO Pattern

In addition to the Data Mapper pattern, we've implemented the DTO (Data Transfer Object) pattern to decouple our API contracts from our domain models. DTOs represent the shape of data transferred between the API and client.

### Implementation

See README-DTO.md for details on our DTO implementation.

## Value Objects

Value objects represent concepts in our domain that are defined by their attributes rather than their identity. We've implemented several value objects to improve type safety and domain validation.

### Examples

- `FocusArea`: Represents a focus area with validation
- `UserId`: Represents a user identifier
- `ChallengeId`: Represents a challenge identifier

## Domain Events

Domain events allow for loose coupling between domain components. When significant domain actions occur, events are published and can be handled by subscribers.

### Implementation

The domain event system is implemented in `domainEvents.js` and is used throughout the domain models to signal important state changes.

## Standardized Error Handling

We've implemented standardized error handling throughout the application to ensure consistent error responses and proper domain-specific errors.

### Implementation

- **ErrorHandler.js**: Provides error handling wrappers for various layers
- **Domain-specific error classes**: Extend base error types with context-specific information
- **Error mapping**: Ensures appropriate error responses for clients

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

### Benefits

1. **Consistency**: Errors are handled consistently across the application
2. **Reduced Boilerplate**: No need for repetitive try/catch blocks in every method
3. **Context Preservation**: Error context (like operation, entity type) is preserved
4. **Clean Code**: Method implementations focus on the happy path without error handling noise
5. **Better Debugging**: Standardized error format with proper stack traces and context 