/**
 * OpenAI API Types
 * 
 * Type definitions and constants for OpenAI Responses API
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
  GPT35_TURBO_0125: 'gpt-3.5-turbo-0125'
};

// Message roles for the Responses API
const MessageRole = {
  SYSTEM: 'system',
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL: 'tool'
};

// Response format options
const ResponseFormat = {
  TEXT: 'text',
  JSON_OBJECT: 'json_object',
  MARKDOWN: 'markdown',
  HTML: 'html'
};

// Message content types
const ContentType = {
  TEXT: 'text',
  IMAGE_URL: 'image_url',
  FILE: 'file',
  JSON: 'json',
  MARKDOWN: 'markdown',
  HTML: 'html'
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