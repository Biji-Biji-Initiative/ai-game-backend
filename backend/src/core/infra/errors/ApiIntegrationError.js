'use strict';
/**
 * API Integration Error
 *
 * Error class for handling API integration issues following DDD principles.
 * This error is used when there are issues communicating with external APIs
 * like OpenAI.
 */
import { InfraError } from "#app/core/infra/errors/InfraErrors.js";

/**
 * API integration error class
 * @extends InfraError
 */
class ApiIntegrationError extends InfraError {
    /**
     * Create a new API integration error
     * @param {string} message - Error message
     * @param {Object} options - Error options
     * @param {Error} options.cause - Original API error
     * @param {string} options.serviceName - External service name
     * @param {string} options.endpoint - API endpoint
     * @param {string} options.method - HTTP method
     * @param {number} options.statusCode - HTTP status code
     * @param {string} options.requestId - Request ID
     * @param {Object} options.responseData - Sanitized response data
     * @param {Object} options.metadata - Additional metadata
     */
    constructor(message, options = {}) {
        super(message, {
            ...options,
            component: 'api',
            statusCode: options.statusCode || 500
        });
        
        // API-specific context
        this.serviceName = options.serviceName;
        this.endpoint = options.endpoint;
        this.method = options.method;
        this.statusCode = options.statusCode;
        this.requestId = options.requestId;
        this.responseData = options.responseData;
        
        // Add to metadata for serialization
        this.metadata = {
            ...this.metadata,
            serviceName: this.serviceName,
            endpoint: this.endpoint,
            method: this.method,
            statusCode: this.statusCode,
            requestId: this.requestId,
            responseData: this.responseData
        };
    }
}

/**
 * OpenAI API error
 * @extends ApiIntegrationError
 */
class OpenAIError extends ApiIntegrationError {
    /**
     * Create a new OpenAI API error
     * @param {string} message - Error message
     * @param {Object} options - Error options
     * @param {string} options.model - AI model name
     * @param {string} options.prompt - Truncated prompt (for security)
     * @param {Object} options.metadata - Additional metadata
     */
    constructor(message, options = {}) {
        super(message, {
            ...options,
            serviceName: 'openai'
        });
        
        // OpenAI-specific context
        this.model = options.model;
        this.prompt = options.prompt; // Should be truncated/sanitized
        
        // Add to metadata for serialization
        this.metadata = {
            ...this.metadata,
            model: this.model,
            promptLength: this.prompt ? this.prompt.length : 0
        };
    }
}

// Export error classes
export {
    ApiIntegrationError,
    OpenAIError
};
