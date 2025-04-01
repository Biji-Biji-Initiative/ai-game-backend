import AppError from "#app/core/infra/errors/AppError.js";
import { StandardErrorCodes } from "#app/core/infra/errors/ErrorHandler.js";
'use strict';
/**
 * Base class for Evaluation domain errors
 */
class EvaluationError extends AppError {
    /**
     * Create a new EvaluationError
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {Object} options - Additional options
     */
    constructor(message = 'Evaluation operation failed', statusCode = 400, options = {}) {
        super(message, statusCode, {
            ...options,
            errorCode: options.errorCode || 'EVALUATION_ERROR'
        });
        this.name = 'EvaluationError';
    }
}
/**
 * Evaluation Not Found Error
 * Thrown when attempting to access an evaluation that doesn't exist
 */
class EvaluationNotFoundError extends EvaluationError {
    /**
     * Create a new EvaluationNotFoundError
     * @param {string} identifier - Evaluation identifier that wasn't found
     */
    constructor(identifier = '') {
        const message = identifier ? `Evaluation not found: ${identifier}` : 'Evaluation not found';
        super(message, 404, {
            errorCode: StandardErrorCodes.NOT_FOUND,
            metadata: { identifier }
        });
        this.name = 'EvaluationNotFoundError';
    }
}
/**
 * Evaluation Validation Error
 * Thrown when evaluation data fails validation
 */
class EvaluationValidationError extends EvaluationError {
    /**
     * Create a new EvaluationValidationError
     * @param {string} message - Error message describing the validation failure
     * @param {Object} validationErrors - Specific validation errors
     */
    constructor(message = 'Invalid evaluation data', validationErrors = null) {
        super(message, 400, {
            errorCode: StandardErrorCodes.VALIDATION_ERROR,
            metadata: { validationErrors }
        });
        this.name = 'EvaluationValidationError';
    }
}
/**
 * Evaluation Processing Error
 * Thrown when there's an issue processing an evaluation
 */
class EvaluationProcessingError extends EvaluationError {
    /**
     * Create a new EvaluationProcessingError
     * @param {string} message - Error message describing the processing issue
     * @param {Object} options - Additional options
     */
    constructor(message = 'Failed to process evaluation', options = {}) {
        super(message, 500, {
            ...options,
            errorCode: StandardErrorCodes.DOMAIN_ERROR
        });
        this.name = 'EvaluationProcessingError';
    }
}
/**
 * Evaluation Repository Error
 * Thrown when there's an issue with the evaluation repository operations
 */
class EvaluationRepositoryError extends EvaluationError {
    /**
     * Create a new EvaluationRepositoryError
     * @param {string} message - Error message describing the repository issue
     * @param {Object} options - Additional options
     */
    constructor(message = 'Failed to perform evaluation repository operation', options = {}) {
        super(message, 500, {
            ...options,
            errorCode: StandardErrorCodes.DATABASE_ERROR
        });
        this.name = 'EvaluationRepositoryError';
    }
}
export { EvaluationError };
export { EvaluationNotFoundError };
export { EvaluationValidationError };
export { EvaluationProcessingError };
export { EvaluationRepositoryError };
export default {
    EvaluationError,
    EvaluationNotFoundError,
    EvaluationValidationError,
    EvaluationProcessingError,
    EvaluationRepositoryError
};
