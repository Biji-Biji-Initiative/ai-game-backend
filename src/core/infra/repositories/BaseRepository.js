import { logger } from "../../infra/logging/logger.js";
import AppError from "../../infra/errors/AppError.js";
import { createErrorCollector } from "../../infra/errors/errorStandardization.js";
'use strict';
/**
 * Base Repository
 *
 * Provides standardized repository functionality for all domain repositories.
 * Implements common patterns for error handling, logging, validation,
 * field name conversion, and transaction support.
 *
 * This is the foundation class for all repositories in the domain-driven design
 * architecture. It standardizes database operations and error handling patterns
 * across the application to ensure consistent behavior.
 *
 * Features:
 * - Standardized error handling with domain-specific error types
 * - Automatic retry mechanism for transient failures
 * - Consistent logging with context
 * - Support for transactions
 * - Utility methods for data format conversion
 * - Validation helpers
 *
 * @module BaseRepository
 */
/**
 * Base Repository Error
 *
 * Parent class for all repository-specific errors.
 * Provides a consistent error structure for repository operations.
 *
 * @extends AppError
 */
class RepositoryError extends AppError {
  /**
   * Create a new repository error
   *
   * @param {string} message - Error message describing what went wrong
   * @param {Object} options - Error options for additional context
   * @param {Error} [options.cause] - Original error that caused this error (for error chaining)
   * @param {Object} [options.metadata={}] - Additional error context data
   * @param {string} [options.domainName='unknown'] - Domain name (e.g., 'user', 'challenge')
   *
   * @example
   * throw new RepositoryError('Failed to save user', {
   *   cause: originalError,
   *   domainName: 'user',
   *   metadata: { userId: '123', operation: 'save' }
   * });
   */
  constructor(message, options = {}) {
    const {
      cause,
      metadata = {},
      domainName = 'unknown'
    } = options;
    super(message, 500, {
      cause,
      metadata,
      errorCode: `${domainName.toUpperCase()}_REPOSITORY_ERROR`
    });
    this.name = 'RepositoryError';
  }
}
/**
 * Entity Not Found Error
 *
 * Used when an entity cannot be found in the repository.
 * Returns a 404 status code and includes entity information.
 *
 * @extends AppError
 */
class EntityNotFoundError extends AppError {
  /**
   * Create a new entity not found error
   *
   * @param {string} message - Error message describing what entity wasn't found
   * @param {Object} options - Error options for additional context
   * @param {string} [options.entityId] - ID of the entity that wasn't found
   * @param {string} [options.entityType='unknown'] - Type of the entity (e.g., 'user', 'challenge')
   * @param {string} [options.identifierType] - Type of identifier used (e.g., 'email', 'username') if not ID
   * @param {Object} [options.metadata={}] - Additional error context data
   *
   * @example
   * throw new EntityNotFoundError('User not found', {
   *   entityId: 'abc-123',
   *   entityType: 'user'
   * });
   */
  constructor(message, options = {}) {
    const {
      entityId,
      entityType = 'unknown',
      identifierType,
      metadata = {}
    } = options;
    super(message, 404, {
      metadata: {
        entityId,
        entityType,
        identifierType,
        ...metadata
      },
      errorCode: `${entityType.toUpperCase()}_NOT_FOUND`
    });
    this.name = 'EntityNotFoundError';
  }
}
/**
 * Validation Error
 *
 * Used for repository-level validation failures.
 * Returns a 400 status code and includes validation details.
 *
 * @extends AppError
 */
class ValidationError extends AppError {
  /**
   * Create a new validation error
   *
   * @param {string} message - Error message describing the validation failure
   * @param {Object} options - Error options for additional context
   * @param {Object|Array} [options.validationErrors] - Validation errors details
   * @param {string} [options.entityType='unknown'] - Type of the entity (e.g., 'user', 'challenge')
   * @param {Object} [options.metadata={}] - Additional error context data
   *
   * @example
   * throw new ValidationError('Invalid user data', {
   *   validationErrors: { email: 'Email is required', age: 'Age must be a number' },
   *   entityType: 'user'
   * });
   */
  constructor(message, options = {}) {
    const {
      validationErrors,
      entityType = 'unknown',
      metadata = {}
    } = options;
    super(message, 400, {
      metadata: {
        validationErrors,
        entityType,
        ...metadata
      },
      errorCode: `${entityType.toUpperCase()}_VALIDATION_ERROR`
    });
    this.name = 'ValidationError';
  }
}
/**
 * Database Error
 *
 * Used for database-specific errors.
 * Returns a 500 status code and includes operation details.
 *
 * @extends AppError
 */
class DatabaseError extends AppError {
  /**
   * Create a new database error
   *
   * @param {string} message - Error message describing the database error
   * @param {Object} options - Error options for additional context
   * @param {Error} [options.cause] - Original error that caused this error (for error chaining)
   * @param {string} [options.operation] - Database operation that failed (e.g., 'select', 'insert')
   * @param {string} [options.entityType='unknown'] - Type of the entity (e.g., 'user', 'challenge')
   * @param {Object} [options.metadata={}] - Additional error context data
   *
   * @example
   * throw new DatabaseError('Failed to query database', {
   *   cause: pgError,
   *   operation: 'select',
   *   entityType: 'user',
   *   metadata: { query: 'SELECT * FROM users' }
   * });
   */
  constructor(message, options = {}) {
    const {
      cause,
      operation,
      entityType = 'unknown',
      metadata = {}
    } = options;
    super(message, 500, {
      cause,
      metadata: {
        operation,
        entityType,
        ...metadata
      },
      errorCode: 'DATABASE_ERROR'
    });
    this.name = 'DatabaseError';
  }
}
/**
 * Base Repository Class
 *
 * Provides common repository functionality for all domain repositories.
 * This is an abstract base class that domain-specific repositories should extend.
 * It handles common operations like error mapping, logging, data transformation,
 * and transient error retry logic.
 */
class BaseRepository {
  /**
   * Create a new BaseRepository
   *
   * @param {Object} options - Repository options
   * @param {Object} options.db - Database client (Supabase, PostgreSQL, etc.)
   * @param {string} options.tableName - Database table name for this repository
   * @param {string} [options.domainName='generic'] - Domain name for logging and errors (e.g., 'user', 'challenge')
   * @param {Object} [options.logger] - Custom logger instance (defaults to app logger)
   * @param {number} [options.maxRetries=3] - Maximum number of retries for transient failures
   * @param {number} [options.retryDelay=500] - Delay between retries in milliseconds
   * @param {boolean} [options.validateUuids=false] - Whether to validate UUIDs
   * @param {Object} [options.eventBus=null] - Event bus to use for publishing events
   * @throws {Error} If database client or table name is not provided
   *
   * @example
   * class UserRepository extends BaseRepository {
   *   constructor(db, logger) {
   *     super({
   *       db,
   *       tableName: 'users',
   *       domainName: 'user',
   *       logger,
   *       maxRetries: 3
   *     });
   *   }
   * }
   */
  constructor(options = {}) {
    const {
      db,
      tableName,
      domainName = 'unknown',
      logger: loggerInstance,
      maxRetries = 3,
      validateUuids = false,
      eventBus = null
    } = options;

    if (!db) {
      throw new Error('Database client is required');
    }
    
    this.db = db;
    this.tableName = tableName;
    this.domainName = domainName;
    this.logger = loggerInstance || logger.child({ domain: domainName, repository: true });
    this.maxRetries = maxRetries;
    this.validateUuids = validateUuids;
    this.eventBus = eventBus;
    
    this._log('debug', `${this.constructor.name} initialized`, { tableName });
  }
  /**
   * Log a message with repository context
   *
   * Provides consistent logging with added repository context for easier
   * debugging and monitoring.
   *
   * @param {string} level - Log level ('debug', 'info', 'warn', 'error')
   * @param {string} message - Log message
   * @param {Object} [metadata={}] - Additional metadata to include in the log
   * @protected
   *
   * @example
   * this._log('debug', 'Fetching user by ID', { userId: '123' });
   */
  _log(level, message, metadata = {}) {
    if (this.logger && typeof this.logger[level] === 'function') {
      this.logger[level](message, {
        tableName: this.tableName,
        domainName: this.domainName,
        ...metadata
      });
    }
  }
  /**
   * Convert an object's keys from camelCase to snake_case
   *
   * Used for converting JavaScript object property names to database column names.
   * Handles nested objects and arrays recursively.
   *
   * @param {Object|Array} obj - Object with camelCase keys or array of objects
   * @returns {Object|Array} Object with snake_case keys or array of converted objects
   * @protected
   *
   * @example
   * // Returns { first_name: 'John', last_login_at: '2023-01-01' }
   * this._camelToSnake({ firstName: 'John', lastLoginAt: '2023-01-01' });
   */
  _camelToSnake(obj) {
    if (!obj || typeof obj !== 'object' || obj === null) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this._camelToSnake(item));
    }
    return Object.keys(obj).reduce((result, key) => {
      // Convert key from camelCase to snake_case
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      // Convert value if it's an object or array
      const value = obj[key];
      result[snakeKey] = this._camelToSnake(value);
      return result;
    }, {});
  }
  /**
   * Convert an object's keys from snake_case to camelCase
   *
   * Used for converting database column names to JavaScript object property names.
   * Handles nested objects and arrays recursively.
   *
   * @param {Object|Array} obj - Object with snake_case keys or array of objects
   * @returns {Object|Array} Object with camelCase keys or array of converted objects
   * @protected
   *
   * @example
   * // Returns { firstName: 'John', lastLoginAt: '2023-01-01' }
   * this._snakeToCamel({ first_name: 'John', last_login_at: '2023-01-01' });
   */
  _snakeToCamel(obj) {
    if (!obj || typeof obj !== 'object' || obj === null) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this._snakeToCamel(item));
    }
    return Object.keys(obj).reduce((result, key) => {
      // Convert key from snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      // Convert value if it's an object or array
      const value = obj[key];
      result[camelKey] = this._snakeToCamel(value);
      return result;
    }, {});
  }
  /**
   * Execute function with retry logic
   * @param {Function} fn - Function to execute
   * @param {string} operation - Name of operation for logging
   * @param {Object} metadata - Additional metadata for logging
   * @returns {Promise<any>} Result of function execution
   * @private
   */
  async _withRetry(fn, operation, metadata = {}) {
    let lastError;
    let attempt = 0;
    const maxAttempts = this.maxRetries || 3;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on validation errors
        if (error instanceof ValidationError) {
          throw error;
        }

        // Log the retry attempt
        this._log('warn', `Retry attempt ${attempt}/${maxAttempts} for ${operation}`, {
          error: error.message,
          operation,
          ...metadata
        });

        // Wait before retrying with exponential backoff
        if (attempt < maxAttempts) {
          const backoffMs = Math.min(100 * Math.pow(2, attempt), 2000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    // After all retries failed
    this._log('error', `All ${maxAttempts} retry attempts failed for ${operation}`, {
      error: lastError?.message,
      operation,
      ...metadata
    });
    throw lastError;
  }
  /**
   * Begin a new transaction
   *
   * Creates a new database transaction that can be used to group multiple operations
   * into a single atomic unit that either all succeed or all fail.
   *
   * @returns {Promise<Object>} Transaction object that can be used for subsequent operations
   * @throws {DatabaseError} If the transaction cannot be started
   *
   * @example
   * const transaction = await this.beginTransaction();
   * try {
   *   // Perform multiple operations using transaction
   *   await transaction.commit();
   * } catch (error) {
   *   await transaction.rollback();
   *   throw error;
   * }
   */
  async beginTransaction() {
    this._log('debug', 'Beginning transaction');
    try {
      const transaction = await this.db.transaction();
      this._log('debug', 'Transaction begun successfully');
      return transaction;
    } catch (error) {
      this._log('error', 'Failed to begin transaction', {
        error: error.message,
        stack: error.stack
      });
      throw this._createRepositoryError(error, 'Failed to begin transaction', {
        operation: 'beginTransaction'
      });
    }
  }
  /**
   * Execute a function within a database transaction
   * @param {Function} fn - Function to execute within transaction
   * @param {Object} [options] - Options for transaction handling
   * @param {boolean} [options.publishEvents=true] - Whether to publish collected domain events after commit
   * @param {Object} [options.eventBus=null] - Event bus to use for publishing events
   * @returns {Promise<*>} Result of the function
   * @example
   * const result = await this.withTransaction(async transaction => {
   *   // Collect entity domain events before DB operations
   *   const domainEvents = entity.getDomainEvents();
   *   entity.clearDomainEvents();
   *   
   *   // Perform DB operations within transaction
   *   await transaction.from('users').insert(...);
   *   
   *   // Return both the result and collected events for publishing after commit
   *   return { result: someResult, domainEvents };
   * });
   */
  async withTransaction(fn, options = {}) {
    const { publishEvents = true, eventBus = this.eventBus } = options;
    
    this._log('debug', 'Starting transaction');
    const transaction = await this.beginTransaction();
    
    let collectedEvents = [];
    
    try {
      // Call the provided function with the transaction
      let result = await fn(transaction);
      
      // Extract domain events if they were returned
      if (result && typeof result === 'object' && result.domainEvents) {
        collectedEvents = result.domainEvents;
        // If the result contains both result and events, extract the actual result
        if ('result' in result) {
          result = result.result;
        }
      }
      
      // Commit the transaction
      await transaction.commit();
      this._log('debug', 'Transaction committed successfully');
      
      // Publish domain events after successful commit if enabled
      if (publishEvents && collectedEvents.length > 0 && eventBus) {
        await this._publishDomainEvents(collectedEvents, eventBus);
      }
      
      return result;
    } catch (error) {
      // Rollback on error
      try {
        await transaction.rollback();
        this._log('debug', 'Transaction rolled back due to error');
      } catch (rollbackError) {
        this._log('error', 'Failed to rollback transaction', {
          originalError: error.message,
          rollbackError: rollbackError.message
        });
      }
      
      this._log('error', 'Transaction failed', {
        error: error.message,
        stack: error.stack
      });
      
      throw new DatabaseError(`Transaction failed: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'withTransaction'
      });
    }
  }
  /**
   * Publish domain events after successful transaction
   * @param {Array} events - Domain events to publish
   * @param {Object} eventBus - Event bus to use for publishing
   * @returns {Promise<void>}
   * @private
   */
  async _publishDomainEvents(events, eventBus) {
    if (!events || events.length === 0 || !eventBus) {
      return;
    }
    
    const errorCollector = createErrorCollector();
    
    for (const event of events) {
      try {
        this._log('debug', 'Publishing domain event post-commit', {
          eventType: event.type,
          eventId: event.id
        });
        
        await eventBus.publish(event);
      } catch (error) {
        errorCollector.collect(error, `event_publishing_${event.type}`);
        this._log('error', 'Failed to publish domain event post-commit', {
          eventType: event.type,
          eventId: event.id,
          error: error.message,
          stack: error.stack
        });
      }
    }
    
    if (errorCollector.hasErrors()) {
      this._log('warn', 'Some domain events failed to publish after transaction', {
        errorCount: errorCollector.getErrors().length
      });
    }
  }
  /**
   * Validate an ID parameter
   *
   * Ensures that the provided ID is valid according to the repository's requirements.
   * Validates format and throws appropriate errors for invalid values.
   *
   * @param {string} id - The ID to validate
   * @param {string} [paramName='id'] - Name of the parameter for error messages
   * @throws {ValidationError} If the ID is invalid, null, or undefined
   * @protected
   *
   * @example
   * // Validates and throws appropriate error if invalid
   * this._validateId(userId, 'userId');
   */
  _validateId(id, paramName = 'id') {
    if (!id) {
      throw new ValidationError(`${paramName} is required`, {
        entityType: this.domainName,
        validationErrors: {
          [paramName]: 'Required parameter is missing'
        }
      });
    }
    if (typeof id !== 'string' && typeof id !== 'number') {
      throw new ValidationError(`${paramName} must be a string or number`, {
        entityType: this.domainName,
        validationErrors: {
          [paramName]: `Invalid type: ${typeof id}`
        }
      });
    }
    // If using UUIDs, validate the format
    if (this.validateUuids && typeof id === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        throw new ValidationError(`Invalid UUID format for ${paramName}`, {
          entityType: this.domainName,
          validationErrors: {
            [paramName]: 'Must be a valid UUID'
          }
        });
      }
    }
  }
  /**
   * Validate required parameters
   *
   * Ensures that all required parameters are present in the provided object.
   * Useful for validating method inputs before database operations.
   *
   * @param {Object} params - Object containing parameters to validate
   * @param {Array<string>} requiredParams - Array of parameter names that are required
   * @throws {ValidationError} If any required parameter is missing
   * @protected
   *
   * @example
   * // Throws if email or name are missing
   * this._validateRequiredParams(userData, ['email', 'name']);
   */
  _validateRequiredParams(params, requiredParams) {
    if (!params || typeof params !== 'object') {
      throw new ValidationError('Parameters object is required', {
        entityType: this.domainName
      });
    }
    if (!Array.isArray(requiredParams) || requiredParams.length === 0) {
      return;
    }
    const missingParams = requiredParams.filter(param => {
      return params[param] === undefined || params[param] === null;
    });
    if (missingParams.length > 0) {
      throw new ValidationError('Required parameters are missing', {
        entityType: this.domainName,
        validationErrors: missingParams.reduce((errors, param) => {
          errors[param] = 'Required parameter is missing';
          return errors;
        }, {})
      });
    }
  }
}
export { BaseRepository };
export { RepositoryError };
export { EntityNotFoundError };
export { ValidationError };
export { DatabaseError };
export default {
  BaseRepository,
  RepositoryError,
  EntityNotFoundError,
  ValidationError,
  DatabaseError
};