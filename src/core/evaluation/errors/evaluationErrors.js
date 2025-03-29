'use strict';

/**
 * Evaluation Domain Error Classes
 *
 * Provides specific error types for the Evaluation domain
 * following Domain-Driven Design principles.
 */

const AppError = require('../../../core/infra/errors/AppError');

/**
 * Base class for Evaluation domain errors
 */
class EvaluationError extends AppError {
  /**
   * Create a new EvaluationError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message = 'Evaluation operation failed', statusCode = 400) {
    super(message, statusCode);
    this.name = 'EvaluationError';
  }
}

/**
 * Evaluation Not Found Error
 * Thrown when attempting to access a evaluation that doesn't exist
 */
class EvaluationNotFoundError extends EvaluationError {
  /**
   * Create a new EvaluationNotFoundError
   * @param {string} identifier - Evaluation identifier (ID or other) that wasn't found
   */
  constructor(identifier = '') {
    const message = identifier ? `Evaluation not found: ${identifier}` : 'Evaluation not found';
    super(message, 404);
    this.name = 'EvaluationNotFoundError';
  }
}

/**
 * Evaluation Validation Error
 * Thrown when evaluation data fails validation
 */
class EvaluationValidationError extends EvaluationError {
  /**
   * Create a new EvaluationValidationError
   * @param {string} message - Error message describing the validation failure
   */
  constructor(message = 'Invalid evaluation data') {
    super(message, 400);
    this.name = 'EvaluationValidationError';
  }
}

/**
 * Evaluation Processing Error
 * Thrown when there's an issue processing a evaluation
 */
class EvaluationProcessingError extends EvaluationError {
  /**
   * Create a new EvaluationProcessingError
   * @param {string} message - Error message describing the processing failure
   */
  constructor(message = 'Failed to process evaluation') {
    super(message, 500);
    this.name = 'EvaluationProcessingError';
  }
}

/**
 * Evaluation Repository Error
 * Thrown when there's an issue with the evaluation repository operations
 */
class EvaluationRepositoryError extends EvaluationError {
  /**
   * Create a new EvaluationRepositoryError
   * @param {string} message - Error message describing the repository operation failure
   * @param {Object} options - Additional error options
   * @param {Error} [options.cause] - The underlying error that caused this error
   * @param {Object} [options.metadata] - Additional metadata about the error
   */
  constructor(message = 'Failed to perform evaluation repository operation', options = {}) {
    super(message, 500);
    this.name = 'EvaluationRepositoryError';
    this.cause = options.cause || null;
    this.metadata = options.metadata || {};
  }
}

module.exports = {
  EvaluationError,
  EvaluationNotFoundError,
  EvaluationValidationError,
  EvaluationProcessingError,
  EvaluationRepositoryError,
};
