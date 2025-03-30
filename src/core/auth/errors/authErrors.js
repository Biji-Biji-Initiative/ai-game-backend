import AppError from "../../infra/errors/AppError.js";
'use strict';
/**
 * Base class for Auth domain errors
 */
class AuthError extends AppError {
    /**
     *
     */
    /**
     * Method constructor
     */
    constructor(message = 'Auth operation failed', statusCode = 400) {
        super(message, statusCode);
        this.name = 'AuthError';
    }
}
/**
 * Auth Not Found Error
 * Thrown when attempting to access a auth that doesn't exist
 */
class AuthNotFoundError extends AuthError {
    /**
     *
     */
    /**
     * Method constructor
     */
    constructor(identifier = '') {
        const message = identifier ? `Auth not found: ${identifier}` : 'Auth not found';
        super(message, 404);
        this.name = 'AuthNotFoundError';
    }
}
/**
 * Auth Validation Error
 * Thrown when auth data fails validation
 */
class AuthValidationError extends AuthError {
    /**
     *
     */
    /**
     * Method constructor
     */
    constructor(message = 'Invalid auth data') {
        super(message, 400);
        this.name = 'AuthValidationError';
    }
}
/**
 * Auth Processing Error
 * Thrown when there's an issue processing a auth
 */
class AuthProcessingError extends AuthError {
    /**
     *
     */
    /**
     * Method constructor
     */
    constructor(message = 'Failed to process auth') {
        super(message, 500);
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
        super(message, 500);
        this.name = 'AuthRepositoryError';
        this.cause = options.cause || null;
        this.metadata = options.metadata || {};
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
