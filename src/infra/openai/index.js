/**
 * OpenAI Infrastructure
 * 
 * Exports all OpenAI infrastructure components from a single location.
 */

const OpenAIClient = require('./client');
const OpenAIStateManager = require('./stateManager');
const config = require('./config');
const types = require('./types');
const errors = require('./errors');

module.exports = {
  // Core client and state manager
  OpenAIClient,
  OpenAIStateManager,
  
  // Configuration
  config,
  
  // Types and constants
  ...types,
  
  // Error classes
  ...errors
}; 