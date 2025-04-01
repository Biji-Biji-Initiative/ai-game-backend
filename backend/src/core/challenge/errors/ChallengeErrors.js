// eslint-disable-next-line import/no-unresolved
import { AppError, StandardErrorCodes } from "#app/core/infra/errors/ErrorHandler.js";
'use strict';
/**
 * Base class for Challenge domain errors
 */
class ChallengeError extends AppError {
    /**
     * Create a new ChallengeError instance
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {Object} options - Additional options
     */
    constructor(message = 'Challenge operation failed', statusCode = 400, options = {}) {
        super(message, statusCode, {
            ...options,
            errorCode: options.errorCode || 'CHALLENGE_ERROR'
        });
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
        super(message, 404, {
            errorCode: StandardErrorCodes.NOT_FOUND,
            metadata: { identifier }
        });
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
     * @param {Object} validationErrors - Specific validation errors
     */
    constructor(message = 'Invalid challenge data', validationErrors = null) {
        super(message, 400, {
            errorCode: StandardErrorCodes.VALIDATION_ERROR,
            metadata: { validationErrors }
        });
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
     * @param {Object} options - Additional error options
     */
    constructor(message = 'Failed to process challenge', options = {}) {
        super(message, 500, {
            ...options,
            errorCode: StandardErrorCodes.DOMAIN_ERROR
        });
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
        super(message, 500, {
            ...options,
            errorCode: StandardErrorCodes.DATABASE_ERROR,
            cause: options.cause,
            metadata: options.metadata
        });
        this.name = 'ChallengeRepositoryError';
    }
}
/**
 * Challenge Generation Error
 * Thrown when there's an issue with the challenge generation process
 */
class ChallengeGenerationError extends ChallengeError {
    /**
     * Create a new ChallengeGenerationError instance
     * @param {string} message - Error message describing the generation issue
     * @param {Object} options - Additional error options
     * @param {Error} [options.cause] - The original error that caused this error
     */
    constructor(message = 'Failed to generate challenge', options = {}) {
        super(message, 500, {
            ...options,
            errorCode: options.errorCode || 'CHALLENGE_GENERATION_ERROR',
            cause: options.cause
        });
        this.name = 'ChallengeGenerationError';
    }
}
export { ChallengeError };
export { ChallengeNotFoundError };
export { ChallengeValidationError };
export { ChallengeProcessingError };
export { ChallengeRepositoryError };
export { ChallengeGenerationError };
export default {
    ChallengeError,
    ChallengeNotFoundError,
    ChallengeValidationError,
    ChallengeProcessingError,
    ChallengeRepositoryError,
    ChallengeGenerationError
};
