import AppError from "#app/core/infra/errors/AppError.js";
'use strict';
/**
 * Base class for Progress domain errors
 */
class ProgressError extends AppError {
    /**
     * Create a new ProgressError
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     */
    constructor(message = 'Progress operation failed', statusCode = 400) {
        super(message, statusCode);
        this.name = 'ProgressError';
    }
}
/**
 * Progress Not Found Error
 * Thrown when attempting to access a progress that doesn't exist
 */
class ProgressNotFoundError extends ProgressError {
    /**
     * Create a new ProgressNotFoundError
     * @param {string} identifier - Progress identifier that wasn't found
     */
    constructor(identifier = '') {
        const message = identifier ? `Progress not found: ${identifier}` : 'Progress not found';
        super(message, 404);
        this.name = 'ProgressNotFoundError';
    }
}
/**
 * Progress Validation Error
 * Thrown when progress data fails validation
 */
class ProgressValidationError extends ProgressError {
    /**
     * Create a new ProgressValidationError
     * @param {string} message - Error message describing the validation failure
     */
    constructor(message = 'Invalid progress data') {
        super(message, 400);
        this.name = 'ProgressValidationError';
    }
}
/**
 * Progress Processing Error
 * Thrown when there's an issue processing a progress
 */
class ProgressProcessingError extends ProgressError {
    /**
     * Create a new ProgressProcessingError
     * @param {string} message - Error message describing the processing failure
     */
    constructor(message = 'Failed to process progress') {
        super(message, 500);
        this.name = 'ProgressProcessingError';
    }
}
/**
 * Progress Repository Error
 * Thrown when there's an issue with the progress repository operations
 */
class ProgressRepositoryError extends ProgressError {
    /**
     * Create a new ProgressRepositoryError
     * @param {string} message - Error message describing the repository operation failure
     * @param {Object} options - Additional error options
     * @param {Error} [options.cause] - The underlying error that caused this error
     * @param {Object} [options.metadata] - Additional metadata about the error
     */
    constructor(message = 'Failed to perform progress repository operation', options = {}) {
        super(message, 500);
        this.name = 'ProgressRepositoryError';
        this.cause = options.cause || null;
        this.metadata = options.metadata || {};
    }
}
export { ProgressError };
export { ProgressNotFoundError };
export { ProgressValidationError };
export { ProgressProcessingError };
export { ProgressRepositoryError };
export default {
    ProgressError,
    ProgressNotFoundError,
    ProgressValidationError,
    ProgressProcessingError,
    ProgressRepositoryError
};
