import { logger } from "#app/core/infra/logging/logger.js";
import { PROMPT_TYPES } from "#app/core/prompt/promptTypes.js";
import { PromptBuilderNotFoundError, PromptConstructionError } from "#app/core/prompt/common/errors.js";

// Import all prompt builders
import EvaluationPromptBuilder from "#app/core/prompt/builders/EvaluationPromptBuilder.js";
import ChallengePromptBuilder from "#app/core/prompt/builders/ChallengePromptBuilder.js";
import FocusAreaPromptBuilder from "#app/core/prompt/builders/FocusAreaPromptBuilder.js";
import PersonalityPromptBuilder from "#app/core/prompt/builders/PersonalityPromptBuilder.js";
import ProgressPromptBuilder from "#app/core/prompt/builders/ProgressPromptBuilder.js";
import AdaptiveChallengeSelectionPromptBuilder from "#app/core/prompt/builders/AdaptiveChallengeSelectionPromptBuilder.js";
import DifficultyCalibratonPromptBuilder from "#app/core/prompt/builders/DifficultyCalibratonPromptBuilder.js";
import PersonalizedLearningPathPromptBuilder from "#app/core/prompt/builders/PersonalizedLearningPathPromptBuilder.js";
import EngagementOptimizationPromptBuilder from "#app/core/prompt/builders/EngagementOptimizationPromptBuilder.js";

'use strict';
// Builder registry to store all available prompt builders
const builderRegistry = new Map();
/**
 * Helper for logging
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Metadata
 */
async function log(level, message, meta = {}) {
  try {
    if (logger) {
      logger[level](`[PromptBuilder] ${message}`, meta);
    }
  } catch (err) {
    console.error(`[PromptBuilder] Error logging: ${err.message}`);
  }
}

/**
 * Format prompt input and instructions for Responses API format
 * @param {string} input - The prompt input text
 * @param {string|null} instructions - Optional system instructions
 * @returns {Object} Formatted object for Responses API
 * @private
 */
function formatForResponsesApi(input, instructions) {
  return {
    input: input,
    instructions: instructions
  };
}

/**
 * Register all the default prompt builders
 * @private
 */
async function registerDefaultBuilders() {
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
async function registerBuilder(type, builderFn) {
  if (typeof builderFn !== 'function') {
    throw new Error(`Builder for '${type}' must be a function`);
  }
  builderRegistry.set(type.toLowerCase(), builderFn);
  log('debug', `Registered prompt builder for '${type}'`, {
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
async function registerBuilderInstance(type, builderInstance) {
  if (!builderInstance || typeof builderInstance !== 'object' || typeof builderInstance.build !== 'function') {
    throw new Error(`Builder instance for '${type}' must have a build method`);
  }
  builderRegistry.set(type.toLowerCase(), builderInstance.build.bind(builderInstance));
  log('debug', `Registered prompt builder instance for '${type}'`, {
    totalBuilders: builderRegistry.size
  });
}
/**
 * Normalizes a prompt type for case-insensitive lookup
 * @param {string} type - The type to normalize
 * @returns {string} Normalized type
 * @private
 */
async function normalizeType(type) {
  return type.toLowerCase();
}
/**
 * Get available prompt types
 * @returns {Array<string>} Array of available prompt types
 * @public
 */
async function getAvailableTypes() {
  return Array.from(builderRegistry.keys());
}
/**
 * Reset the builder registry, often used in testing
 * @public
 */
async function reset() {
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
async function getBuilder(type) {
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
  const correlationId = params.correlationId || params.options?.correlationId || `prompt_${Date.now()}`;
  
  try {
    const builder = await getBuilder(type);
    
    log('debug', `Building prompt using builder for type '${type}'`, {
      correlationId,
      paramKeys: Object.keys(params)
    });
    
    // Call the builder function with the parameters
    const result = await builder(params);
    
    // If result is already in Responses API format, return it directly
    if (result && typeof result === 'object' && result.input !== undefined) {
      // Validate required properties
      if (typeof result.input !== 'string' && !Array.isArray(result.input)) {
        throw new PromptConstructionError(`Builder for '${type}' returned invalid input type: ${typeof result.input}. Must be string or array.`);
      }
      
      if (result.instructions !== undefined && result.instructions !== null && typeof result.instructions !== 'string') {
        throw new PromptConstructionError(`Builder for '${type}' returned invalid instructions type: ${typeof result.instructions}. Must be string or null.`);
      }
      
      // Log the full prompt and system message content at DEBUG level
      log('debug', `Prompt successfully built for type: '${type}'`, {
        correlationId,
        promptType: type,
        inputType: typeof result.input,
        inputLength: typeof result.input === 'string' ? result.input.length : result.input.length,
        hasInstructions: !!result.instructions,
        instructionsLength: result.instructions ? result.instructions.length : 0
      });
      
      // Log full content at TRACE level for detailed debugging
      log('debug', `Full prompt content for type: '${type}'`, {
        correlationId,
        promptType: type,
        input: typeof result.input === 'string' ? result.input : JSON.stringify(result.input),
        instructions: result.instructions
      });
      
      return result;
    }
    
    // Handle legacy string return (input only)
    if (typeof result === 'string') {
      log('warn', `Builder for '${type}' returned legacy string format. Should return Responses API format.`, {
        correlationId
      });
      
      const formattedResult = formatForResponsesApi(result, null);
      
      // Log at debug level for debugging
      log('debug', `Full prompt content for type: '${type}' (converted from legacy format)`, {
        correlationId,
        promptType: type,
        input: result,
        instructions: null
      });
      
      return formattedResult;
    }
    
    // Handle legacy object formats 
    if (typeof result === 'object' && result !== null) {
      log('warn', `Builder for '${type}' returned legacy object format. Should return Responses API format.`, {
        correlationId
      });
      
      // Handle object with prompt/content and systemMessage/system
      if (result.prompt || result.content) {
        const input = result.prompt || result.content;
        const instructions = result.systemMessage || result.system || null;
        
        if (!input || typeof input !== 'string') {
          throw new PromptConstructionError('Prompt content must be a non-empty string');
        }
        
        const formattedResult = formatForResponsesApi(input, instructions);
        
        // Log at debug level for debugging
        log('debug', `Full prompt content for type: '${type}' (converted from legacy format)`, {
          correlationId,
          promptType: type,
          input: input,
          instructions: instructions
        });
        
        return formattedResult;
      }
      
      // Unrecognized format
      throw new PromptConstructionError(`Builder for '${type}' returned unrecognized format that cannot be converted to Responses API format`, {
        result
      });
    }
    
    // Result isn't a recognized type
    throw new PromptConstructionError(`Invalid prompt result format from builder '${type}': ${typeof result}`, {
      result
    });
  } catch (error) {
    log('error', `Error building prompt for type '${type}'`, {
      correlationId,
      error: error.message,
      stack: error.stack
    });
    
    if (error.name === 'PromptBuilderNotFoundError' || error.name === 'PromptConstructionError') {
      throw error;
    }
    
    throw new PromptConstructionError(`Failed to build prompt for type '${type}': ${error.message}`, {
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
async function createBuilder(type) {
  // Validate type by ensuring builder exists
  await getBuilder(type);
  
  return async params => {
    try {
      return await buildPrompt(type, params);
    } catch (error) {
      throw new PromptConstructionError(`Failed to create builder for type '${type}': ${error.message}`, {
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
async function hasBuilder(type) {
  return builderRegistry.has(normalizeType(type));
}
// Initialize the registry on module load
registerDefaultBuilders();
export { buildPrompt };
export { createBuilder };
export { hasBuilder };
export { getAvailableTypes };
export { registerBuilder };
export { registerBuilderInstance };
export { reset };
export default {
  buildPrompt,
  createBuilder,
  hasBuilder,
  getAvailableTypes,
  registerBuilder,
  registerBuilderInstance,
  reset
};