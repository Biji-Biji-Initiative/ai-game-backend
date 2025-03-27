/**
 * API Utilities
 * 
 * Re-exports the OpenAI Responses API client and supporting utilities.
 * This provides a unified interface for API interactions.
 * 
 * IMPORTANT: This implementation EXCLUSIVELY uses OpenAI Responses API, NEVER
 * Chat Completions API or Assistants API.
 */

// Import our core modules from the new location
const openai = require('../../lib/openai');
const config = require('./config');

// Forward all exports from openai lib
module.exports = {
  // Client
  sendMessage: openai.sendMessage,
  sendJsonMessage: openai.sendJsonMessage,
  streamMessage: openai.streamMessage,
  
  // Thread management
  threads: openai.threads,
  
  // Response parsing
  parser: openai.parser,
  
  // Function tools
  functions: openai.functions,
  
  // Types
  types: openai.types,
  
  // Config
  config,
  
  // Re-export all openai modules for direct access
  openai
};
