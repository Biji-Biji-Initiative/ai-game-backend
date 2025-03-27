/**
 * OpenAI Responses API Client
 * 
 * Provides functionality for interacting with OpenAI's Responses API
 * IMPORTANT: This implementation EXCLUSIVELY uses OpenAI Responses API, NEVER
 * Chat Completions API or Assistants API.
 * 
 * The Responses API is a unified API from OpenAI that combines features of
 * Chat Completions and Assistants APIs, providing stateful conversations,
 * structured outputs, and tool usage capabilities.
 * 
 * @module responsesApiClient
 * @requires openai
 * @requires logger
 */

const { OpenAI } = require('openai');
const { logger } = require('../../core/infra/logging/logger');
const { ResponsesApiModel, MessageRole, ResponseFormat } = require('./types');
const { ApiIntegrationError } = require('../../core/infra/errors/ApiIntegrationError');

// Initialize OpenAI client with API key from environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Sends a message to the OpenAI Responses API and returns the response
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Configuration options
 * @param {string} [options.model=gpt-4o] - Model to use
 * @param {number} [options.temperature=0.5] - Temperature setting (0-1)
 * @param {string} [options.threadId] - Thread ID for stateful conversations
 * @param {string} [options.previousResponseId] - ID of previous response for context
 * @param {Object} [options.responseFormat] - Response format options
 * @param {Array} [options.tools] - Array of tools to use
 * @returns {Promise<Object>} - Response from the API
 */
const sendMessage = async (messages, options = {}) => {
  try {
    logger.debug('Sending message to OpenAI Responses API', { 
      messageCount: messages.length,
      hasThreadId: !!options.threadId,
      hasPreviousResponseId: !!options.previousResponseId
    });

    // Extract system message and user/assistant messages
    let systemMessage = null;
    const conversationMessages = [];
    
    messages.forEach(msg => {
      if (msg.role === 'system') {
        systemMessage = msg.content;
      } else {
        conversationMessages.push(msg);
      }
    });
    
    // Configure request
    const requestOptions = {
      model: options.model || ResponsesApiModel.GPT4O,
      temperature: options.temperature ?? 0.5
    };
    
    // Add instructions (system message) if present
    if (systemMessage) {
      requestOptions.instructions = typeof systemMessage === 'string' 
        ? systemMessage 
        : systemMessage.text;
    }
    
    // Prepare input messages
    if (conversationMessages.length > 0) {
      // Format messages for Responses API
      const formattedInput = conversationMessages.map(msg => {
        return {
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : msg.content
        };
      });
      
      // For simple cases with one user message
      if (formattedInput.length === 1 && formattedInput[0].role === 'user') {
        requestOptions.input = formattedInput[0].content;
      } else {
        // For conversation history
        requestOptions.input = {
          messages: formattedInput
        };
      }
    }
    
    // Add previous response ID for stateful conversations
    if (options.previousResponseId) {
      requestOptions.previous_response_id = options.previousResponseId;
    }
    
    // Add response format if specified
    if (options.responseFormat) {
      requestOptions.response_format = options.responseFormat;
    }
    
    // Add tools if specified
    if (options.tools) {
      requestOptions.tools = options.tools;
    }
    
    // Call the Responses API
    const response = await openai.responses.create(requestOptions);

    logger.debug('Received response from OpenAI Responses API', {
      responseId: response.id,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens
    });

    // Transform response for easier consumption
    return {
      responseId: response.id,
      content: response.output_text || '',
      toolCalls: response.tool_calls,
      finishReason: response.finish_reason,
      usage: response.usage,
      model: response.model
    };
  } catch (error) {
    logger.error('Error sending message to OpenAI Responses API', {
      error: error.message,
      status: error.status,
      type: error.type
    });

    throw new ApiIntegrationError(
      `Error communicating with OpenAI Responses API: ${error.message}`,
      error.status || 500,
      error
    );
  }
};

/**
 * Sends a message to the OpenAI Responses API expecting a JSON response
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Configuration options (same as sendMessage)
 * @returns {Promise<Object>} - Parsed JSON response
 */
const sendJsonMessage = async (messages, options = {}) => {
  try {
    // Create new options for JSON output without using responseFormat
    const jsonOptions = {
      ...options,
      format: 'json'  // Set the format option directly for the Responses API
    };
    
    // Send the message
    const response = await sendMessage(messages, jsonOptions);
    
    // Parse JSON response
    let data;
    try {
      data = JSON.parse(response.content);
    } catch (parseError) {
      logger.error('Failed to parse JSON response from OpenAI', {
        error: parseError.message,
        content: response.content?.substring(0, 100) + '...'
      });
      throw new ApiIntegrationError('Invalid JSON response from OpenAI', 422, parseError);
    }
    
    // Return both the response metadata and parsed data
    return {
      ...response,
      data
    };
  } catch (error) {
    logger.error('Error sending JSON message to OpenAI', {
      error: error.message,
      status: error.status || 500
    });
    throw error;
  }
};

/**
 * Streams a message to the OpenAI Responses API and returns an async iterator
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Configuration options (same as sendMessage)
 * @returns {Promise<AsyncIterable>} - Stream of response chunks
 */
const streamMessage = async (messages, options = {}) => {
  try {
    logger.debug('Streaming message to OpenAI Responses API', { 
      messageCount: messages.length,
      hasThreadId: !!options.threadId,
      hasPreviousResponseId: !!options.previousResponseId
    });

    // Extract system message and user/assistant messages
    let systemMessage = null;
    const conversationMessages = [];
    
    messages.forEach(msg => {
      if (msg.role === 'system') {
        systemMessage = msg.content;
      } else {
        conversationMessages.push(msg);
      }
    });

    // Configure request with streaming enabled
    const requestOptions = {
      model: options.model || ResponsesApiModel.GPT4O,
      temperature: options.temperature ?? 0.5,
      stream: true
    };
    
    // Add instructions (system message) if present
    if (systemMessage) {
      requestOptions.instructions = typeof systemMessage === 'string' 
        ? systemMessage 
        : systemMessage.text;
    }
    
    // Prepare input messages
    if (conversationMessages.length > 0) {
      // Format messages for Responses API
      const formattedInput = conversationMessages.map(msg => {
        return {
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : msg.content
        };
      });
      
      // For simple cases with one user message
      if (formattedInput.length === 1 && formattedInput[0].role === 'user') {
        requestOptions.input = formattedInput[0].content;
      } else {
        // For conversation history
        requestOptions.input = {
          messages: formattedInput
        };
      }
    }
    
    // Add previous response ID for stateful conversations
    if (options.previousResponseId) {
      requestOptions.previous_response_id = options.previousResponseId;
    }
    
    // Add response format if specified
    if (options.responseFormat) {
      requestOptions.response_format = options.responseFormat;
    }
    
    // Add tools if specified
    if (options.tools) {
      requestOptions.tools = options.tools;
    }
    
    // Call the Responses API with streaming
    const stream = await openai.responses.stream(requestOptions);
    
    logger.debug('Stream established with OpenAI Responses API');
    
    return stream;
  } catch (error) {
    logger.error('Error streaming message to OpenAI Responses API', {
      error: error.message,
      status: error.status,
      type: error.type
    });

    throw new ApiIntegrationError(
      `Error streaming from OpenAI Responses API: ${error.message}`,
      error.status || 500,
      error
    );
  }
};

module.exports = {
  sendMessage,
  sendJsonMessage,
  streamMessage
}; 