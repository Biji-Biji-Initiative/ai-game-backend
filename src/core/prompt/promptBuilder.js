/**
 * Prompt Builder Facade
 * 
 * A unified interface for building all types of prompts across the application.
 * Follows the Facade design pattern to simplify the interaction with various 
 * specialized prompt builders while providing a consistent API.
 * 
 * @module promptBuilder
 * @requires logger
 */

const { logger } = require('../../core/infra/logging/logger');
const EvaluationPromptBuilder = require('./builders/EvaluationPromptBuilder');
const ChallengePromptBuilder = require('./builders/ChallengePromptBuilder');
const FocusAreaPromptBuilder = require('./builders/FocusAreaPromptBuilder');
const PersonalityPromptBuilder = require('./builders/PersonalityPromptBuilder');
const ProgressPromptBuilder = require('./builders/ProgressPromptBuilder');
const { PROMPT_TYPES } = require('./promptTypes');

// We'll implement additional builders as they're created
// const ProgressPromptBuilder = require('./builders/ProgressPromptBuilder');

// Builder registry to store all available prompt builders
const builderRegistry = new Map();

/**
 * Helper function for logging if logger exists
 */
function log(level, message, meta = {}) {
  if (logger && typeof logger[level] === 'function') {
    logger[level](message, meta);
  } else {
    console[level === 'error' ? 'error' : 'log'](message, meta);
  }
}

/**
 * Register all the default prompt builders
 * This is called internally when the module is loaded
 */
function registerDefaultBuilders() {
  // Register the evaluation prompt builder
  registerBuilder(PROMPT_TYPES.EVALUATION, EvaluationPromptBuilder.build);
  
  // Register the challenge prompt builder
  registerBuilder(PROMPT_TYPES.CHALLENGE, ChallengePromptBuilder.build);
  
  // Register the focus area prompt builder
  registerBuilder(PROMPT_TYPES.FOCUS_AREA, FocusAreaPromptBuilder.build);
  
  // Register the personality prompt builder
  registerBuilder(PROMPT_TYPES.PERSONALITY, PersonalityPromptBuilder.build);
  
  // Register the progress prompt builder
  registerBuilder(PROMPT_TYPES.PROGRESS, ProgressPromptBuilder.build);
  
  // We'll register additional builders as they're implemented
  // registerBuilder(PROMPT_TYPES.PROGRESS, ProgressPromptBuilder.build);
  
  log('debug', 'Registered default prompt builders', {
    builderCount: builderRegistry.size,
    availableTypes: Array.from(builderRegistry.keys())
  });
}

/**
 * Register a new prompt builder
 * @param {string} type - The prompt type
 * @param {Function} builderFn - The builder function
 * @throws {Error} If the builder function is not valid
 */
function registerBuilder(type, builderFn) {
  if (typeof builderFn !== 'function') {
    throw new Error(`Builder for "${type}" must be a function`);
  }
  
  builderRegistry.set(type.toLowerCase(), builderFn);
  log('debug', `Registered prompt builder for "${type}"`, { 
    totalBuilders: builderRegistry.size 
  });
}

/**
 * Normalize the prompt type to a standard format
 * @param {string} type - The prompt type to normalize
 * @returns {string} Normalized prompt type
 * @private
 */
function normalizeType(type) {
  if (!type) {
    throw new Error('Prompt type is required');
  }
  
  // Convert to lowercase and remove non-alphanumeric characters
  return type.toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

/**
 * Get a builder function for a specific prompt type
 * @param {string} type - The prompt type
 * @returns {Function} The builder function
 * @throws {Error} If the builder is not found
 * @private
 */
function getBuilder(type) {
  const normalizedType = normalizeType(type);
  
  if (!builderRegistry.has(normalizedType)) {
    throw new Error(`No prompt builder registered for type "${type}"`);
  }
  
  return builderRegistry.get(normalizedType);
}

/**
 * Build a prompt using the appropriate builder
 * @param {string} type - The type of prompt to build
 * @param {Object} params - The parameters for the prompt
 * @returns {Promise<string>} The built prompt
 * @throws {Error} If the builder encounters an error
 */
async function buildPrompt(type, params) {
  try {
    const builder = getBuilder(type);
    
    log('debug', `Building prompt using facade for type "${type}"`, {
      paramKeys: Object.keys(params)
    });
    
    // Call the builder function with the parameters
    const prompt = await builder(params);
    
    log('debug', 'Successfully built prompt', {
      type,
      promptLength: prompt.length
    });
    
    return prompt;
  } catch (error) {
    log('error', `Error building prompt for type "${type}"`, {
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
}

/**
 * Create a specialized builder function for a specific prompt type
 * @param {string} type - The prompt type
 * @returns {Function} A specialized builder function
 */
function createBuilder(type) {
  const builder = getBuilder(type);
  
  log('debug', `Created specialized builder for "${type}"`);
  
  // Return a function that proxies to the builder
  return async (params) => {
    try {
      return await builder(params);
    } catch (error) {
      log('error', `Error in specialized builder for "${type}"`, {
        error: error.message
      });
      
      throw error;
    }
  };
}

/**
 * Check if a builder exists for a specific prompt type
 * @param {string} type - The prompt type to check
 * @returns {boolean} True if a builder exists, false otherwise
 */
function hasBuilder(type) {
  try {
    const normalizedType = normalizeType(type);
    return builderRegistry.has(normalizedType);
  } catch (error) {
    return false;
  }
}

/**
 * Get all available prompt types
 * @returns {Array<string>} Array of available prompt types
 */
function getAvailableTypes() {
  return Array.from(builderRegistry.keys());
}

// Register the default builders when the module is loaded
registerDefaultBuilders();

module.exports = {
  buildPrompt,
  registerBuilder,
  createBuilder,
  hasBuilder,
  getAvailableTypes
}; 