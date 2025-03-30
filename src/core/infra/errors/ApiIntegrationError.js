'use strict';
/**
 * API Integration Error
 *
 * Error class for handling API integration issues following DDD principles.
 * This error is used when there are issues communicating with external APIs
 * like OpenAI.
 */
/**
 * Error for API integration issues
 * @extends Error
 */
class ApiIntegrationError extends Error {
    /**
     * Creates an API integration error
     * @param {string} message - Error message
     * @param {number} [status=500] - HTTP status code
     * @param {Error} [cause=null] - Underlying error that caused this one
     */
    /**
     * Method constructor
     */
    constructor(message, status = 500, cause = null) {
        super(message);
        this.name = 'ApiIntegrationError';
        this.status = status;
        this.cause = cause;
    }
}
export { ApiIntegrationError };
export default {
    ApiIntegrationError
};
