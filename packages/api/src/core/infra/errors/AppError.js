'use strict';
/**
 * Application Error Class
 *
 * DDD-compliant error handling for the application
 * Placed in infrastructure layer as a cross-cutting concern
 */
/**
 * Custom error class for application errors
 */
export default class AppError extends Error {
    /**
     * Create a new application error
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {object} options - Additional error options
     * @param {object} options.metadata - Additional error metadata
     * @param {Error} options.cause - Original error that caused this error
     * @param {string} options.errorCode - Specific error code for API clients
     */
    /**
     * Method constructor
     */
    constructor(message, statusCode, options = {}) {
        // Extract options with defaults
        const { metadata = {}, cause = null, errorCode = null } = options;
        // Initialize Error with message and cause
        super(message, { cause });
        // Set AppError specific properties
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.metadata = metadata;
        this.errorCode = errorCode;
        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}
