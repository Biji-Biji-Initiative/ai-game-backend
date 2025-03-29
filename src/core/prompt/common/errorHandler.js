'use strict';

/**
 * Prompt Error Handler
 *
 * Specialized error handling for prompt-related operations
 *
 * @module promptErrorHandler
 */

const { logger } = require('../../../core/infra/logging/logger');
// const AppError = require('../../../core/infra/errors/AppError');

/**
 * Handle LLM prompt generation errors
 * @param {Error} error - Caught error
 * @param {string} context - Additional context about the operation
 * @returns {Error} Enhanced error for logging
 */
function handlePromptError(error, context = 'prompt generation') {
  const enhancedError =
    error instanceof AppError
      ? error
      : new AppError(`Error during ${context}: ${error.message}`, 500);

  logger.error(`Prompt error: ${enhancedError.message}`, {
    context,
    originalError: error.message,
    stack: error.stack,
  });

  return enhancedError;
}

/**
 * Validate that a generated response meets requirements
 * @param {Object} response - Generated response
 * @param {Array} requiredFields - Required fields in the response
 * @param {string} context - Context for error messages
 * @throws {AppError} If validation fails
 */
function validateGeneratedResponse(response, requiredFields = [], context = 'response') {
  if (!response) {
    throw new AppError(`Empty ${context} received from the model`, 500);
  }

  for (const field of requiredFields) {
    if (response[field] === undefined || response[field] === null) {
      throw new AppError(`Missing required field '${field}' in generated ${context}`, 500);
    }
  }
}

module.exports = {
  handlePromptError,
  validateGeneratedResponse,
};
