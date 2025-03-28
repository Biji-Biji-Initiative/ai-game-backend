/**
 * Responses API Client - Infrastructure Layer
 * 
 * A wrapper for the OpenAI client that follows DDD principles.
 * This file provides an interface for services in domain layers
 * to interact with the OpenAI API.
 */

const { OpenAIClient } = require('../../../infra/openai');
const { logger } = require('../logging/logger');

// Re-export constants from the openai config
const { MessageRole, ResponseFormat, ResponsesApiModel } = require('../../../infra/openai/config');

/**
 * Send a message to the OpenAI Responses API
 * @param {Array} messages - Array of message objects
 * @param {Object} options - API options
 * @returns {Promise<Object>} API response
 */
async function sendMessage(messages, options = {}) {
  logger.debug('Sending message to OpenAI via infrastructure layer', {
    messageCount: messages.length
  });
  
  try {
    const client = new OpenAIClient({
      logger,
      apiKey: process.env.OPENAI_API_KEY
    });
    return await client.sendMessage(messages, options);
  } catch (error) {
    logger.error('Error in responsesApiClient.sendMessage', { error: error.message });
    throw error;
  }
}

/**
 * Send a message expecting a JSON response
 * @param {Array} messages - Array of message objects
 * @param {Object} options - API options
 * @returns {Promise<Object>} Parsed JSON response
 */
async function sendJsonMessage(messages, options = {}) {
  logger.debug('Sending JSON message to OpenAI via infrastructure layer', {
    messageCount: messages.length
  });
  
  try {
    const client = new OpenAIClient({
      logger,
      apiKey: process.env.OPENAI_API_KEY
    });
    return await client.sendJsonMessage(messages, options);
  } catch (error) {
    logger.error('Error in responsesApiClient.sendJsonMessage', { error: error.message });
    throw error;
  }
}

/**
 * Stream a message from the OpenAI Responses API
 * @param {Array} messages - Array of message objects
 * @param {Object} options - API options
 * @returns {Promise<AsyncIterable>} Stream of response chunks
 */
async function streamMessage(messages, options = {}) {
  logger.debug('Streaming message from OpenAI via infrastructure layer', {
    messageCount: messages.length
  });
  
  try {
    const client = new OpenAIClient({
      logger,
      apiKey: process.env.OPENAI_API_KEY
    });
    return await client.streamMessage(messages, options);
  } catch (error) {
    logger.error('Error in responsesApiClient.streamMessage', { error: error.message });
    throw error;
  }
}

module.exports = {
  sendMessage,
  sendJsonMessage,
  streamMessage,
  MessageRole,
  ResponsesApiModel,
  ResponseFormat
}; 