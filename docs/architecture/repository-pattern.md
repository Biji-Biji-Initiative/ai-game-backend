# Repository Pattern Implementation Guide

## Overview

This document describes the repository pattern implementation in our application, based on Domain-Driven Design (DDD) principles. The repository pattern provides a clean abstraction over data access operations, separating domain objects from database concerns.

## BaseRepository

The `BaseRepository` class provides a standardized foundation for all repository implementations. It handles:

- Error handling with domain-specific error mapping
- Field name conversion between JavaScript (camelCase) and database (snake_case) formats
- Retry mechanisms for transient failures
- Transaction support
- Structured logging
- Parameter validation

### Location
```
src/core/infra/repositories/BaseRepository.js
```

## Implementation Status

All repositories in the system now extend from the `BaseRepository` class:

1. ChallengeRepository
2. FocusAreaRepository
3. UserRepository
4. EvaluationRepository
5. ProgressRepository
6. PersonalityRepository

## Key Features

### Error Handling

The BaseRepository implements standard error handling mechanisms that:

1. Map generic database errors to domain-specific errors
2. Add context information to errors, including operation type and inputs
3. Preserve error chains through the `cause` property
4. Add metadata to help debugging
5. Log errors with appropriate severity levels

Example of error mapping:
```javascript
// Base errors from BaseRepository
class EntityNotFoundError extends Error { ... }
class ValidationError extends Error { ... }
class DatabaseError extends Error { ... }

// Domain-specific errors from each domain
class UserNotFoundError extends Error { ... }
class UserValidationError extends Error { ... }
```

### Field Name Conversion

The repository automatically converts between JavaScript camelCase field names and database snake_case fields:

```javascript
// Helper methods in BaseRepository
_camelToSnake(obj) { ... }
_snakeToCamel(obj) { ... }
```

### Parameter Validation

Each method validates its parameters before executing database operations:

```javascript
// ID validation
_validateId(id) { ... }

// Required params validation
_validateRequiredParams(params, requiredFields) { ... }
```

### Retry Mechanism

Operations can be configured to automatically retry on transient failures:

```javascript
// Retry wrapper in BaseRepository
async _withRetry(operation, operationName, metadata) { ... }
```

### Transaction Support

The BaseRepository supports executing multiple operations within a transaction:

```javascript
// Transaction helper
async _withTransaction(operations) { ... }
```

## How to Extend

### Creating a New Repository

To create a new repository that extends BaseRepository:

1. Import BaseRepository and related error classes
2. Define domain-specific error classes
3. Extend the BaseRepository class
4. Implement domain-specific methods
5. Export a singleton instance of your repository

Example:

```javascript
const { 
  BaseRepository, 
  EntityNotFoundError, 
  ValidationError, 
  DatabaseError 
} = require('../../infra/repositories/BaseRepository');

// Domain-specific errors
class ProductNotFoundError extends Error { ... }
class ProductValidationError extends Error { ... }

// Repository implementation
class ProductRepository extends BaseRepository {
  constructor(options = {}) {
    super({
      db: options.db || supabaseClient,
      tableName: 'products',
      domainName: 'product',
      logger: options.logger,
      maxRetries: 3
    });
  }
  
  // Domain-specific methods
  async findById(id) { ... }
  async save(product) { ... }
  // ...
}

// Create and export singleton instance
const productRepository = new ProductRepository();

module.exports = {
  ProductRepository,
  productRepository,
  ProductNotFoundError,
  ProductValidationError
};
```

## Best Practices

1. **Error Mapping**: Always map BaseRepository errors to domain-specific errors
2. **Domain Events**: Publish domain events after successful operations
3. **Validation**: Validate all input parameters before database operations
4. **Logging**: Use appropriate log levels for different operations
5. **Transaction Boundaries**: Use transactions for operations that update multiple records
6. **Error Context**: Always include meaningful metadata when throwing errors

## Common Patterns

### Finding an Entity by ID

```javascript
async findById(id) {
  try {
    this._validateId(id);
    
    return await this._withRetry(async () => {
      // Database operations...
    }, 'findById', { id });
  } catch (error) {
    // Error mapping...
  }
}
```

### Saving an Entity

```javascript
async save(entity) {
  try {
    // Validation
    if (!entity) {
      throw new ValidationError('Entity is required', {
        entityType: this.domainName
      });
    }
    
    return await this._withRetry(async () => {
      // Database operations...
      
      // Publish domain event
      await this.eventBus.publish({
        type: EventTypes.ENTITY_SAVED,
        payload: { /* event data */ }
      });
      
      return result;
    }, 'save', { id: entity.id });
  } catch (error) {
    // Error mapping...
  }
}
```

## Conclusion

The repository pattern implementation provides a clean, consistent approach to data access across the entire application. By using the BaseRepository as a foundation, we ensure:

1. Consistent error handling
2. Standardized logging
3. Proper transaction management  
4. Field name conversion
5. Parameter validation

This approach reduces code duplication, improves error handling, and creates a more maintainable codebase. 