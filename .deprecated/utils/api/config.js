/**
 * API Configuration for OpenAI Responses API
 * 
 * Centralizes configuration settings for the OpenAI Responses API,
 * including model selection, default parameters, and common options.
 * 
 * IMPORTANT: This implementation EXCLUSIVELY uses OpenAI Responses API, NEVER
 * Chat Completions API or Assistants API.
 * 
 * @module apiConfig
 */

/**
 * Default models for different use cases
 */
const DEFAULT_MODELS = {
  // Standard model for most use cases
  DEFAULT: 'gpt-4o',
  
  // Models for specific capabilities
  VISION: 'gpt-4o',
  STRUCTURED_OUTPUT: 'gpt-4o',
  FUNCTION_CALLING: 'gpt-4o',
  
  // Models for different performance tiers
  STANDARD: 'gpt-4o-mini',
  ADVANCED: 'gpt-4o'
};

/**
 * Default parameters for API requests
 */
const DEFAULT_PARAMETERS = {
  // Response generation parameters
  TEMPERATURE: 0.7,
  TOP_P: 1.0,
  FREQUENCY_PENALTY: 0,
  PRESENCE_PENALTY: 0,
  
  // Token limits
  MAX_TOKENS: {
    DEFAULT: 1000,
    CHALLENGE_GENERATION: 2000,
    EVALUATION: 1500,
    PERSONALITY_INSIGHTS: 2500
  }
};

/**
 * Response formats for the Responses API
 */
const RESPONSE_FORMATS = {
  TEXT: { type: 'text' },
  JSON: { type: 'json_object' }
};

/**
 * Default system messages for different contexts
 */
const DEFAULT_SYSTEM_MESSAGES = {
  CHALLENGE_GENERATION: 'You are an expert communication coach specializing in creating personalized challenges that help people improve their professional communication skills.',
  EVALUATION: 'You are an expert evaluator of professional communication, providing detailed, constructive feedback on responses to communication challenges.',
  PERSONALITY_INSIGHTS: 'You are an expert in analyzing communication patterns and providing insights about a person\'s communication style and strengths.'
};

/**
 * Creates default request parameters based on the use case
 * @param {string} useCase - The use case for the request
 * @returns {Object} Default parameters for the specified use case
 */
const getDefaultParameters = (useCase = 'DEFAULT') => {
  const baseParams = {
    model: DEFAULT_MODELS.DEFAULT,
    temperature: DEFAULT_PARAMETERS.TEMPERATURE,
    top_p: DEFAULT_PARAMETERS.TOP_P,
    frequency_penalty: DEFAULT_PARAMETERS.FREQUENCY_PENALTY,
    presence_penalty: DEFAULT_PARAMETERS.PRESENCE_PENALTY,
    max_tokens: DEFAULT_PARAMETERS.MAX_TOKENS.DEFAULT
  };
  
  switch (useCase.toUpperCase()) {
    case 'CHALLENGE_GENERATION':
      return {
        ...baseParams,
        model: DEFAULT_MODELS.ADVANCED,
        max_tokens: DEFAULT_PARAMETERS.MAX_TOKENS.CHALLENGE_GENERATION
      };
    
    case 'EVALUATION':
      return {
        ...baseParams,
        temperature: 0.5, // Lower temperature for more consistent evaluations
        max_tokens: DEFAULT_PARAMETERS.MAX_TOKENS.EVALUATION
      };
    
    case 'PERSONALITY_INSIGHTS':
      return {
        ...baseParams,
        model: DEFAULT_MODELS.ADVANCED,
        max_tokens: DEFAULT_PARAMETERS.MAX_TOKENS.PERSONALITY_INSIGHTS,
        temperature: 0.4 // Lower temperature for more accurate insights
      };
    
    case 'STRUCTURED_OUTPUT':
      return {
        ...baseParams,
        model: DEFAULT_MODELS.STRUCTURED_OUTPUT,
        response_format: RESPONSE_FORMATS.JSON,
        temperature: 0.2 // Lower temperature for more predictable outputs
      };
    
    case 'FUNCTION_CALLING':
      return {
        ...baseParams,
        model: DEFAULT_MODELS.FUNCTION_CALLING,
        temperature: 0.2 // Lower temperature for more predictable tool usage
      };
    
    default:
      return baseParams;
  }
};

/**
 * Gets the system message for a specific context
 * @param {string} context - The context for the system message
 * @returns {string} The system message for the specified context
 */
const getSystemMessage = (context = 'DEFAULT') => {
  return DEFAULT_SYSTEM_MESSAGES[context.toUpperCase()] || '';
};

module.exports = {
  DEFAULT_MODELS,
  DEFAULT_PARAMETERS,
  RESPONSE_FORMATS,
  DEFAULT_SYSTEM_MESSAGES,
  getDefaultParameters,
  getSystemMessage
};
