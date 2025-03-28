/**
 * OpenAI API Types
 * 
 * Type definitions and constants for OpenAI APIs
 */

// Model names for the Responses API
const ResponsesApiModel = {
  // Latest models
  GPT4O: 'gpt-4o',
  GPT4_TURBO: 'gpt-4-turbo',
  GPT35_TURBO: 'gpt-3.5-turbo',
  
  // Specific versions
  GPT4_0125: 'gpt-4-0125-preview',
  GPT4_1106: 'gpt-4-1106-preview',
  GPT35_TURBO_0125: 'gpt-3.5-turbo-0125',
  
  // Legacy - included for backward compatibility
  GPT4: 'gpt-4'
};

// Message roles for the Responses API
const MessageRole = {
  SYSTEM: 'system',
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL: 'tool',
  FUNCTION: 'function' // Maintained for backward compatibility
};

// Response format options
const ResponseFormat = {
  TEXT: 'text',
  JSON_OBJECT: 'json_object'
};

// Message content types
const ContentType = {
  TEXT: 'text',
  IMAGE_URL: 'image_url'
};

// Tool types
const ToolType = {
  FUNCTION: 'function'
};

module.exports = {
  ResponsesApiModel,
  MessageRole,
  ResponseFormat,
  ContentType,
  ToolType
}; 