import AppError from "../../infra/errors/AppError.js";
'use strict';
/**
 * Base class for UserJourney domain errors
 */
class UserJourneyError extends AppError {
    /**
     * Create a new UserJourneyError
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     */
    constructor(message = 'UserJourney operation failed', statusCode = 400) {
        super(message, statusCode);
        this.name = 'UserJourneyError';
    }
}
/**
 * UserJourney Not Found Error
 * Thrown when attempting to access a userJourney that doesn't exist
 */
class UserJourneyNotFoundError extends UserJourneyError {
    /**
     * Create a new UserJourneyNotFoundError
     * @param {string} identifier - UserJourney identifier that wasn't found
     */
    constructor(identifier = '') {
        const message = identifier ? `UserJourney not found: ${identifier}` : 'UserJourney not found';
        super(message, 404);
        this.name = 'UserJourneyNotFoundError';
    }
}
/**
 * UserJourney Validation Error
 * Thrown when userJourney data fails validation
 */
class UserJourneyValidationError extends UserJourneyError {
    /**
     * Create a new UserJourneyValidationError
     * @param {string} message - Error message describing the validation failure
     */
    constructor(message = 'Invalid userJourney data') {
        super(message, 400);
        this.name = 'UserJourneyValidationError';
    }
}
/**
 * UserJourney Processing Error
 * Thrown when there's an issue processing a userJourney
 */
class UserJourneyProcessingError extends UserJourneyError {
    /**
     * Create a new UserJourneyProcessingError
     * @param {string} message - Error message describing the processing failure
     */
    constructor(message = 'Failed to process userJourney') {
        super(message, 500);
        this.name = 'UserJourneyProcessingError';
    }
}
/**
 * UserJourney Repository Error
 * Thrown when there's an issue with the userJourney repository operations
 */
class UserJourneyRepositoryError extends UserJourneyError {
    /**
     * Create a new UserJourneyRepositoryError
     * @param {string} message - Error message describing the repository operation failure
     * @param {Object} options - Additional error options
     * @param {Error} [options.cause] - The underlying error that caused this error
     * @param {Object} [options.metadata] - Additional metadata about the error
     */
    constructor(message = 'Failed to perform userJourney repository operation', options = {}) {
        super(message, 500);
        this.name = 'UserJourneyRepositoryError';
        this.cause = options.cause || null;
        this.metadata = options.metadata || {};
    }
}
export { UserJourneyError };
export { UserJourneyNotFoundError };
export { UserJourneyValidationError };
export { UserJourneyProcessingError };
export { UserJourneyRepositoryError };
export default {
    UserJourneyError,
    UserJourneyNotFoundError,
    UserJourneyValidationError,
    UserJourneyProcessingError,
    UserJourneyRepositoryError
};
