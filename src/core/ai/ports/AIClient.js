'use strict';

/**
 * AIClient Port
 *
 * This interface defines the contract for communicating with AI services.
 * It follows the port/adapter pattern to keep infrastructure details out of the domain.
 */

/**
 * @interface AIClient
 */
class AIClient {
  /**
   * Send a message to the AI service and get a JSON response
   * @param {Array} messages - The formatted messages to send
   * @param {Object} _options - Additional options for the request
   * @returns {Promise<Object>} - The response from the AI service
   */
  sendJsonMessage(messages, _options = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Stream a message to the AI service with real-time updates
   * @param {Array} messages - The formatted messages to send
   * @param {Object} _options - Additional options for the request
   * @returns {Promise<void>}
   */
  streamMessage(messages, _options = {}) {
    throw new Error('Method not implemented');
  }
}

module.exports = AIClient; 