/**
 * Prompt Builder Facade
 * 
 * A unified interface for building all types of prompts across the application
 * formatted specifically for OpenAI's Responses API.
 * 
 * @module promptBuilder
 * @requires logger
 */

const { logger } = require('../../core/infra/logging/logger');
const { PROMPT_TYPES } = require('./promptTypes');
const { PromptBuilderNotFoundError, PromptConstructionError } = require('./common/errors');
const { formatForResponsesApi } = require('../../infra/openai/messageFormatter');

// Import all prompt builders
const EvaluationPromptBuilder = require('./builders/EvaluationPromptBuilder');
const ChallengePromptBuilder = require('./builders/ChallengePromptBuilder');
const FocusAreaPromptBuilder = require('./builders/FocusAreaPromptBuilder');
const PersonalityPromptBuilder = require('./builders/PersonalityPromptBuilder');
const ProgressPromptBuilder = require('./builders/ProgressPromptBuilder');
const AdaptiveChallengeSelectionPromptBuilder = require('./builders/AdaptiveChallengeSelectionPromptBuilder');
const DifficultyCalibratonPromptBuilder = require('./builders/DifficultyCalibratonPromptBuilder');
const PersonalizedLearningPathPromptBuilder = require('./builders/PersonalizedLearningPathPromptBuilder');
const EngagementOptimizationPromptBuilder = require('./builders/EngagementOptimizationPromptBuilder');

// Builder registry to store all available prompt builders
const builderRegistry = new Map();

/**
 * Helper function for logging with appropriate fallback
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} message - Message to log
 * @param {Object} meta - Additional metadata
 * @private
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
 * @private
 */
function registerDefaultBuilders() {
  // Register all builders using a consistent pattern
  registerBuilder(PROMPT_TYPES.EVALUATION, EvaluationPromptBuilder.build);
  registerBuilder(PROMPT_TYPES.CHALLENGE, ChallengePromptBuilder.build);
  registerBuilder(PROMPT_TYPES.FOCUS_AREA, FocusAreaPromptBuilder.build);
  registerBuilder(PROMPT_TYPES.PERSONALITY, PersonalityPromptBuilder.build);
  registerBuilder(PROMPT_TYPES.PROGRESS, ProgressPromptBuilder.build);
  registerBuilder(PROMPT_TYPES.ADAPTIVE_CHALLENGE_SELECTION, AdaptiveChallengeSelectionPromptBuilder.build);
  registerBuilder(PROMPT_TYPES.DIFFICULTY_CALIBRATION, DifficultyCalibratonPromptBuilder.build);
  registerBuilder(PROMPT_TYPES.PERSONALIZED_LEARNING_PATH, PersonalizedLearningPathPromptBuilder.build);
  registerBuilder(PROMPT_TYPES.ENGAGEMENT_OPTIMIZATION, EngagementOptimizationPromptBuilder.build);
  
  log('debug', 'Registered default prompt builders', {
    builderCount: builderRegistry.size,
    availableTypes: Array.from(builderRegistry.keys())
  });
}

/**
 * Register a new prompt builder function
 * @param {string} type - The prompt type
 * @param {Function} builderFn - The builder function
 * @throws {Error} If the builder function is not valid
 * @public
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
 * Register a builder instance (object with build method)
 * @param {string} type - The prompt type
 * @param {Object} builderInstance - The builder instance with build method
 * @throws {Error} If the builder instance lacks a build method
 * @public
 */
function registerBuilderInstance(type, builderInstance) {
  if (!builderInstance || 
      typeof builderInstance !== 'object' || 
      typeof builderInstance.build !== 'function') {
    throw new Error(`Builder instance for "${type}" must have a build method`);
  }
  
  builderRegistry.set(type.toLowerCase(), builderInstance.build.bind(builderInstance));
  log('debug', `Registered prompt builder instance for "${type}"`, { 
    totalBuilders: builderRegistry.size 
  });
}

/**
 * Normalizes a prompt type for case-insensitive lookup
 * @param {string} type - The type to normalize
 * @returns {string} Normalized type
 * @private
 */
function normalizeType(type) {
  return type.toLowerCase();
}

/**
 * Get available prompt types
 * @returns {Array<string>} Array of available prompt types
 * @public
 */
function getAvailableTypes() {
  return Array.from(builderRegistry.keys());
}

/**
 * Reset the builder registry, often used in testing
 * @public
 */
function reset() {
  builderRegistry.clear();
  registerDefaultBuilders();
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
 * @public
 */
async function buildPrompt(type, params) {
  try {
    const builder = getBuilder(type);
    
    log('debug', `Building prompt using builder for type "${type}"`, {
      paramKeys: Object.keys(params)
    });
    
    // Call the builder function with the parameters
    const result = await builder(params);
    
    // If result is already in Responses API format, return it directly
    if (result && 
        typeof result === 'object' && 
        result.input !== undefined) {
      
      // Validate required properties
      if (typeof result.input !== 'string' && !Array.isArray(result.input)) {
        throw new PromptConstructionError(
          `Builder for "${type}" returned invalid input type: ${typeof result.input}. Must be string or array.`
        );
      }
      
      if (result.instructions !== undefined && 
          result.instructions !== null && 
          typeof result.instructions !== 'string') {
        throw new PromptConstructionError(
          `Builder for "${type}" returned invalid instructions type: ${typeof result.instructions}. Must be string or null.`
        );
      }
      
      log('debug', 'Builder returned valid Responses API format', {
        inputType: typeof result.input,
        hasInstructions: !!result.instructions
      });
      
      return result;
    }
    
    // Handle legacy string return (input only)
    if (typeof result === 'string') {
      log('warn', `Builder for "${type}" returned legacy string format. Should return Responses API format.`);
      return formatForResponsesApi(result, null);
    }
    
    // Handle legacy object formats 
    if (typeof result === 'object' && result !== null) {
      log('warn', `Builder for "${type}" returned legacy object format. Should return Responses API format.`);
      
      // Handle object with prompt/content and systemMessage/system
      if (result.prompt || result.content) {
        const input = result.prompt || result.content;
        const instructions = result.systemMessage || result.system || null;
        
        if (!input || typeof input !== 'string') {
          throw new PromptConstructionError('Prompt content must be a non-empty string');
        }
        
        return formatForResponsesApi(input, instructions);
      }
      
      // Unrecognized format
      throw new PromptConstructionError(
        `Builder for "${type}" returned unrecognized format that cannot be converted to Responses API format`, 
        { result }
      );
    }
    
    // Result isn't a recognized type
    throw new PromptConstructionError(
      `Invalid prompt result format from builder "${type}": ${typeof result}`,
      { result }
    );
    
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
 * @public
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
 * @public
 */
function hasBuilder(type) {
  return builderRegistry.has(normalizeType(type));
}

// Initialize the registry on module load
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