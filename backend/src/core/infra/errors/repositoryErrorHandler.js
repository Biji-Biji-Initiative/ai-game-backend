/**
 * Repository Error Handler
 * 
 * Standardized error handling for all repositories.
 * This module provides utilities to ensure consistent error handling patterns
 * across all repository implementations following DDD principles.
 */
import { logger } from "#app/core/infra/logging/logger.js";
import { DatabaseError } from "#app/core/infra/errors/InfraErrors.js";
import { StandardErrorCodes } from "#app/core/infra/errors/errorHandler.js";
import AppError from "#app/core/infra/errors/AppError.js";

/**
 * A higher-order function that wraps repository methods with standardized error handling
 * 
 * @param {Function} repositoryMethod - The repository method to wrap
 * @param {Object} options - Configuration options
 * @param {string} options.methodName - Name of the method being wrapped
 * @param {string} options.domainName - Domain name (e.g., 'user', 'auth')
 * @param {Function} options.DomainRepositoryErrorClass - Domain-specific repository error class
 * @param {Object} [options.logger] - Logger instance (falls back to app logger)
 * @returns {Function} - Wrapped repository method with error handling
 */
export function withRepositoryErrorHandling(repositoryMethod, options) {
  const {
    methodName,
    domainName,
    DomainRepositoryErrorClass,
    logger: methodLogger = logger.child({ domain: domainName, repository: true })
  } = options;

  return async function(...args) {
    try {
      return await repositoryMethod.apply(this, args);
    } catch (error) {
      methodLogger.error(`${domainName} repository error in ${methodName}`, {
        error: error.message,
        code: error.code,
        errorName: error.name,
        methodName,
        stack: error.stack
      });

      // Map known database errors to appropriate domain errors
      if (error.code === '23505') {
        // Unique constraint violation
        throw new DomainRepositoryErrorClass(`Duplicate entry in ${domainName} repository`, {
          cause: error,
          metadata: { 
            constraint: error.constraint,
            detail: error.detail,
            methodName 
          },
          errorCode: StandardErrorCodes.DUPLICATE_ENTRY
        });
      } else if (error.code === '23503') {
        // Foreign key constraint violation
        throw new DomainRepositoryErrorClass(`Reference constraint failed in ${domainName} repository`, {
          cause: error,
          metadata: { 
            constraint: error.constraint, 
            detail: error.detail,
            methodName 
          },
          errorCode: StandardErrorCodes.INVALID_REFERENCE
        });
      } else if (error.code?.startsWith('22')) {
        // Data exception (e.g., invalid text representation)
        throw new DomainRepositoryErrorClass(`Invalid data format in ${domainName} repository`, {
          cause: error,
          metadata: { detail: error.detail, methodName },
          errorCode: StandardErrorCodes.INVALID_DATA_FORMAT
        });
      } else if (error.code?.startsWith('23')) {
        // Integrity constraint violation
        throw new DomainRepositoryErrorClass(`Data integrity violation in ${domainName} repository`, {
          cause: error,
          metadata: { detail: error.detail, methodName },
          errorCode: StandardErrorCodes.DATA_INTEGRITY_VIOLATION
        });
      } else if (error.code?.startsWith('42')) {
        // Syntax error or access rule violation
        throw new DomainRepositoryErrorClass(`Database syntax or permission error in ${domainName} repository`, {
          cause: error,
          metadata: { detail: error.detail, methodName },
          errorCode: StandardErrorCodes.DATABASE_ACCESS_ERROR
        });
      } else if (error.code?.startsWith('28')) {
        // Invalid authorization specification
        throw new DomainRepositoryErrorClass(`Database authorization error in ${domainName} repository`, {
          cause: error,
          metadata: { detail: error.detail, methodName },
          errorCode: StandardErrorCodes.DATABASE_ACCESS_ERROR
        });
      } else if (error.code?.startsWith('53')) {
        // Resource limit exceeded
        throw new DomainRepositoryErrorClass(`Database resource limit exceeded in ${domainName} repository`, {
          cause: error,
          metadata: { detail: error.detail, methodName },
          errorCode: StandardErrorCodes.RESOURCE_LIMIT_EXCEEDED
        });
      } else if (error.code?.startsWith('08')) {
        // Connection exception
        throw new DatabaseError(`Database connection error in ${domainName} repository: ${error.message}`, {
          cause: error,
          metadata: { detail: error.detail, methodName },
          errorCode: StandardErrorCodes.CONNECTION_ERROR
        });
      }

      // If error is already from our domain, just rethrow it
      if (error instanceof DomainRepositoryErrorClass || 
          error instanceof AppError) {
        throw error;
      }

      // Default case - wrap in domain repository error
      throw new DomainRepositoryErrorClass(
        `Unhandled error in ${domainName} repository during ${methodName}: ${error.message}`, 
        {
          cause: error,
          metadata: { methodName, args: sanitizeArgs(args) },
          errorCode: StandardErrorCodes.DATABASE_ERROR
        }
      );
    }
  };
}

/**
 * Helper to sanitize function arguments for logging
 * Prevents sensitive data leaking to logs
 * 
 * @param {Array} args - Arguments array to sanitize
 * @returns {Array} - Sanitized arguments array
 */
function sanitizeArgs(args) {
  return args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      // For objects, just return the keys to avoid logging sensitive values
      if (Array.isArray(arg)) {
        return `Array[${arg.length}]`;
      }
      return Object.keys(arg);
    }
    if (typeof arg === 'string') {
      // For strings, truncate if too long
      return arg.length > 50 ? `${arg.substring(0, 47)}...` : arg;
    }
    return arg;
  });
}

/**
 * Apply repository error handling to all specified methods of a class instance
 * 
 * @param {Object} instance - Repository instance
 * @param {Array<string>} methodNames - Names of methods to wrap
 * @param {Object} options - Configuration options
 * @param {string} options.domainName - Domain name (e.g., 'user', 'auth')
 * @param {Function} options.DomainRepositoryErrorClass - Domain-specific repository error class
 * @param {Object} [options.logger] - Logger instance
 */
export function applyRepositoryErrorHandling(instance, methodNames, options) {
  const {
    domainName,
    DomainRepositoryErrorClass,
    logger: instanceLogger
  } = options;

  methodNames.forEach(methodName => {
    if (typeof instance[methodName] !== 'function') {
      throw new Error(`Method ${methodName} does not exist on repository`);
    }

    const originalMethod = instance[methodName];
    instance[methodName] = withRepositoryErrorHandling(originalMethod, {
      methodName,
      domainName,
      DomainRepositoryErrorClass,
      logger: instanceLogger
    });
  });
} 