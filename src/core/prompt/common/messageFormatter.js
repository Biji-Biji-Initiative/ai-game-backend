/**
 * Message Formatter for OpenAI Responses API
 * 
 * Provides utilities for formatting messages for the Responses API.
 * Converts traditional prompts to properly structured message arrays.
 * 
 * IMPORTANT: This implementation EXCLUSIVELY uses OpenAI Responses API, NEVER
 * Chat Completions API or Assistants API.
 * 
 * @module messageFormatter
 */

const { MessageRole } = require('../../api/responsesApiTypes');

/**
 * Formats a string prompt into a properly structured message for the Responses API
 * @param {string} content - Message content
 * @param {string} [role='user'] - Message role (user, system, assistant)
 * @returns {Object} Properly formatted message object
 * @throws {Error} If role is invalid
 */
const formatMessage = (content, role = 'user') => {
  if (!MessageRole[role.toUpperCase()]) {
    throw new Error(`Invalid message role: ${role}`);
  }
  
  return {
    role: role.toLowerCase(),
    content: [
      {
        type: 'text',
        text: content
      }
    ]
  };
};

/**
 * Converts a traditional string prompt to an array of messages for the Responses API
 * @param {string} prompt - The prompt text
 * @param {string} systemPrompt - Optional system prompt to include
 * @returns {Array<Object>} Array of message objects
 */
const promptToMessages = (prompt, systemPrompt = null) => {
  const messages = [];
  
  // Add system message if provided
  if (systemPrompt) {
    messages.push(formatMessage(systemPrompt, 'system'));
  }
  
  // Add user message
  messages.push(formatMessage(prompt, 'user'));
  
  return messages;
};

/**
 * Formats an entire conversation history for the Responses API
 * @param {Array<Object>} conversationHistory - Array of conversation objects with role and content
 * @param {string} [systemPrompt=null] - Optional system prompt to include at the beginning
 * @returns {Array<Object>} Properly formatted message array for the Responses API
 */
const formatConversation = (conversationHistory, systemPrompt = null) => {
  if (!Array.isArray(conversationHistory)) {
    throw new Error('Conversation history must be an array');
  }
  
  const messages = [];
  
  // Add system message if provided
  if (systemPrompt) {
    messages.push(formatMessage(systemPrompt, 'system'));
  }
  
  // Add all messages from conversation history
  conversationHistory.forEach(msg => {
    if (!msg.role || !msg.content) {
      throw new Error('Each conversation message must have role and content');
    }
    
    messages.push(formatMessage(msg.content, msg.role));
  });
  
  return messages;
};

/**
 * Creates a properly formatted tool result message for the Responses API
 * @param {Array<Object>} toolResults - Array of tool result objects
 * @returns {Object} Formatted tool results message
 */
const formatToolResults = (toolResults) => {
  if (!Array.isArray(toolResults)) {
    throw new Error('Tool results must be an array');
  }
  
  return {
    role: 'tool',
    content: toolResults.map(result => ({
      tool_call_id: result.tool_call_id,
      content: result.output
    }))
  };
};

module.exports = {
  formatMessage,
  promptToMessages,
  formatConversation,
  formatToolResults
};
