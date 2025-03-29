'use strict';

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
  GPT35_TURBO_0125: 'gpt-3.5-turbo-0125',
};

// Message roles for the Responses API
const MessageRole = {
  SYSTEM: 'system',
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL: 'tool',
};

/**
 * Response format types for the OpenAI Responses API
 * @readonly
 * @enum {string}
 */
const ResponseFormat = {
  /** Plain text response (default) */
  TEXT: 'text',
  /** JSON response */
  JSON: 'json',
};

// Message content types
const ContentType = {
  TEXT: 'text',
  IMAGE_URL: 'image_url',
  FILE: 'file',
  JSON: 'json',
  MARKDOWN: 'markdown',
  HTML: 'html',
};

/**
 * Available built-in tool types for the OpenAI Responses API
 * @readonly
 * @enum {string}
 */
const BuiltInToolType = {
  /** Web search tool */
  WEB_SEARCH: 'web_search',
  /** File search tool */
  FILE_SEARCH: 'file_search',
  /** Code interpreter tool */
  CODE_INTERPRETER: 'code_interpreter',
};

/**
 * Tool choice options for the OpenAI Responses API
 * @readonly
 * @enum {string}
 */
const ToolChoice = {
  /** Let the model decide which tools to use (default) */
  AUTO: 'auto',
  /** Do not use any tools */
  NONE: 'none',
};

/**
 * Truncation strategy options for the OpenAI Responses API
 * @readonly
 * @enum {string}
 */
const TruncationStrategy = {
  /** If context exceeds window size, will fail with 400 error (default) */
  DISABLED: 'disabled',
  /** If context exceeds window size, will drop items in the middle of the conversation */
  AUTO: 'auto',
};

/**
 * Include parameter options for the OpenAI Responses API
 * @readonly
 * @enum {string}
 */
const IncludeOption = {
  /** Include search results from file search tool calls */
  FILE_SEARCH_RESULTS: 'file_search_call.results',
  /** Include image URLs from input messages */
  INPUT_IMAGES: 'message.input_image.image_url',
  /** Include image URLs from computer call outputs */
  OUTPUT_IMAGES: 'computer_call_output.output.image_url',
};

/**
 * Stream event types from the OpenAI Responses API
 * @readonly
 * @enum {string}
 */
const StreamEventType = {
  /** Response was created */
  CREATED: 'response.created',
  /** Response is in progress */
  IN_PROGRESS: 'response.in_progress',
  /** Response is completed */
  COMPLETED: 'response.completed',
  /** Response failed */
  FAILED: 'response.failed',
  /** Response is incomplete */
  INCOMPLETE: 'response.incomplete',
  /** Output item was added */
  ITEM_ADDED: 'response.output_item.added',
  /** Output item is done */
  ITEM_DONE: 'response.output_item.done',
  /** Content part was added */
  CONTENT_ADDED: 'response.content_part.added',
  /** Content part is done */
  CONTENT_DONE: 'response.content_part.done',
  /** Text delta was added */
  TEXT_DELTA: 'response.output_text.delta',
  /** Text annotation was added */
  ANNOTATION_ADDED: 'response.output_text.annotation.added',
  /** Text output is done */
  TEXT_DONE: 'response.output_text.done',
  /** Function arguments delta */
  FUNCTION_ARGS_DELTA: 'response.function_call_arguments.delta',
  /** Function arguments done */
  FUNCTION_ARGS_DONE: 'response.function_call_arguments.done',
  /** Error occurred */
  ERROR: 'error',
};

module.exports = {
  ResponsesApiModel,
  MessageRole,
  ResponseFormat,
  ContentType,
  BuiltInToolType,
  ToolChoice,
  TruncationStrategy,
  IncludeOption,
  StreamEventType,
};
