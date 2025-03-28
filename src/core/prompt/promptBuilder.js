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
const AdaptiveChallengeSelectionPromptBuilder = require('./builders/AdaptiveChallengeSelectionPromptBuilder');
const DifficultyCalibratonPromptBuilder = require('./builders/DifficultyCalibratonPromptBuilder');
const PersonalizedLearningPathPromptBuilder = require('./builders/PersonalizedLearningPathPromptBuilder');
const EngagementOptimizationPromptBuilder = require('./builders/EngagementOptimizationPromptBuilder');
const { PROMPT_TYPES } = require('./promptTypes');
const { PromptBuilderNotFoundError, PromptConstructionError } = require('./common/errors');
const { formatForResponsesApi } = require('../../infra/openai/messageFormatter');

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
  
  // Register the adaptive challenge selection prompt builder
  registerBuilder(PROMPT_TYPES.ADAPTIVE_CHALLENGE_SELECTION, AdaptiveChallengeSelectionPromptBuilder.build);
  
  // Register the difficulty calibration prompt builder
  registerBuilder(PROMPT_TYPES.DIFFICULTY_CALIBRATION, DifficultyCalibratonPromptBuilder.build);
  
  // Register the personalized learning path prompt builder
  registerBuilder(PROMPT_TYPES.PERSONALIZED_LEARNING_PATH, PersonalizedLearningPathPromptBuilder.build);
  
  // Register the engagement optimization prompt builder
  registerBuilder(PROMPT_TYPES.ENGAGEMENT_OPTIMIZATION, EngagementOptimizationPromptBuilder.build);
  
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
 * Register a builder instance that conforms to the builder interface
 * @param {Object} builder - Builder object with type and build properties
 * @throws {Error} If the builder doesn't have required properties
 */
function registerBuilderInstance(builder) {
  if (!builder || !builder.type || typeof builder.build !== 'function') {
    throw new Error('Invalid builder instance: must have type and build properties');
  }
  
  registerBuilder(builder.type, builder.build);
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
 * @throws {PromptBuilderNotFoundError} If the builder is not found
 * @private
 */
function getBuilder(type) {
  const normalizedType = normalizeType(type);
  
  if (!builderRegistry.has(normalizedType)) {
    throw new PromptBuilderNotFoundError(type);
  }
  
  return builderRegistry.get(normalizedType);
}

/**
 * Build a prompt using the appropriate builder
 * @param {string} type - The type of prompt to build
 * @param {Object} params - The parameters for the prompt
 * @returns {Promise<Object>} Object containing input and instructions for Responses API
 * @throws {PromptConstructionError} If the builder encounters an error
 */
async function buildPrompt(type, params) {
  try {
    const builder = getBuilder(type);
    
    log('debug', `Building prompt using facade for type "${type}"`, {
      paramKeys: Object.keys(params)
    });
    
    // Call the builder function with the parameters
    const result = await builder(params);
    
    // Handle various return formats and convert to Responses API format
    let input, instructions;
    
    if (typeof result === 'string') {
      // Legacy string return - use as input with empty instructions
      input = result;
      instructions = null;
    } else if (typeof result === 'object' && result !== null) {
      // If builder already returns input/instructions format, use it directly
      if (result.input !== undefined) {
        input = result.input;
        instructions = result.instructions;
      } 
      // Handle legacy object format with prompt/systemMessage
      else {
        input = result.prompt || result.content || '';
        instructions = result.systemMessage || result.system || null;
      }
    } else {
      throw new PromptConstructionError('Invalid prompt result format', { result });
    }
    
    log('debug', 'Successfully built prompt for Responses API', {
      type,
      inputLength: input?.length || 0,
      hasInstructions: !!instructions
    });
    
    // Format for Responses API
    return formatForResponsesApi(input, instructions);
  } catch (error) {
    log('error', `Error building prompt for type "${type}"`, {
      error: error.message,
      stack: error.stack
    });
    
    if (error.name === 'PromptBuilderNotFoundError' || 
        error.name === 'PromptConstructionError') {
      throw error;
    }
    
    throw new PromptConstructionError(`Failed to build prompt for type "${type}": ${error.message}`, {
      originalError: error
    });
  }
}

/**
 * Create a specialized builder function for a specific prompt type
 * @param {string} type - The prompt type
 * @returns {Function} A specialized builder function
 */
function createBuilder(type) {
  const builder = getBuilder(type);
  return async (params) => {
    try {
      return await buildPrompt(type, params);
    } catch (error) {
      throw new PromptConstructionError(`Failed to create builder for type "${type}": ${error.message}`, {
        originalError: error
      });
    }
  };
}

/**
 * Check if a builder exists for a specific prompt type
 * @param {string} type - The prompt type to check
 * @returns {boolean} True if a builder exists, false otherwise
 */
function hasBuilder(type) {
  return builderRegistry.has(normalizeType(type));
}

/**
 * Get all available prompt types
 * @returns {Array<string>} Array of available prompt types
 */
function getAvailableTypes() {
  return Array.from(builderRegistry.keys());
}

/**
 * Reset the builder registry (mainly for testing)
 */
function reset() {
  builderRegistry.clear();
}

// Register the default builders when the module is loaded
registerDefaultBuilders();

module.exports = {
  buildPrompt,
  createBuilder,
  hasBuilder,
  getAvailableTypes,
  registerBuilder,
  registerBuilderInstance,
  reset
};