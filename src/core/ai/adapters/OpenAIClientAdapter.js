import AIClient from "../../ai/ports/AIClient.js";
'use strict';
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

        const response = await this.openAIClient.sendJsonMessage(messages, options);
        
        // Log the full sanitized response
        this.logger?.debug('Received JSON response from OpenAI', {
            correlationId,
            responseId: response?.responseId,
            response: this._sanitizeResponseForLogging(response)
        });

        return response;
    }
    /**
     * Stream a message to OpenAI with real-time updates
     * @param {Array} messages - The formatted messages to send
     * @param {Object} options - Additional options for the request
     * @returns {Promise<void>}
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

        await this.openAIClient.streamMessage(messages, options);
        
        this.logger?.debug('Completed streaming message to OpenAI', {
            correlationId
        });
    }
}
export default OpenAIClientAdapter;
