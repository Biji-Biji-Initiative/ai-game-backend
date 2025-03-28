/**
 * Message Formatter for OpenAI Responses API
 * 
 * Provides utilities for formatting messages for the Responses API.
 * Converts different input formats to the proper Responses API structure.
 * 
 * IMPORTANT: This implementation EXCLUSIVELY uses OpenAI Responses API, NEVER
 * Chat Completions API or Assistants API.
 * 
 * @module messageFormatter
 */

const { OpenAIRequestError } = require('./errors');

/**
 * Formats a prompt and system message into the Responses API format
 * @param {string} prompt - The user prompt/input
 * @param {string|null} systemMessage - Optional system message as instructions
 * @returns {Object} Object with input and instructions fields for Responses API
 * @throws {OpenAIRequestError} If prompt is empty or null
 */
const formatForResponsesApi = (prompt, systemMessage = null) => {
  if (!prompt || typeof prompt !== 'string') {
    throw new OpenAIRequestError('Prompt must be a non-empty string');
  }

  if (systemMessage && typeof systemMessage !== 'string') {
    throw new OpenAIRequestError('System message must be a string if provided');
  }

  return {
    input: prompt,
    instructions: systemMessage || null
  };
};

/**
 * Formats multimodal content for the Responses API
 * @param {Array<Object>} contentItems - Array of content items (text, image URLs, etc.)
 * @returns {Object} Formatted input object for Responses API
 * @throws {OpenAIRequestError} If contentItems is not an array or contains invalid items
 */
const formatMultimodalContent = (contentItems) => {
  if (!Array.isArray(contentItems)) {
    throw new OpenAIRequestError('Content items must be an array');
  }

  if (contentItems.length === 0) {
    throw new OpenAIRequestError('Content items array cannot be empty');
  }

  const formattedContent = contentItems.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new OpenAIRequestError(`Content item at index ${index} must be an object`);
    }

    if (!item.type) {
      throw new OpenAIRequestError(`Content item at index ${index} must have a type property`);
    }

    switch (item.type) {
      case 'text':
        if (!item.text || typeof item.text !== 'string') {
          throw new OpenAIRequestError(`Text content item at index ${index} must have a text property`);
        }
        return { type: 'text', text: item.text };
      case 'image_url':
        if (!item.url || typeof item.url !== 'string') {
          throw new OpenAIRequestError(`Image content item at index ${index} must have a url property`);
        }
        return { type: 'image_url', url: item.url };
      case 'file':
        if (!item.file_id || typeof item.file_id !== 'string') {
          throw new OpenAIRequestError(`File content item at index ${index} must have a file_id property`);
        }
        return { type: 'file', file_id: item.file_id };
      default:
        throw new OpenAIRequestError(`Unsupported content type: ${item.type} at index ${index}`);
    }
  });

  return {
    input: formattedContent,
    instructions: null
  };
};

/**
 * Creates tool call response in Responses API format
 * @param {Object} toolResult - Tool result with id and output
 * @returns {Object} Formatted tool result for Responses API
 * @throws {OpenAIRequestError} If toolResult is invalid
 */
const formatToolResult = (toolResult) => {
  if (!toolResult || typeof toolResult !== 'object') {
    throw new OpenAIRequestError('Tool result must be an object');
  }

  if (!toolResult.id || typeof toolResult.id !== 'string') {
    throw new OpenAIRequestError('Tool result must have a string id property');
  }

  if (!toolResult.output && typeof toolResult.output !== 'string') {
    throw new OpenAIRequestError('Tool result must have a string output property');
  }

  return {
    input: toolResult.output,
    instructions: `Tool call result for tool ID: ${toolResult.id}`
  };
};

/**
 * Formats structured content for the Responses API
 * @param {Object} content - Structured content object
 * @param {string} contentType - Type of content (e.g., 'json', 'markdown')
 * @returns {Object} Formatted input object for Responses API
 * @throws {OpenAIRequestError} If content is invalid
 */
const formatStructuredContent = (content, contentType) => {
  if (!content || typeof content !== 'object') {
    throw new OpenAIRequestError('Content must be an object');
  }

  if (!contentType || typeof contentType !== 'string') {
    throw new OpenAIRequestError('Content type must be a string');
  }

  const supportedTypes = ['json', 'markdown', 'html'];
  if (!supportedTypes.includes(contentType)) {
    throw new OpenAIRequestError(`Unsupported content type: ${contentType}. Supported types: ${supportedTypes.join(', ')}`);
  }

  return {
    input: {
      type: contentType,
      content: content
    },
    instructions: null
  };
};

module.exports = {
  formatForResponsesApi,
  formatMultimodalContent,
  formatToolResult,
  formatStructuredContent
}