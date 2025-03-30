import AIClient from "../../ai/ports/AIClient.js";
import { createMonitoredOpenAIClient } from "../../infra/monitoring/openaiMonitor.js";
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
        
        // Create a monitored version of the OpenAI client
        this.openAIClient = createMonitoredOpenAIClient(openAIClient);
        this.logger = logger;
    }
    /**
     * Send a message to OpenAI and get a JSON response
     * @param {Array} messages - The formatted messages to send
     * @param {Object} options - Additional options for the request
     * @returns {Promise<Object>} - The response from OpenAI
     */
    async sendJsonMessage(messages, options = {}) {
        this.logger?.debug('Sending JSON message to OpenAI', {
            messageCount: messages.length,
            hasOptions: !!options
        });
        const response = await this.openAIClient.sendJsonMessage(messages, options);
        return response;
    }
    /**
     * Stream a message to OpenAI with real-time updates
     * @param {Array} messages - The formatted messages to send
     * @param {Object} options - Additional options for the request
     * @returns {Promise<void>}
     */
    async streamMessage(messages, options = {}) {
        this.logger?.debug('Streaming message to OpenAI', {
            messageCount: messages.length,
            hasOptions: !!options
        });
        await this.openAIClient.streamMessage(messages, options);
    }
    
    /**
     * Check the health of the OpenAI client
     * @returns {Promise<Object>} Health status object
     */
    async checkHealth() {
        return this.openAIClient.checkHealth();
    }
}
export default OpenAIClientAdapter;
