# Error Handling Standardization Migration Guide

This document provides a step-by-step guide for migrating existing code to use the standardized error handling patterns.

## Migration Process

### Step 1: Identify Files to Update

Run the error handling standardization script to identify files that need to be updated:

```bash
node scripts/standardizeErrorHandling.js
```

This will scan the codebase and list all repositories, services, and controllers that need to be updated.

### Step 2: Ensure Domain-Specific Error Classes

Before updating a file, make sure the domain has appropriate error classes defined.

Typical error classes for a domain include:

```javascript
const AppError = require('../../core/infra/errors/AppError');

class DomainError extends AppError {
  constructor(message, statusCode = 400) {
    super(message, statusCode);
    this.name = 'DomainError';
  }
}

class DomainNotFoundError extends DomainError {
  constructor(id) {
    super(`Domain entity with ID ${id} not found`, 404);
    this.name = 'DomainNotFoundError';
  }
}

class DomainValidationError extends DomainError {
  constructor(message) {
    super(`Validation error: ${message}`, 400);
    this.name = 'DomainValidationError';
  }
}

module.exports = {
  DomainError,
  DomainNotFoundError, 
  DomainValidationError
};
```

### Step 3: Create Error Mapper

For each domain, create an error mapper that maps generic errors to domain-specific errors:

```javascript
const {
  createErrorMapper
} = require('../../core/infra/errors/errorStandardization');
const { 
  EntityNotFoundError, 
  ValidationError, 
  DatabaseError 
} = require('../../core/infra/repositories/BaseRepository');
const {
  DomainError,
  DomainNotFoundError,
  DomainValidationError
} = require('../errors/domainErrors');

const domainErrorMapper = createErrorMapper({
  'EntityNotFoundError': DomainNotFoundError,
  'ValidationError': DomainValidationError,
  'DatabaseError': DomainError
}, DomainError);
```

### Step 4: Apply Error Handling to Repositories

Update repositories to use the standardized error handling:

```javascript
const {
  withRepositoryErrorHandling
} = require('../../core/infra/errors/errorStandardization');

class DomainRepository extends BaseRepository {
  constructor(options = {}) {
    super(/* ... */);
    
    // Apply standardized error handling to methods
    this.findById = withRepositoryErrorHandling(this.findById.bind(this), {
      methodName: 'findById',
      domainName: 'domain',
      logger: this.logger,
      errorMapper: domainErrorMapper
    });
    
    // Apply to other methods...
  }
  
  // Remove try/catch blocks from method implementations
  async findById(id, throwIfNotFound = false) {
    // Implementation without try/catch blocks
  }
}
```

### Step 5: Apply Error Handling to Services

Update services to use the standardized error handling:

```javascript
const {
  withServiceErrorHandling
} = require('../../core/infra/errors/errorStandardization');

class DomainService {
  constructor() {
    // Apply standardized error handling to methods
    this.getDomainEntity = withServiceErrorHandling(this.getDomainEntity.bind(this), {
      methodName: 'getDomainEntity',
      domainName: 'domain',
      logger: this.logger,
      errorMapper: domainErrorMapper
    });
    
    // Apply to other methods...
  }
  
  // Remove try/catch blocks from method implementations
  async getDomainEntity(id) {
    // Implementation without try/catch blocks
  }
}
```

### Step 6: Apply Error Handling to Controllers

Update controllers to use the standardized error handling:

```javascript
const {
  withControllerErrorHandling
} = require('../../core/infra/errors/errorStandardization');

class DomainController {
  constructor() {
    // Define error mappings for controller methods
    this.errorMappings = [
      { errorClass: DomainNotFoundError, statusCode: 404 },
      { errorClass: DomainValidationError, statusCode: 400 },
      { errorClass: DomainError, statusCode: 500 }
    ];
    
    // Apply standardized error handling to methods
    this.getDomainEntity = withControllerErrorHandling(this.getDomainEntity.bind(this), {
      methodName: 'getDomainEntity',
      domainName: 'domain',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    // Apply to other methods...
  }
  
  // Remove try/catch blocks from method implementations
  async getDomainEntity(req, res, next) {
    // Implementation without try/catch blocks
  }
}
```

### Step 7: Use Error Collector for Non-Critical Operations

Use the error collector pattern for operations that should not fail the main operation:

```javascript
const {
  createErrorCollector
} = require('../../core/infra/errors/errorStandardization');

async save(entity) {
  // Create an error collector
  const errorCollector = createErrorCollector();
  
  // Main operation
  const result = await this.db.save(entity);
  
  // Try to publish event - collect error if it fails
  try {
    await this.eventBus.publish({
      type: EventTypes.ENTITY_CREATED,
      payload: { entityId: result.id }
    });
  } catch (eventError) {
    errorCollector.collect(eventError, 'publishing event');
  }
  
  // Process collected errors (log them, but don't fail the operation)
  if (errorCollector.hasErrors()) {
    errorCollector.processErrors((error, context) => {
      this.logger.warn(`Non-critical error during ${context}`, {
        error: error.message,
        entityId: result.id
      });
    });
  }
  
  return result;
}
```

## Testing the Migration

After migrating a file:

1. Verify that all error handling logic has been removed from the method implementations
2. Ensure that error messages and logging remain the same
3. Test error scenarios to ensure they are handled correctly

## Benefits of Standardized Error Handling

1. **Consistent Error Handling**: All errors are handled in a consistent way
2. **Improved Code Readability**: Method implementations are more focused on business logic
3. **Better Error Logging**: All errors are logged with consistent context
4. **Proper Error Propagation**: Errors are properly mapped and propagated through the layers
5. **Collect Events, Dispatch After Save**: Non-critical errors are collected and processed without failing the main operation 