'use strict';

import AppError from './AppError.js';

/**
 * Configuration Error Class
 * 
 * Used for errors related to application configuration or service dependencies
 */
class ConfigurationError extends AppError {
    /**
     * Creates a new ConfigurationError
     * @param {string} message - Error message
     * @param {object} [options={}] - Additional options (metadata, cause, errorCode)
     */
    constructor(message, options = {}) {
        super(message, 500, {
            errorCode: 'CONFIG_ERROR',
            ...options,
            metadata: {
                errorType: 'CONFIGURATION_ERROR',
                ...(options.metadata || {})
            }
        });
    }
}

/**
 * Validates required dependencies for a service
 * 
 * @param {object} dependencies - Object containing the dependencies
 * @param {string[]} requiredDeps - Array of required dependency names
 * @param {string} serviceName - Name of the service for context in error messages
 * @throws {ConfigurationError} If any required dependency is missing or falsy
 */
export function validateDependencies(dependencies, requiredDeps, serviceName) {
    const missing = [];
    
    for (const dep of requiredDeps) {
        if (!dependencies[dep]) {
            missing.push(dep);
        }
    }
    
    if (missing.length > 0) {
        throw new ConfigurationError(
            `${serviceName}: Missing required dependencies: ${missing.join(', ')}`,
            {
                metadata: {
                    service: serviceName,
                    missingDependencies: missing
                }
            }
        );
    }
}

export default ConfigurationError;
export { ConfigurationError };
