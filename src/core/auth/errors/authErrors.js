import AppError from "../../infra/errors/AppError.js";
import { DomainErrorCodes } from "../../infra/errors/DomainErrorCodes.js";
const UserErrorCodes = DomainErrorCodes.User
'use strict';
/**
 * Base class for Auth domain errors
 */
class AuthError extends AppError {
    /**
     * Create a new AuthError instance
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {Object} options - Additional options
     */
    constructor(message = 'Auth operation failed', statusCode = 400, options = {}) {
        super(message, statusCode, {
            ...options,
            errorCode: options.errorCode || 'AUTH_ERROR'
        });
        this.name = 'AuthError';
    }
}
/**
 * Auth Not Found Error
 * Thrown when attempting to access an auth entity that doesn't exist
 */
class AuthNotFoundError extends AuthError {
    /**
     * Create a new AuthNotFoundError instance
     * @param {string} identifier - Auth identifier (ID or other identifying info)
     */
    constructor(identifier = '') {
        const message = identifier ? `Auth entity not found: ${identifier}` : 'Auth entity not found';
        super(message, 404, {
            errorCode: DomainErrorCodes.NOT_FOUND,
            metadata: { identifier }
        });
        this.name = 'AuthNotFoundError';
    }
}
/**
 * Auth Validation Error
 * Thrown when auth data fails validation
 */
class AuthValidationError extends AuthError {
    /**
     * Create a new AuthValidationError instance
     * @param {string} message - Error message describing the validation issue
     * @param {Object} validationErrors - Specific validation errors
     */
    constructor(message = 'Invalid auth data', validationErrors = null) {
        super(message, 400, {
            errorCode: DomainErrorCodes.VALIDATION_ERROR,
            metadata: { validationErrors }
        });
        this.name = 'AuthValidationError';
    }
}
/**
 * Auth Processing Error
 * Thrown when there's an issue processing a auth
 */
class AuthProcessingError extends AuthError {
    /**
     * Create a new AuthProcessingError instance
     * @param {string} message - Error message describing the processing issue
     * @param {Object} options - Additional options
     */
    constructor(message = 'Failed to process auth', options = {}) {
        super(message, 500, {
            ...options,
            errorCode: DomainErrorCodes.DOMAIN_ERROR
        });
        this.name = 'AuthProcessingError';
    }
}
/**
 * Auth Repository Error
 * Thrown when there's an issue with the auth repository operations
 */
class AuthRepositoryError extends AuthError {
    /**
     * Create a new AuthRepositoryError instance
     * @param {string} message - Error message describing the repository issue
     * @param {Object} options - Additional error options
     * @param {Error} [options.cause] - The original error that caused this error
     * @param {Object} [options.metadata] - Additional metadata about the error
     */
    constructor(message = 'Failed to perform auth repository operation', options = {}) {
        super(message, 500, {
            ...options,
            errorCode: DomainErrorCodes.DATABASE_ERROR,
            cause: options.cause,
            metadata: options.metadata
        });
        this.name = 'AuthRepositoryError';
    }
}

export { AuthError };
export { AuthNotFoundError };
export { AuthValidationError };
export { AuthProcessingError };
export { AuthRepositoryError };

export default {
    AuthError,
    AuthNotFoundError,
    AuthValidationError,
    AuthProcessingError,
    AuthRepositoryError
};
