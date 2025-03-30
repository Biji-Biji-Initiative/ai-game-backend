import AppError from "./AppError.js";
'use strict';
/**
 * Missing Parameter Error
 *
 * Error class for handling missing parameters in domain functions following DDD principles.
 */
/**
 * Error thrown when required parameters are missing
 */
class MissingParameterError extends AppError {
    /**
     * Create a new missing parameter error
     * @param {string} paramName - Name of the missing parameter
     * @param {string} functionName - Name of the function that requires the parameter
     * @param {object} additionalContext - Any additional context
     */
    /**
     * Method constructor
     */
    constructor(paramName, functionName, additionalContext = {}) {
        const message = `Missing required parameter: ${paramName} for ${functionName}`;
        const metadata = {
            paramName,
            functionName,
            ...additionalContext,
        };
        super(message, 400, metadata);
        this.name = 'MissingParameterError';
        this.errorCode = 'MISSING_PARAMETER';
    }
}
export { MissingParameterError };
export default {
    MissingParameterError
};
