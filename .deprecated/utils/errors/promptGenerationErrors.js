/**
 * Prompt Generation Errors
 * Specialized error classes for prompt generation failures
 * 
 * Follows the project's strict error handling requirements:
 * - ALWAYS throw errors when encountering exceptional conditions
 * - NEVER implement fallback mechanisms or silent failure modes
 * - Errors must be specific, descriptive, and include context
 */

const { AppError } = require('../errorHandler');

/**
 * Base class for all prompt generation errors
 */
class PromptGenerationError extends AppError {
  /**
   * Create a new prompt generation error
   * @param {string} message - Error message
   * @param {object} metadata - Additional error context
   */
  constructor(message, metadata = {}) {
    super(message, 500, metadata);
    this.errorCode = 'PROMPT_GENERATION_ERROR';
  }
}

/**
 * Error thrown when required parameters are missing
 */
class MissingParameterError extends PromptGenerationError {
  /**
   * Create a new missing parameter error
   * @param {string} paramName - Name of the missing parameter
   * @param {string} promptType - Type of prompt being generated
   * @param {object} additionalContext - Any additional context
   */
  constructor(paramName, promptType, additionalContext = {}) {
    const message = `Missing required parameter: ${paramName} for ${promptType} prompt generation`;
    const metadata = {
      paramName,
      promptType,
      ...additionalContext
    };
    super(message, metadata);
    this.errorCode = 'MISSING_PARAMETER';
  }
}

/**
 * Custom error classes for prompt generation and API integration
 */

/**
 * Error for API integration issues
 * @extends Error
 */
class ApiIntegrationError extends Error {
  /**
   * Creates an API integration error
   * @param {string} message - Error message
   * @param {number} [status=500] - HTTP status code
   * @param {Error} [cause] - Underlying error that caused this one
   */
  constructor(message, status = 500, cause = null) {
    super(message);
    this.name = 'ApiIntegrationError';
    this.status = status;
    this.cause = cause;
  }
}

/**
 * Error for OpenAI service issues
 * @extends Error
 */
class OpenAIServiceError extends Error {
  /**
   * Creates an OpenAI service error
   * @param {string} operation - The operation that failed
   * @param {Error} originalError - The original error
   */
  constructor(operation, originalError) {
    const message = `Failed to ${operation}: ${originalError.message}`;
    super(message);
    this.name = 'OpenAIServiceError';
    this.originalError = originalError;
    this.operation = operation;
  }
}

/**
 * Error for prompt validation issues
 * @extends Error
 */
class PromptValidationError extends Error {
  /**
   * Creates a prompt validation error
   * @param {string} message - Error message
   * @param {Object} [validationDetails={}] - Details about validation failure
   */
  constructor(message, validationDetails = {}) {
    super(message);
    this.name = 'PromptValidationError';
    this.validationDetails = validationDetails;
  }
}

/**
 * Error for prompt generation issues
 * @extends Error
 */
class PromptGenError extends Error {
  /**
   * Creates a prompt generation error
   * @param {string} message - Error message
   * @param {string} [promptType='unknown'] - Type of prompt being generated
   * @param {Error} [cause=null] - Underlying error that caused this one
   */
  constructor(message, promptType = 'unknown', cause = null) {
    super(message);
    this.name = 'PromptGenError';
    this.promptType = promptType;
    this.cause = cause;
  }
}

/**
 * Error thrown when an invalid prompt type is specified
 */
class InvalidPromptTypeError extends PromptGenerationError {
  /**
   * Create a new invalid prompt type error
   * @param {string} promptType - The invalid prompt type
   * @param {Array} validTypes - List of valid prompt types
   */
  constructor(promptType, validTypes = []) {
    const message = `Invalid prompt type: ${promptType}`;
    const metadata = {
      promptType,
      validTypes
    };
    super(message, metadata);
    this.errorCode = 'INVALID_PROMPT_TYPE';
  }
}

module.exports = {
  ApiIntegrationError,
  OpenAIServiceError,
  PromptValidationError,
  PromptGenError,
  PromptGenerationError
};
