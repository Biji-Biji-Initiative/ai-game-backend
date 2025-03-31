'use strict';
"../../../infra/errors/AppError.js14;
/**
 * Focus Area Domain Errors
 *
 * Defines specific error types for the focus area domain.
 * These errors provide more precise information about failures
 * than generic errors.
 *
 * @module focusAreaErrors
 * @requires AppError
 */
// const AppError = require(../../core/infra/errors/AppError');
/**
 * Base error for all focus area domain errors
 */
class FocusAreaError extends AppError {
    /**
     * Method constructor
     */
    constructor(message, statusCode = 400) {
        super(message, statusCode);
        this.name = 'FocusAreaError';
    }
}
/**
 * Error thrown when a focus area is not found
 */
class FocusAreaNotFoundError extends FocusAreaError {
    /**
     * Method constructor
     */
    constructor(id) {
        super(`Focus area with ID ${id} not found`, 404);
        this.name = 'FocusAreaNotFoundError';
    }
}
/**
 * Error thrown when validation fails for a focus area
 */
class FocusAreaValidationError extends FocusAreaError {
    /**
     * Method constructor
     */
    constructor(message) {
        super(`Validation error: ${message}`, 400);
        this.name = 'FocusAreaValidationError';
    }
}
/**
 * Error thrown when there's a problem with focus area generation
 */
class FocusAreaGenerationError extends FocusAreaError {
    /**
     * Method constructor
     */
    constructor(message) {
        super(`Failed to generate focus areas: ${message}`, 500);
        this.name = 'FocusAreaGenerationError';
    }
}
/**
 * Error thrown when there's a problem with focus area persistence
 */
class FocusAreaPersistenceError extends FocusAreaError {
    /**
     * Method constructor
     */
    constructor(message) {
        super(`Focus area persistence error: ${message}`, 500);
        this.name = 'FocusAreaPersistenceError';
    }
}
/**
 * Error thrown when a user doesn't have access to a focus area
 */
class FocusAreaAccessDeniedError extends FocusAreaError {
    /**
     * Method constructor
     */
    constructor() {
        super('Access denied to this focus area', 403);
        this.name = 'FocusAreaAccessDeniedError';
    }
}
export { FocusAreaError };
export { FocusAreaNotFoundError };
export { FocusAreaValidationError };
export { FocusAreaGenerationError };
export { FocusAreaPersistenceError };
export { FocusAreaAccessDeniedError };
export default {
    FocusAreaError,
    FocusAreaNotFoundError,
    FocusAreaValidationError,
    FocusAreaGenerationError,
    FocusAreaPersistenceError,
    FocusAreaAccessDeniedError
};
"