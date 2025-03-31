# ERR-3: Add Context to Infrastructure Errors

## Problem Statement

After examining the codebase, I identified that infrastructure errors (particularly in `InfraErrors.js` and `ApiIntegrationError.js`) lack sufficient context to effectively diagnose root causes. Current error handling:

1. Captures basic error information but misses important operational context
2. Does not consistently include resource identifiers, operation types, or service names
3. Makes debugging infrastructure issues more time-consuming than necessary

## Implementation Strategy

To address these issues, I'll enhance infrastructure errors with richer context by:

1. Extending base infrastructure error classes with metadata support
2. Ensuring consistent error property naming across the codebase
3. Adding specific contextual properties for different error types
4. Improving error logging to capture the enhanced context

## Implementation Details

### 1. Update Infrastructure Error Base Classes

First, I'll enhance the base `InfraError` class to support better context:

```javascript
// src/core/infra/errors/InfraErrors.js

/**
 * Base class for infrastructure errors
 * @extends Error
 */
class InfraError extends Error {
  /**
   * Create a new infrastructure error
   * @param {string} message - Error message
   * @param {Object} options - Error options
   * @param {Error} options.cause - Original error that caused this error
   * @param {string} options.component - Infrastructure component name (e.g., 'database', 'cache')
   * @param {string} options.operation - Operation being performed (e.g., 'connect', 'query')
   * @param {Object} options.resource - Resource details (e.g., {type: 'table', name: 'users'})
   * @param {Object} options.metadata - Additional contextual data
   */
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    
    // Standard context fields
    this.component = options.component || 'infrastructure';
    this.operation = options.operation;
    this.resource = options.resource;
    
    // Store original error information if provided
    if (options.cause) {
      this.cause = options.cause;
      this.originalErrorName = options.cause.name;
      this.originalErrorMessage = options.cause.message;
      this.originalErrorStack = options.cause.stack;
    }
    
    // Store additional metadata for debugging
    this.metadata = options.metadata || {};
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * Get a JSON representation of the error for logging
   * @returns {Object} JSON representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      component: this.component,
      operation: this.operation,
      resource: this.resource,
      originalError: this.cause ? {
        name: this.originalErrorName,
        message: this.originalErrorMessage
      } : undefined,
      metadata: this.metadata
    };
  }
}

/**
 * Database infrastructure error
 * @extends InfraError
 */
class DatabaseError extends InfraError {
  /**
   * Create a new database error
   * @param {string} message - Error message
   * @param {Object} options - Error options
   * @param {Error} options.cause - Original database error
   * @param {string} options.operation - Database operation (e.g., 'query', 'insert')
   * @param {Object} options.resource - Resource details (e.g., {table: 'users'})
   * @param {string} options.entityType - Entity type being operated on
   * @param {string} options.queryType - Type of query being executed
   * @param {Object} options.metadata - Additional metadata
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      component: 'database'
    });
    
    // Database-specific context
    this.entityType = options.entityType;
    this.queryType = options.queryType;
    
    // Add to metadata for serialization
    this.metadata = {
      ...this.metadata,
      entityType: this.entityType,
      queryType: this.queryType
    };
  }
}

/**
 * Cache infrastructure error
 * @extends InfraError
 */
class CacheError extends InfraError {
  /**
   * Create a new cache error
   * @param {string} message - Error message
   * @param {Object} options - Error options
   * @param {Error} options.cause - Original cache error
   * @param {string} options.operation - Cache operation (e.g., 'get', 'set')
   * @param {string} options.cacheKey - Key being accessed
   * @param {string} options.cacheProvider - Cache provider name
   * @param {Object} options.metadata - Additional metadata
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      component: 'cache'
    });
    
    // Cache-specific context
    this.cacheKey = options.cacheKey;
    this.cacheProvider = options.cacheProvider;
    
    // Add to metadata for serialization
    this.metadata = {
      ...this.metadata,
      cacheKey: this.cacheKey,
      cacheProvider: this.cacheProvider
    };
  }
}

// Export all error classes
export {
  InfraError,
  DatabaseError,
  CacheError
};
```

### 2. Enhance API Integration Error

Next, I'll update the API integration errors:

```javascript
// src/core/infra/errors/ApiIntegrationError.js

import { InfraError } from './InfraErrors.js';

/**
 * API integration error class
 * @extends InfraError
 */
class ApiIntegrationError extends InfraError {
  /**
   * Create a new API integration error
   * @param {string} message - Error message
   * @param {Object} options - Error options
   * @param {Error} options.cause - Original API error
   * @param {string} options.serviceName - External service name
   * @param {string} options.endpoint - API endpoint
   * @param {string} options.method - HTTP method
   * @param {number} options.statusCode - HTTP status code
   * @param {string} options.requestId - Request ID
   * @param {Object} options.responseData - Sanitized response data
   * @param {Object} options.metadata - Additional metadata
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      component: 'api'
    });
    
    // API-specific context
    this.serviceName = options.serviceName;
    this.endpoint = options.endpoint;
    this.method = options.method;
    this.statusCode = options.statusCode;
    this.requestId = options.requestId;
    this.responseData = options.responseData;
    
    // Add to metadata for serialization
    this.metadata = {
      ...this.metadata,
      serviceName: this.serviceName,
      endpoint: this.endpoint,
      method: this.method,
      statusCode: this.statusCode,
      requestId: this.requestId,
      responseData: this.responseData
    };
  }
}

/**
 * OpenAI API error
 * @extends ApiIntegrationError
 */
class OpenAIError extends ApiIntegrationError {
  /**
   * Create a new OpenAI API error
   * @param {string} message - Error message
   * @param {Object} options - Error options
   * @param {string} options.model - AI model name
   * @param {string} options.prompt - Truncated prompt (for security)
   * @param {Object} options.metadata - Additional metadata
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      serviceName: 'openai'
    });
    
    // OpenAI-specific context
    this.model = options.model;
    this.prompt = options.prompt; // Should be truncated/sanitized
    
    // Add to metadata for serialization
    this.metadata = {
      ...this.metadata,
      model: this.model,
      promptLength: this.prompt ? this.prompt.length : 0
    };
  }
}

// Export error classes
export {
  ApiIntegrationError,
  OpenAIError
};
```

### 3. Update File Storage Errors

For file storage operations:

```javascript
// src/core/infra/errors/FileStorageErrors.js

import { InfraError } from './InfraErrors.js';

/**
 * File storage error
 * @extends InfraError
 */
class FileStorageError extends InfraError {
  /**
   * Create a new file storage error
   * @param {string} message - Error message
   * @param {Object} options - Error options
   * @param {Error} options.cause - Original storage error
   * @param {string} options.operation - Storage operation
   * @param {string} options.storageProvider - Storage provider name
   * @param {string} options.filePath - File path or identifier
   * @param {number} options.fileSize - File size in bytes
   * @param {Object} options.metadata - Additional metadata
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      component: 'fileStorage'
    });
    
    // File storage specific context
    this.storageProvider = options.storageProvider;
    this.filePath = options.filePath;
    this.fileSize = options.fileSize;
    
    // Add to metadata for serialization
    this.metadata = {
      ...this.metadata,
      storageProvider: this.storageProvider,
      filePath: this.filePath,
      fileSize: this.fileSize
    };
  }
}

export {
  FileStorageError
};
```

### 4. Update Usage in OpenAI Client Adapter

Enhance error handling in the OpenAI client adapter:

```javascript
// src/core/ai/adapters/OpenAIClientAdapter.js (partial)

import { OpenAIError } from '../../infra/errors/ApiIntegrationError.js';

// Inside sendJsonMessage method
try {
  const response = await this.openAIClient.sendJsonMessage(messages, options);
  // ...
} catch (error) {
  // Enhanced error with rich context
  throw new OpenAIError(`OpenAI API request failed: ${error.message}`, {
    cause: error,
    endpoint: '/v1/chat/completions',
    method: 'POST',
    statusCode: error.status || error.statusCode,
    requestId: error.headers?.['x-request-id'],
    model: options.model,
    prompt: messages[0]?.content?.substring(0, 100) + '...', // Truncated for security
    metadata: {
      messageCount: messages.length,
      correlationId: options.correlationId
    }
  });
}
```

## Benefits

The enhanced error context provides several benefits:

1. **Improved Debugging**: More context means faster identification of root causes
2. **Better Monitoring**: Detailed error data enables more effective error tracking
3. **Streamlined Triage**: Operations teams can prioritize errors more effectively
4. **Consistency**: Standardized error properties across the codebase

## Testing Strategy

1. **Unit Tests**: Test error creation with various context attributes
2. **Integration Tests**: Verify error context flows through error hierarchies
3. **Logging Tests**: Confirm error context is properly captured in logs

## Next Steps

After implementation, we should:

1. Update error documentation with the new context fields
2. Enhance monitoring dashboards to leverage the additional error data
3. Create standardized error reporting practices for development teams
