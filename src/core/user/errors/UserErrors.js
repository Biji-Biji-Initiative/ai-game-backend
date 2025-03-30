/**
 * User Domain Error Classes
 *
 * Provides specific error types for the User domain
 * following Domain-Driven Design principles.
 */
import AppError from "../../infra/errors/AppError.js";
import { DomainErrorCodes } from "../../infra/errors/DomainErrorCodes.js";
const UserErrorCodes = DomainErrorCodes.User;

/**
 * Base class for User domain errors
 */
export class UserError extends AppError {
    /**
     * Create a new UserError
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {Object} options - Additional options
     */
    constructor(message = 'User operation failed', statusCode = 400, options = {}) {
        super(message, statusCode, {
            ...options,
            errorCode: options.errorCode || 'USER_ERROR'
        });
        this.name = 'UserError';
    }
}
/**
 * User Not Found Error
 * Thrown when attempting to access a user that doesn't exist
 */
export class UserNotFoundError extends UserError {
    /**
     * Create a new UserNotFoundError
     * @param {string} identifier - User identifier (ID, email, etc.) that wasn't found
     */
    constructor(identifier = '') {
        const message = identifier ? `User not found: ${identifier}` : 'User not found';
        super(message, 404, {
            errorCode: UserErrorCodes.NOT_FOUND,
            metadata: { identifier }
        });
        this.name = 'UserNotFoundError';
    }
}
/**
 * User Update Error
 * Thrown when there's an issue updating a user
 */
export class UserUpdateError extends UserError {
    /**
     * Create a new UserUpdateError
     * @param {string} message - Error message explaining the update failure
     * @param {Object} options - Additional options
     */
    constructor(message = 'Failed to update user', options = {}) {
        super(message, 500, {
            ...options,
            errorCode: UserErrorCodes.UPDATE_FAILED
        });
        this.name = 'UserUpdateError';
    }
}
/**
 * User Validation Error
 * Thrown when user data fails validation
 */
export class UserValidationError extends UserError {
    /**
     * Create a new UserValidationError
     * @param {string} message - Error message describing the validation failure
     * @param {Object} validationErrors - Specific validation errors
     */
    constructor(message = 'Invalid user data', validationErrors = null) {
        super(message, 400, {
            errorCode: UserErrorCodes.VALIDATION,
            metadata: { validationErrors }
        });
        this.name = 'UserValidationError';
    }
}
/**
 * User Invalid State Error
 * Thrown when a user is in an invalid state for an operation
 */
export class UserInvalidStateError extends UserError {
    /**
     * Create a new UserInvalidStateError
     * @param {string} message - Error message describing the invalid state
     * @param {string} currentState - The current state of the user
     * @param {string} requiredState - The required state for the operation
     */
    constructor(message = 'User is in an invalid state for this operation', currentState = null, requiredState = null) {
        super(message, 400, {
            errorCode: UserErrorCodes.INVALID_STATE,
            metadata: { currentState, requiredState }
        });
        this.name = 'UserInvalidStateError';
    }
}
/**
 * User Authentication Error
 * Thrown when there's an issue with user authentication
 */
export class UserAuthenticationError extends UserError {
    /**
     * Create a new UserAuthenticationError
     * @param {string} message - Error message describing the authentication failure
     */
    constructor(message = 'Authentication failed') {
        super(message, 401, {
            errorCode: UserErrorCodes.AUTH_FAILED
        });
        this.name = 'UserAuthenticationError';
    }
}
/**
 * User Authorization Error
 * Thrown when a user doesn't have permission for an operation
 */
export class UserAuthorizationError extends UserError {
    /**
     * Create a new UserAuthorizationError
     * @param {string} message - Error message describing the authorization failure
     * @param {string} requiredPermission - The permission required for the operation
     */
    constructor(message = 'Not authorized', requiredPermission = null) {
        super(message, 403, {
            errorCode: UserErrorCodes.ACCESS_DENIED,
            metadata: { requiredPermission }
        });
        this.name = 'UserAuthorizationError';
    }
}
/**
 * Focus Area Error
 * Thrown when there's an issue with user focus areas
 */
export class FocusAreaError extends UserError {
    /**
     * Create a new FocusAreaError
     * @param {string} message - Error message describing the focus area issue
     */
    constructor(message = 'Focus area operation failed') {
        super(message, 400, {
            errorCode: 'FOCUS_AREA_ERROR'
        });
        this.name = 'FocusAreaError';
    }
}
// Export all errors as default export for backward compatibility
export default {
    UserError,
    UserNotFoundError,
    UserUpdateError,
    UserValidationError,
    UserInvalidStateError,
    UserAuthenticationError,
    UserAuthorizationError,
    FocusAreaError,
};
