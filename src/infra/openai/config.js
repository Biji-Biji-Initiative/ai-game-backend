/**
 * OpenAI Configuration
 * 
 * Configuration constants and settings for interacting with OpenAI APIs
 */

// API constants 
const ResponsesApiModel = {
  GPT4O: 'gpt-4o',
  GPT4: 'gpt-4',
  GPT35TURBO: 'gpt-3.5-turbo'
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
  JSON: 'json_object'
};

// Default settings
const defaults = {
  model: process.env.OPENAI_DEFAULT_MODEL || ResponsesApiModel.GPT4O,
  temperature: parseFloat(process.env.OPENAI_DEFAULT_TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10)
};

// OpenAI API configuration
const apiConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
  defaultHeaders: {
    'Content-Type': 'application/json'
  },
  timeoutMs: parseInt(process.env.OPENAI_API_TIMEOUT || '30000', 10)
};

module.exports = {
  ResponsesApiModel,
  MessageRole,
  ResponseFormat,
  defaults,
  apiConfig
}; 