/**
 * Responses API Types
 * 
 * Constants and types for the OpenAI Responses API
 */

/**
 * Available models for the Responses API
 */
const ResponsesApiModel = {
  /** Default model for Responses API */
  DEFAULT: 'gpt-4o',
  /** GPT-4o model */
  GPT4O: 'gpt-4o',
  /** Vision-capable model */
  GPT_4_VISION: 'gpt-4-vision-preview',
  /** Latest GPT-4 Turbo model */
  GPT_4_TURBO: 'gpt-4-turbo-preview',
  /** Base GPT-4 model */
  GPT_4: 'gpt-4',
  /** Latest GPT-3.5 Turbo model */
  GPT_3_5_TURBO: 'gpt-3.5-turbo'
};

/**
 * Message roles for the Responses API
 */
const MessageRole = {
  /** System role for instructions */
  SYSTEM: 'system',
  /** User role for input */
  USER: 'user',
  /** Assistant role for output */
  ASSISTANT: 'assistant'
};

/**
 * Response formats for the Responses API
 */
const ResponseFormat = {
  /** Default text format */
  TEXT: 'text',
  /** JSON Object format */
  JSON: 'json'
};

/**
 * Standard parameters for OpenAI Responses API calls
 * @typedef {Object} ResponsesApiParams
 * @property {string} model - The model to use
 * @property {Array<Object>} messages - Array of message objects
 * @property {number} [temperature=0.7] - Controls randomness (0-2)
 * @property {number} [max_tokens] - Maximum number of tokens to generate
 * @property {boolean} [stream=false] - Whether to stream responses
 * @property {Object} [response_format] - Format for responses (e.g., text or json_object)
 * @property {Array<Object>} [tools] - Optional tools to provide
 * @property {number} [tool_choice] - How the model should call tools
 */

/**
 * Structure for creating a conversation message
 * @typedef {Object} Message
 * @property {string} role - Role of the message sender (user, assistant, system)
 * @property {string} content - Content of the message
 */

/**
 * Tool definition for the Responses API
 * @typedef {Object} Tool
 * @property {string} type - Type of tool (typically "function")
 * @property {Object} function - Function definition
 * @property {string} function.name - Name of the function
 * @property {string} function.description - Description of what the function does
 * @property {Object} function.parameters - JSON Schema for the function parameters
 */

module.exports = {
  ResponsesApiModel,
  MessageRole,
  ResponseFormat
}; 