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

/**
 * Formats a prompt and system message into the Responses API format
 * @param {string} prompt - The user prompt/input
 * @param {string|null} systemMessage - Optional system message as instructions
 * @returns {Object} Object with input and instructions fields for Responses API
 */
const formatForResponsesApi = (prompt, systemMessage = null) => {
  const result = {
    input: prompt
  };
  
  if (systemMessage) {
    result.instructions = systemMessage;
  }
  
  return result;
};

/**
 * Converts Chat Completions message array to Responses API format
 * @param {Array<Object>} messages - Array of {role, content} objects (Chat Completions format)
 * @returns {Object} Object with input and instructions fields for Responses API
 * @throws {Error} If messages array is invalid
 */
const messagesArrayToResponsesApi = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages must be a non-empty array');
  }
  
  // Extract system message (if any)
  const systemMessage = messages.find(msg => msg.role === 'system');
  
  // Find the last user message for input
  const userMessages = messages.filter(msg => msg.role === 'user');
  
  if (userMessages.length === 0) {
    throw new Error('At least one user message is required');
  }
  
  // Use the last user message as input
  const input = userMessages[userMessages.length - 1].content;
  
  // Create Responses API format
  const result = {
    input
  };
  
  if (systemMessage) {
    result.instructions = systemMessage.content;
  }
  
  return result;
};

/**
 * Formats multimodal content for the Responses API
 * @param {Array<Object>} contentItems - Array of content items (text, image URLs, etc.)
 * @returns {Object} Formatted input object for Responses API
 */
const formatMultimodalContent = (contentItems) => {
  if (!Array.isArray(contentItems)) {
    throw new Error('Content items must be an array');
  }
  
  // Transform content items to Responses API format
  return {
    input: {
      content: contentItems.map(item => {
        if (typeof item === 'string') {
          return { type: 'text', text: item };
        } else if (item.type === 'image_url') {
          return {
            type: 'image',
            image_url: item.image_url
          };
        } else {
          return item; // Pass through other formats
        }
      })
    }
  };
};

/**
 * Creates tool call response in Responses API format
 * @param {Object} toolResult - Tool result with id and output
 * @returns {Object} Formatted tool result for Responses API
 */
const formatToolResult = (toolResult) => {
  if (!toolResult.tool_call_id || !toolResult.output) {
    throw new Error('Tool result must have tool_call_id and output');
  }
  
  return {
    tool_outputs: [
      {
        tool_call_id: toolResult.tool_call_id,
        output: toolResult.output
      }
    ]
  };
};

module.exports = {
  formatForResponsesApi,
  messagesArrayToResponsesApi,
  formatMultimodalContent,
  formatToolResult
}; 