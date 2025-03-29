'use strict';

/**
 * OpenAI Client Adapter
 *
 * This adapter implements the AIClient port using OpenAI's client.
 * It follows the port/adapter pattern to isolate infrastructure details from the domain.
 */

const AIClient = require('../ports/AIClient');

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
}

module.exports = OpenAIClientAdapter; 