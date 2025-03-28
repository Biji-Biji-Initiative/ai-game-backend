/**
 * Prompt Domain Error Classes
 * 
 * Defines domain-specific error classes for the prompt domain.
 * These error classes provide better error handling and more descriptive errors
 * than generic Error instances.
 * 
 * @module promptErrors
 * @requires AppError
 */

const AppError = require('../../../core/infra/errors/AppError');

/**
 * Base error class for all prompt domain errors
 */
class PromptError extends AppError {
  constructor(message, code = 'PROMPT_ERROR', statusCode = 500) {
    super(message, code, statusCode);
    this.name = 'PromptError';
  }
}

/**
 * Error thrown when prompt validation fails
 */
class PromptValidationError extends PromptError {
  constructor(message, validationErrors = []) {
    super(message, 'PROMPT_VALIDATION_ERROR', 400);
    this.name = 'PromptValidationError';
    this.validationErrors = validationErrors;
  }
}

/**
 * Error thrown when a builder for a prompt type is not found
 */
class PromptBuilderNotFoundError extends PromptError {
  constructor(promptType) {
    super(`No builder found for prompt type: ${promptType}`, 'PROMPT_BUILDER_NOT_FOUND', 404);
    this.name = 'PromptBuilderNotFoundError';
    this.promptType = promptType;
  }
}

/**
 * Error thrown when a template is not found
 */
class PromptTemplateNotFoundError extends PromptError {
  constructor(templateId) {
    super(`Prompt template not found: ${templateId}`, 'PROMPT_TEMPLATE_NOT_FOUND', 404);
    this.name = 'PromptTemplateNotFoundError';
    this.templateId = templateId;
  }
}

/**
 * Error thrown when template construction fails
 */
class PromptConstructionError extends PromptError {
  constructor(message, details = {}) {
    super(message, 'PROMPT_CONSTRUCTION_ERROR', 500);
    this.name = 'PromptConstructionError';
    this.details = details;
  }
}

module.exports = {
  PromptError,
  PromptValidationError,
  PromptBuilderNotFoundError,
  PromptTemplateNotFoundError,
  PromptConstructionError
}; 