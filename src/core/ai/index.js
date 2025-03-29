'use strict';

/**
 * AI Module
 *
 * This module provides a consistent interface for interacting with AI services
 * using the ports and adapters pattern to isolate infrastructure details from domain logic.
 */

// Ports (interfaces)
const AIClient = require('./ports/AIClient');
const AIStateManager = require('./ports/AIStateManager');

// Adapters (implementations)
const OpenAIClientAdapter = require('./adapters/OpenAIClientAdapter');
const OpenAIStateManagerAdapter = require('./adapters/OpenAIStateManagerAdapter');

// Export all components
module.exports = {
  // Ports
  AIClient,
  AIStateManager,
  
  // Adapters
  OpenAIClientAdapter,
  OpenAIStateManagerAdapter
}; 