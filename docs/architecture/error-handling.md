# Error Handling Architecture

This document provides a comprehensive guide to the standardized error handling approach in our application.

## Overview

Our application implements a consistent error handling pattern across all layers to provide clear error messages, proper logging, and appropriate HTTP status codes for API errors. The system is designed to maintain security by preventing sensitive information leakage while providing useful diagnostic information.

## Error Classification

Errors in our system are classified into the following categories:

1. **Operational Errors** - Expected errors that occur during normal operation
   - Invalid user input
   - Resource not found
   - Authentication/authorization failures
   - External service unavailability

2. **Programming Errors** - Bugs and unexpected failures
   - Type errors
   - Undefined variables
   - Invalid operation
   - Unexpected state

3. **Infrastructure Errors** - System-level issues
   - Database connection failures
   - File system errors
   - Network timeouts
   - Memory/CPU limitations

## Error Hierarchy

We implement a custom error hierarchy that extends from JavaScript's native `Error` class:

```
Error (native)
  └── AppError (base application error)
      ├── ValidationError
      ├── NotFoundError
      ├── AuthenticationError
      ├── AuthorizationError
      ├── ConflictError
      ├── DependencyError
      ├── RateLimitError
      └── InternalServerError
```

### Base Error Class

All application errors extend from `AppError`, which ensures consistent properties:

```javascript
class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.httpCode = options.httpCode || 500;
    this.code = options.code || 'ERR_UNKNOWN';
    this.data = options.data || {};
    this.isOperational = options.isOperational !== false;
    this.cause = options.cause;
    
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### Standard Error Types

| Error Class | HTTP Code | Description | Usage |
|-------------|-----------|-------------|-------|
| ValidationError | 400 | Invalid input data | When user input fails validation |
| NotFoundError | 404 | Resource not found | When a requested resource doesn't exist |
| AuthenticationError | 401 | Authentication failed | Invalid credentials, expired tokens |
| AuthorizationError | 403 | Permission denied | User lacks required permissions |
| ConflictError | 409 | Resource conflict | Duplicate entries, version conflicts |
| DependencyError | 503 | External service issue | Third-party API failures |
| RateLimitError | 429 | Too many requests | Rate limiting thresholds exceeded |
| InternalServerError | 500 | Unexpected server error | Unhandled errors, system failures |

## Error Creation Patterns

### Domain Layer

In the domain layer, create domain-specific errors that best represent the business rules violation:

```javascript
// Example: Creating a domain-specific error
throw new UserDomainError('Username already taken', {
  code: 'USER_ALREADY_EXISTS',
  httpCode: 409,
  data: { username }
});
```

### Application Layer

Application services should catch domain errors and translate them to appropriate application errors:

```javascript
try {
  await this.userRepository.create(user);
} catch (error) {
  if (error.code === 'USER_ALREADY_EXISTS') {
    throw new ConflictError('A user with this username already exists', {
      code: 'USER_CONFLICT',
      data: { username: user.username }
    });
  }
  throw error;
}
```

### API Controllers

API controllers should focus on catching and formatting errors for HTTP responses:

```javascript
async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error); // Pass to error handling middleware
  }
}
```

## Error Handling Middleware

For Express.js applications, we implement a centralized error handling middleware:

```javascript
function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('API Error', { 
    error: err.message,
    stack: err.stack,
    code: err.code,
    data: err.data,
    url: req.originalUrl,
    method: req.method,
    correlationId: req.correlationId
  });

  // Determine if this is a known error type
  const isKnownError = err instanceof AppError;
  
  // Default to 500 if not a known error type
  const statusCode = isKnownError ? err.httpCode : 500;
  
  // Create sanitized error response
  const errorResponse = {
    success: false,
    error: {
      message: isKnownError ? err.message : 'Internal server error',
      code: isKnownError ? err.code : 'ERR_INTERNAL',
      // Only include additional data for operational errors
      ...(isKnownError && err.isOperational && err.data && { data: err.data })
    }
  };

  // Include request ID for troubleshooting
  if (req.correlationId) {
    errorResponse.error.requestId = req.correlationId;
  }

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}
```

## Async Error Handling

For handling async errors, we use a wrapper function to avoid try/catch blocks in every controller:

```javascript
// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage in routes
router.post('/users', asyncHandler(userController.createUser));
```

## Global Error Handling

For unhandled promise rejections and uncaught exceptions:

```javascript
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('Unhandled Promise Rejection', { reason, stack: reason.stack });
  // In production, you might want to restart the process via process manager
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught Exception', { error, stack: error.stack });
  // In production, the process should be restarted via process manager
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});
```

## Validation Errors

For input validation, we use a consistent approach with detailed validation errors:

```javascript
// Example using Joi validation
function validateUser(data) {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  });

  const result = schema.validate(data, { abortEarly: false });
  
  if (result.error) {
    const details = result.error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      type: detail.type
    }));
    
    throw new ValidationError('Validation failed', {
      code: 'VALIDATION_ERROR',
      data: { details }
    });
  }
  
  return result.value;
}
```

## Error Logging

All errors should be consistently logged with appropriate context:

```javascript
// For operational errors
logger.warn('User creation failed', { 
  error: error.message,
  code: error.code,
  username: username,
  correlationId: context.correlationId
});

// For programming errors or system failures
logger.error('Database query failed', {
  error: error.message,
  stack: error.stack,
  query: queryDetails,
  correlationId: context.correlationId
});
```

## Security Considerations

1. **Never expose stack traces** in production environments
2. **Sanitize error messages** to prevent information disclosure
3. **Avoid revealing implementation details** in error responses
4. **Use generic error messages** for authentication failures
5. **Include request IDs** for correlating client errors with server logs

## Best Practices

1. **Be explicit about error types** - Use the most specific error class
2. **Include relevant context** - Provide data that helps diagnose the issue
3. **Keep error messages user-friendly** - Clear, actionable messages
4. **Centralize error handling** - Use middleware patterns
5. **Log all errors** - But at appropriate severity levels
6. **Use correlation IDs** - To track errors across services
7. **Fail fast** - Validate input early in the request lifecycle
8. **Graceful degradation** - Handle dependency failures gracefully
9. **Automated monitoring** - Set up alerts for critical error patterns
10. **Document common errors** - Include possible errors in API documentation