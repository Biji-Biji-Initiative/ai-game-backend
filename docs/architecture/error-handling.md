# Error Handling Framework

This document explains the error handling framework used in the AI Fight Club API.

## Overview

Our error handling system follows a domain-centric approach, ensuring that errors are:

1. **Properly categorized** by domain and type
2. **Consistently formatted** across the application
3. **Appropriately propagated** to the client
4. **Well-logged** for debugging and monitoring

## Error Hierarchy

```
AppError (Base Error)
├── DomainError (Abstract Base for Domain Errors)
│   ├── UserDomainError
│   │   ├── UserNotFoundError
│   │   ├── InvalidUserDataError
│   │   └── UserAuthenticationError
│   ├── ChallengeDomainError
│   │   ├── ChallengeNotFoundError
│   │   ├── InvalidChallengeDataError
│   │   └── ChallengeAccessDeniedError
│   ├── EvaluationDomainError
│   │   ├── EvaluationFailedError
│   │   └── InvalidEvaluationDataError
│   └── ... (other domain errors)
├── InfrastructureError
│   ├── DatabaseError
│   ├── ExternalServiceError
│   │   ├── OpenAIError
│   │   └── SupabaseError
│   └── CacheError
└── ApplicationError
    ├── ValidationError
    ├── AuthorizationError
    └── ConfigurationError
```

## AppError Base Class

The `AppError` serves as the base error class for all application errors:

```javascript
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'APP_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.errorCode,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }
}
```

## Domain-Specific Errors

Each domain has its own error classes for domain-specific errors:

```javascript
class DomainError extends AppError {
  constructor(message, statusCode, errorCode, details) {
    super(message, statusCode, errorCode, details);
  }
}

class UserDomainError extends DomainError {
  constructor(message, statusCode = 400, errorCode = 'USER_ERROR', details = {}) {
    super(message, statusCode, errorCode, details);
  }
}

class UserNotFoundError extends UserDomainError {
  constructor(userId, details = {}) {
    super(`User with ID ${userId} not found`, 404, 'USER_NOT_FOUND', details);
    this.userId = userId;
  }
}
```

## Error Middleware

The Express middleware catches and formats all errors:

```javascript
// errorMiddleware.js
const errorMiddleware = (err, req, res, next) => {
  // Default to 500 Internal Server Error if statusCode is not set
  const statusCode = err.statusCode || 500;
  
  // Log error (with different levels based on severity)
  if (statusCode >= 500) {
    logger.error('Server error', { 
      error: err.message, 
      stack: err.stack,
      details: err.details
    });
  } else {
    logger.warn('Client error', { 
      error: err.message, 
      code: err.errorCode,
      details: err.details
    });
  }
  
  // Send response
  res.status(statusCode).json(
    err.toJSON ? err.toJSON() : {
      error: {
        message: err.message,
        code: err.errorCode || 'UNKNOWN_ERROR',
        statusCode
      }
    }
  );
};

module.exports = errorMiddleware;
```

## Error Handling in Domain Services

Domain services catch lower-level errors and rethrow domain-specific errors:

```javascript
class ChallengeService {
  constructor(challengeRepository, openAIClient) {
    this.challengeRepository = challengeRepository;
    this.openAIClient = openAIClient;
  }
  
  async getChallenge(challengeId) {
    try {
      const challenge = await this.challengeRepository.findById(challengeId);
      
      if (!challenge) {
        throw new ChallengeNotFoundError(challengeId);
      }
      
      return challenge;
    } catch (error) {
      // Rethrow domain-specific errors
      if (error instanceof DomainError) {
        throw error;
      }
      
      // Convert database errors to domain errors
      if (error.code === 'DATABASE_ERROR') {
        throw new ChallengeDomainError(
          'Error retrieving challenge',
          500,
          'CHALLENGE_RETRIEVAL_ERROR',
          { originalError: error.message }
        );
      }
      
      // Default error
      throw new AppError(
        'Unexpected error retrieving challenge',
        500,
        'UNEXPECTED_ERROR',
        { originalError: error.message }
      );
    }
  }
}
```

## Error Handling in Coordinators

Coordinators handle cross-domain error consolidation:

```javascript
class CompleteUserChallengeCoordinator {
  // ... constructor and other methods ...
  
  async execute(userId, challengeId, response) {
    try {
      // Business logic...
    } catch (error) {
      // Add context to the error if needed
      if (error instanceof ChallengeNotFoundError) {
        // Enhance with user context
        error.details = {
          ...error.details,
          userId,
          attemptedOperation: 'Complete Challenge'
        };
      }
      
      // Log the error with the coordinator context
      logger.error('Error in CompleteUserChallengeCoordinator', {
        userId,
        challengeId,
        errorMessage: error.message,
        errorCode: error.errorCode
      });
      
      // Rethrow the error to be handled by middleware
      throw error;
    }
  }
}
```

## Handling External Service Errors

External service errors are wrapped in domain-specific errors:

```javascript
class OpenAIClient {
  // ... other methods ...
  
  async createResponse(options) {
    try {
      const response = await this.client.createResponse(options);
      return response;
    } catch (error) {
      // Transform OpenAI errors into application errors
      if (error.response?.status === 401) {
        throw new ExternalServiceError(
          'Authentication error with OpenAI',
          401,
          'OPENAI_AUTH_ERROR',
          { originalError: error.message }
        );
      }
      
      if (error.response?.status === 429) {
        throw new ExternalServiceError(
          'Rate limit exceeded with OpenAI',
          429,
          'OPENAI_RATE_LIMIT',
          { originalError: error.message }
        );
      }
      
      // Default case
      throw new ExternalServiceError(
        'Error communicating with OpenAI',
        500,
        'OPENAI_SERVICE_ERROR',
        { originalError: error.message }
      );
    }
  }
}
```

## Validation Errors

Validation errors are handled using a specific error type:

```javascript
const { z } = require('zod');

// Schema definition
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced'])
});

// In the controller or service
function createUser(userData) {
  try {
    // Validate input
    const validatedData = createUserSchema.parse(userData);
    
    // Proceed with validated data
    return userService.createUser(validatedData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Transform Zod validation errors
      throw new ValidationError(
        'Invalid user data',
        400,
        'VALIDATION_ERROR',
        { validationErrors: error.errors }
      );
    }
    throw error;
  }
}
```

## Error Monitoring and Logging

Errors are logged with detailed context for monitoring:

```javascript
// Configure error reporting and monitoring
const setupErrorMonitoring = () => {
  // Log all unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason,
      stack: reason.stack,
      promise
    });
  });
  
  // Log all uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.fatal('Uncaught Exception', {
      error,
      stack: error.stack
    });
    
    // Exit process after logging
    process.exit(1);
  });
};
```

## Testing Error Handling

Error handling is thoroughly tested:

```javascript
// Testing domain error handling
describe('ChallengeService', () => {
  it('should throw ChallengeNotFoundError when challenge does not exist', async () => {
    // Arrange
    const mockRepo = {
      findById: jest.fn().mockResolvedValue(null)
    };
    const service = new ChallengeService(mockRepo);
    
    // Act & Assert
    await expect(service.getChallenge('nonexistent-id'))
      .rejects
      .toThrow(ChallengeNotFoundError);
  });
  
  it('should wrap database errors in ChallengeDomainError', async () => {
    // Arrange
    const dbError = new Error('Database connection lost');
    dbError.code = 'DATABASE_ERROR';
    
    const mockRepo = {
      findById: jest.fn().mockRejectedValue(dbError)
    };
    const service = new ChallengeService(mockRepo);
    
    // Act & Assert
    await expect(service.getChallenge('any-id'))
      .rejects
      .toThrow(ChallengeDomainError);
  });
}); 