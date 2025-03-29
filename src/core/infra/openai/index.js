'use strict';

/**
 * OpenAI Infrastructure Module
 *
 * Provides interfaces for interacting with OpenAI services.
 * This module follows Domain-Driven Design principles by
 * abstracting external service implementations from the domain.
 */

// const OpenAIClient = require('./client');
const { OpenAIStateManager } = require('./stateManager');
const {
  formatForResponsesApi,
  formatMultimodalContent,
  formatContentWithFiles,
} = require('./messageFormatter');
const { processStreamResponse, processResponseChunks } = require('./streamProcessor');
const { OpenAIResponseHandler } = require('./responseHandler');
const { createOpenAIError, OpenAIError, OpenAIRequestError } = require('./errors');
// const config = require('./config');
const { MessageRole } = require('./types');

// Export all components
module.exports = {
  // Main client
  OpenAIClient,

  // State management
  OpenAIStateManager,

  // Message formatting utilities
  formatForResponsesApi,
  formatMultimodalContent,
  formatContentWithFiles,

  // Response handling
  OpenAIResponseHandler,
  processStreamResponse,
  processResponseChunks,

  // Error handling
  OpenAIError,
  OpenAIRequestError,
  createOpenAIError,

  // Configuration and types
  config,
  MessageRole,
};
