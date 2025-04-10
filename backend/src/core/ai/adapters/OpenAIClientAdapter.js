'use strict';

import AIClient from "#app/core/ai/ports/AIClient.js";
import { OpenAIError } from "#app/core/infra/errors/ApiIntegrationError.js";

/**
 * Implementation of AIClient using OpenAI's client
 * @implements {AIClient}
 */
class OpenAIClientAdapter extends AIClient {
    /**
     * Create a new OpenAIClientAdapter
     * @param {Object} dependencies - Dependencies
     * @param {Object} dependencies.openAIClient - OpenAI client instance
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor({ openAIClient, logger }) {
        super();
        if (!openAIClient) {
            throw new Error('OpenAI client is required for OpenAIClientAdapter');
        }
        this.openAIClient = openAIClient;
        this.logger = logger;
    }
    /**
     * Sanitize potentially sensitive data from messages for logging
     * @private
     * @param {Array} messages - The messages to sanitize
     * @returns {Array} - Sanitized messages suitable for logging
     */
    _sanitizeMessagesForLogging(messages) {
        if (!Array.isArray(messages)) return [];
        
        // Create a deep copy to avoid modifying the original
        return JSON.parse(JSON.stringify(messages)).map(msg => {
            // If the message contains sensitive user data, you can redact it here
            // For example, removing personal identifiers, emails, etc.
            
            // Currently we're just passing through the messages as-is, but
            // this function provides a hook for implementing sanitization if needed
            return msg;
        });
    }
    /**
     * Sanitize potentially sensitive data from response for logging
     * @private
     * @param {Object} response - The response to sanitize
     * @returns {Object} - Sanitized response suitable for logging
     */
    _sanitizeResponseForLogging(response) {
        if (!response) return {};
        
        // Create a deep copy to avoid modifying the original
        const sanitizedResponse = JSON.parse(JSON.stringify(response));
        
        // Here you could remove any sensitive data from response
        // Currently passing through as-is
        
        return sanitizedResponse;
    }
    /**
     * Send a message to OpenAI and get a JSON response
     * @param {Array} messages - The formatted messages to send
     * @param {Object} options - Additional options for the request
     * @returns {Promise<Object>} - The response from OpenAI
     * @throws {OpenAIError} If the API request fails
     */
    async sendJsonMessage(messages, options = {}) {
        const correlationId = options.correlationId || `req_${Date.now()}`;
        
        // Log the full sanitized messages array
        this.logger?.debug('Sending JSON message to OpenAI', {
            correlationId,
            messageCount: messages.length,
            hasOptions: !!options,
            options: options.model ? { model: options.model } : undefined,
            messages: this._sanitizeMessagesForLogging(messages)
        });

        try {
            const response = await this.openAIClient.sendJsonMessage(messages, options);
            
            // Log the full sanitized response
            this.logger?.debug('Received JSON response from OpenAI', {
                correlationId,
                responseId: response?.responseId,
                response: this._sanitizeResponseForLogging(response)
            });

            return response;
        } catch (error) {
            // Enhanced error with rich context
            this.logger?.error('OpenAI API request failed', {
                correlationId,
                errorMessage: error.message,
                statusCode: error.status || error.statusCode
            });

            throw new OpenAIError(`OpenAI API request failed: ${error.message}`, {
                cause: error,
                endpoint: '/v1/chat/completions',
                method: 'POST',
                statusCode: error.status || error.statusCode,
                requestId: error.headers?.['x-request-id'],
                model: options.model,
                prompt: messages[0]?.content?.substring(0, 100) + '...', // Truncated for security
                metadata: {
                    messageCount: messages.length,
                    correlationId: correlationId,
                    operation: 'sendJsonMessage'
                }
            });
        }
    }
    /**
     * Stream a message to OpenAI with real-time updates
     * @param {Array} messages - The formatted messages to send
     * @param {Object} options - Additional options for the request
     * @returns {Promise<void>}
     * @throws {OpenAIError} If the API request fails
     */
    async streamMessage(messages, options = {}) {
        const correlationId = options.correlationId || `req_${Date.now()}`;
        
        // Log the full sanitized messages array
        this.logger?.debug('Streaming message to OpenAI', {
            correlationId,
            messageCount: messages.length,
            hasOptions: !!options,
            options: options.model ? { model: options.model } : undefined,
            messages: this._sanitizeMessagesForLogging(messages)
        });

        try {
            await this.openAIClient.streamMessage(messages, options);
            
            this.logger?.debug('Completed streaming message to OpenAI', {
                correlationId
            });
        } catch (error) {
            // Enhanced error with rich context
            this.logger?.error('OpenAI API streaming request failed', {
                correlationId,
                errorMessage: error.message,
                statusCode: error.status || error.statusCode
            });

            throw new OpenAIError(`OpenAI API streaming request failed: ${error.message}`, {
                cause: error,
                endpoint: '/v1/chat/completions',
                method: 'POST',
                statusCode: error.status || error.statusCode,
                requestId: error.headers?.['x-request-id'],
                model: options.model,
                prompt: messages[0]?.content?.substring(0, 100) + '...', // Truncated for security
                metadata: {
                    messageCount: messages.length,
                    correlationId: correlationId,
                    operation: 'streamMessage',
                    streaming: true
                }
            });
        }
    }
}

export { OpenAIClientAdapter };
export default OpenAIClientAdapter;
