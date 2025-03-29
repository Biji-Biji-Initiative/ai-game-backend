# Standardized Error Handling

This document outlines the standardized error handling patterns for the application. It provides a consistent approach to handling errors across repositories, services, and controllers.

## Core Principles

1. **Domain-Specific Errors**: Each domain should define its own error classes that extend `AppError`.
2. **Error Propagation**: Errors should be properly mapped and propagated through the layers.
3. **Contextual Logging**: All errors should be logged with appropriate context.
4. **Consistent Client Responses**: API responses for errors should follow a consistent format.
5. **Collect Events, Dispatch After Save**: Error events should be collected and dispatched after successful operations.

## Usage Examples

### Repository Layer

```javascript
// Example usage in UserRepository.js
const { withRepositoryErrorHandling, createErrorMapper } = require('../../core/infra/errors/errorStandardization');
const { 
  UserNotFoundError, 
  UserValidationError, 
  UserError 
} = require('../errors/UserErrors');
const { EntityNotFoundError, ValidationError } = require('../../core/infra/repositories/BaseRepository');

// Create an error mapper for the user domain
const userErrorMapper = createErrorMapper({
  'EntityNotFoundError': UserNotFoundError,
  'ValidationError': UserValidationError,
}, UserError);

class UserRepository extends BaseRepository {
  constructor(options = {}) {
    // ... existing constructor
    
    // Wrap methods with standardized error handling
    this.findById = withRepositoryErrorHandling(this.findById, {
      methodName: 'findById',
      domainName: 'user',
      logger: this.logger,
      errorMapper: userErrorMapper
    });
    
    // Apply to other methods...
  }
  
  // Original method implementation
  async findById(id, throwIfNotFound = false) {
    // Implementation without try/catch blocks
    this._validateId(id);
    
    return await this._withRetry(async () => {
      // ... existing implementation without error handling
    }, 'findById', { id });
  }
}
```

### Service Layer

```javascript
// Example usage in UserService.js
const { withServiceErrorHandling } = require('../../core/infra/errors/errorStandardization');
const { 
  UserNotFoundError, 
  UserValidationError 
} = require('../errors/UserErrors');

class UserService {
  constructor(userRepository, logger, cacheService) {
    // ... existing constructor
    
    // Wrap methods with standardized error handling
    this.getUserById = withServiceErrorHandling(this.getUserById, {
      methodName: 'getUserById',
      domainName: 'user',
      logger: this.logger
    });
    
    // Apply to other methods...
  }
  
  // Original method implementation without try/catch
  async getUserById(id) {
    const cacheKey = `user:id:${id}`;
    
    return this.cache.getOrSet(cacheKey, async () => {
      const user = await this.userRepository.findById(id);
      
      if (user && user.email) {
        this.cache.set(`user:email:${user.email}`, user, USER_CACHE_TTL);
      }
      
      return user;
    }, USER_CACHE_TTL);
  }
}
```

### Controller Layer

```javascript
// Example usage in UserController.js
const { withControllerErrorHandling } = require('../../core/infra/errors/errorStandardization');
const { 
  UserNotFoundError, 
  UserValidationError,
  UserError
} = require('../errors/UserErrors');

class UserController {
  constructor() {
    // ... existing constructor
    
    // Wrap controller methods
    this.getUserById = withControllerErrorHandling(this.getUserById, {
      methodName: 'getUserById',
      domainName: 'user',
      logger: this.logger,
      errorMappings: [
        { errorClass: UserNotFoundError, statusCode: 404 },
        { errorClass: UserValidationError, statusCode: 400 },
        { errorClass: UserError, statusCode: 500 }
      ]
    });
    
    // Apply to other methods...
  }
  
  // Original method implementation without try/catch
  async getUserById(req, res, next) {
    const { id } = req.params;
    
    const user = await this.userService.getUserById(id);
    
    if (!user) {
      throw new UserNotFoundError(id);
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  }
}
```

### Error Collector for "Collect Events, Dispatch After Save"

```javascript
// Example usage in repository
const { createErrorCollector } = require('../../core/infra/errors/errorStandardization');

class UserRepository extends BaseRepository {
  async save(user) {
    // Create an error collector
    const errorCollector = createErrorCollector();
    
    // Start a transaction
    const transaction = await this.beginTransaction();
    
    try {
      // Save the user
      const result = await this.db
        .from(this.tableName)
        .insert(dbData)
        .select()
        .single();
        
      // Try to publish event - collect error if it fails
      try {
        await this.eventBus.publish({
          type: EventTypes.USER_CREATED,
          payload: { userId: result.id }
        });
      } catch (eventError) {
        errorCollector.collect(eventError, 'publishing USER_CREATED event');
      }
      
      // Commit the transaction
      await transaction.commit();
      
      // Process collected errors (log them, but don't fail the operation)
      if (errorCollector.hasErrors()) {
        errorCollector.processErrors((error, context) => {
          this.logger.warn(`Non-critical error during ${context}`, {
            error: error.message,
            userId: result.id
          });
        });
      }
      
      return new User(result);
    } catch (error) {
      // Rollback transaction
      await transaction.rollback();
      throw error;
    }
  }
}
```

## Migration Guide

1. First, identify the error handling pattern in your existing code.
2. Create domain-specific error classes that extend `AppError`.
3. Apply the appropriate error handling wrapper to your methods.
4. Remove redundant try/catch blocks from your code.
5. Use the error collector pattern for non-critical operations.

## Best Practices

1. **Be Specific**: Use the most specific error class possible.
2. **Include Context**: Always include relevant context in error messages.
3. **Map Carefully**: Map infrastructure errors to domain errors at the boundary.
4. **Log Appropriately**: Log errors at the appropriate level (info, warn, error).
5. **Collect Non-Critical Errors**: Use error collectors for non-critical operations. 