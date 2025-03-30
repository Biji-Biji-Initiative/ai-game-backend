import AppError from "../../infra/errors/AppError.js";
import { StandardErrorCodes } from "../../infra/errors/ErrorHandler.js";
'use strict';
/**
 * Base class for Personality domain errors
 */
class PersonalityError extends AppError {
    /**
     * Create a new PersonalityError
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {Object} options - Additional options
     */
    constructor(message = 'Personality operation failed', statusCode = 400, options = {}) {
        super(message, statusCode, {
            ...options,
            errorCode: options.errorCode || 'PERSONALITY_ERROR'
        });
        this.name = 'PersonalityError';
    }
}
/**
 * Personality Not Found Error
 * Thrown when attempting to access a personality that doesn't exist
 */
class PersonalityNotFoundError extends PersonalityError {
    /**
     * Create a new PersonalityNotFoundError
     * @param {string} identifier - Personality identifier that wasn't found
     */
    constructor(identifier = '') {
        const message = identifier ? `Personality not found: ${identifier}` : 'Personality not found';
        super(message, 404, {
            errorCode: StandardErrorCodes.NOT_FOUND,
            metadata: { identifier }
        });
        this.name = 'PersonalityNotFoundError';
    }
}
/**
 * Personality Validation Error
 * Thrown when personality data fails validation
 */
class PersonalityValidationError extends PersonalityError {
    /**
     * Create a new PersonalityValidationError
     * @param {string} message - Error message describing the validation failure
     * @param {Object} validationErrors - Specific validation errors
     */
    constructor(message = 'Invalid personality data', validationErrors = null) {
        super(message, 400, {
            errorCode: StandardErrorCodes.VALIDATION_ERROR,
            metadata: { validationErrors }
        });
        this.name = 'PersonalityValidationError';
    }
}
/**
 * Personality Processing Error
 * Thrown when there's an issue processing a personality
 */
class PersonalityProcessingError extends PersonalityError {
    /**
     * Create a new PersonalityProcessingError
     * @param {string} message - Error message describing the processing issue
     * @param {Object} options - Additional options
     */
    constructor(message = 'Failed to process personality', options = {}) {
        super(message, 500, {
            ...options,
            errorCode: StandardErrorCodes.DOMAIN_ERROR
        });
        this.name = 'PersonalityProcessingError';
    }
}
/**
 * Personality Repository Error
 * Thrown when there's an issue with the personality repository operations
 */
class PersonalityRepositoryError extends PersonalityError {
    /**
     * Create a new PersonalityRepositoryError
     * @param {string} message - Error message describing the repository issue
     * @param {Object} options - Additional options
     */
    constructor(message = 'Failed to perform personality repository operation', options = {}) {
        super(message, 500, {
            ...options,
            errorCode: StandardErrorCodes.DATABASE_ERROR,
            cause: options.cause
        });
        this.name = 'PersonalityRepositoryError';
    }
}
// Additional domain-specific errors
const ProfileNotFoundError = class extends PersonalityError {
    constructor(userId) {
        super(`Profile not found for user: ${userId}`, 404);
        this.name = 'ProfileNotFoundError';
    }
};
const TraitsValidationError = class extends PersonalityValidationError {
    constructor(message, options = {}) {
        super(message);
        this.name = 'TraitsValidationError';
        this.details = options.details || {};
        this.originalError = options.originalError || null;
    }
};
const AttitudesValidationError = class extends PersonalityValidationError {
    constructor(message, options = {}) {
        super(message);
        this.name = 'AttitudesValidationError';
        this.details = options.details || {};
        this.originalError = options.originalError || null;
    }
};
const InsightGenerationError = class extends PersonalityProcessingError {
    constructor(message, options = {}) {
        super(message);
        this.name = 'InsightGenerationError';
        this.originalError = options.originalError || null;
    }
};
const NoPersonalityDataError = class extends PersonalityNotFoundError {
    constructor(userId) {
        super();
        this.message = `No personality data found for user: ${userId}`;
        this.name = 'NoPersonalityDataError';
    }
};
// Named exports for individual classes
export { PersonalityError, PersonalityNotFoundError, PersonalityValidationError, PersonalityProcessingError, PersonalityRepositoryError, ProfileNotFoundError, TraitsValidationError, AttitudesValidationError, InsightGenerationError, NoPersonalityDataError };
// Default export for backwards compatibility
export default {
    PersonalityError,
    PersonalityNotFoundError,
    PersonalityValidationError,
    PersonalityProcessingError,
    PersonalityRepositoryError,
    ProfileNotFoundError,
    TraitsValidationError,
    AttitudesValidationError,
    InsightGenerationError,
    NoPersonalityDataError
};
