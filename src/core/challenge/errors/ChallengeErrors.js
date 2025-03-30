import { AppError } from "../../infra/errors/ErrorHandler.js";
'use strict';
/**
 * Base class for Challenge domain errors
 */
class ChallengeError extends AppError {
    /**
     * Create a new ChallengeError instance
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     */
    constructor(message = 'Challenge operation failed', statusCode = 400) {
        super(message, statusCode);
        this.name = 'ChallengeError';
    }
}
/**
 * Challenge Not Found Error
 * Thrown when attempting to access a challenge that doesn't exist
 */
class ChallengeNotFoundError extends ChallengeError {
    /**
     * Create a new ChallengeNotFoundError instance
     * @param {string} identifier - Challenge identifier (ID or other identifying info)
     */
    constructor(identifier = '') {
        const message = identifier ? `Challenge not found: ${identifier}` : 'Challenge not found';
        super(message, 404);
        this.name = 'ChallengeNotFoundError';
    }
}
/**
 * Challenge Validation Error
 * Thrown when challenge data fails validation
 */
class ChallengeValidationError extends ChallengeError {
    /**
     * Create a new ChallengeValidationError instance
     * @param {string} message - Error message describing the validation issue
     */
    constructor(message = 'Invalid challenge data') {
        super(message, 400);
        this.name = 'ChallengeValidationError';
    }
}
/**
 * Challenge Processing Error
 * Thrown when there's an issue processing a challenge
 */
class ChallengeProcessingError extends ChallengeError {
    /**
     * Create a new ChallengeProcessingError instance
     * @param {string} message - Error message describing the processing issue
     */
    constructor(message = 'Failed to process challenge') {
        super(message, 500);
        this.name = 'ChallengeProcessingError';
    }
}
/**
 * Challenge Repository Error
 * Thrown when there's an issue with the challenge repository operations
 */
class ChallengeRepositoryError extends ChallengeError {
    /**
     * Create a new ChallengeRepositoryError instance
     * @param {string} message - Error message describing the repository issue
     * @param {Object} options - Additional error options
     * @param {Error} [options.cause] - The original error that caused this error
     * @param {Object} [options.metadata] - Additional metadata about the error
     */
    constructor(message = 'Failed to perform challenge repository operation', options = {}) {
        super(message, 500);
        this.name = 'ChallengeRepositoryError';
        this.cause = options.cause || null;
        this.metadata = options.metadata || {};
    }
}
export { ChallengeError };
export { ChallengeNotFoundError };
export { ChallengeValidationError };
export { ChallengeProcessingError };
export { ChallengeRepositoryError };
export default {
    ChallengeError,
    ChallengeNotFoundError,
    ChallengeValidationError,
    ChallengeProcessingError,
    ChallengeRepositoryError
};
