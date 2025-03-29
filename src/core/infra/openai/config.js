'use strict';

/**
 * OpenAI Configuration
 *
 * Configuration constants and settings for interacting with OpenAI Responses API
 */

// API constants
const ResponsesApiModel = {
  // Latest models
  GPT4O: 'gpt-4o',
  GPT4_TURBO: 'gpt-4-turbo',
  GPT35_TURBO: 'gpt-3.5-turbo',

  // Specific versions
  GPT4_0125: 'gpt-4-0125-preview',
  GPT4_1106: 'gpt-4-1106-preview',
  GPT35_TURBO_0125: 'gpt-3.5-turbo-0125',
};

// Message roles for the Responses API
const MessageRole = {
  SYSTEM: 'system',
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL: 'tool',
};

// Response format options
const ResponseFormat = {
  TEXT: 'text',
  JSON_OBJECT: 'json_object',
  MARKDOWN: 'markdown',
  HTML: 'html',
};

// Default settings
const defaults = {
  model: process.env.OPENAI_DEFAULT_MODEL || ResponsesApiModel.GPT4O,
  temperature: parseFloat(process.env.OPENAI_DEFAULT_TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
  responseFormat: ResponseFormat.TEXT,
};

// OpenAI API configuration
const apiConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1/responses',
  defaultHeaders: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeoutMs: parseInt(process.env.OPENAI_API_TIMEOUT || '30000', 10),
  maxRetries: parseInt(process.env.OPENAI_API_MAX_RETRIES || '3', 10),
};

module.exports = {
  ResponsesApiModel,
  MessageRole,
  ResponseFormat,
  defaults,
  apiConfig,
};
