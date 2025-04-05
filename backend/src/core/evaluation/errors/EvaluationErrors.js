/**
 * @fileoverview Evaluation-related error definitions
 * Provides specialized error types for evaluation operations
 */

import { AppError } from '../../infra/errors/errorHandler.js';

/**
 * Error thrown when evaluation fails
 */
export class EvaluationError extends AppError {
  /**
   * Create a new EvaluationError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Evaluation failed', metadata = {}) {
    super(message, 400, metadata);
    this.name = 'EvaluationError';
  }
}

/**
 * Error thrown when evaluation is not found
 */
export class EvaluationNotFoundError extends AppError {
  /**
   * Create a new EvaluationNotFoundError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Evaluation not found', metadata = {}) {
    super(message, 404, metadata);
    this.name = 'EvaluationNotFoundError';
  }
}

/**
 * Error thrown when evaluation validation fails
 */
export class EvaluationValidationError extends AppError {
  /**
   * Create a new EvaluationValidationError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Evaluation validation failed', metadata = {}) {
    super(message, 400, metadata);
    this.name = 'EvaluationValidationError';
  }
}

/**
 * Error thrown when evaluation repository operation fails
 */
export class EvaluationRepositoryError extends AppError {
  /**
   * Create a new EvaluationRepositoryError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Evaluation repository operation failed', metadata = {}) {
    super(message, 500, metadata);
    this.name = 'EvaluationRepositoryError';
  }
}

/**
 * Error thrown when evaluation processing fails
 */
export class EvaluationProcessingError extends AppError {
  /**
   * Create a new EvaluationProcessingError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Evaluation processing failed', metadata = {}) {
    super(message, 500, metadata);
    this.name = 'EvaluationProcessingError';
  }
}

/**
 * Error thrown when evaluation criteria are invalid
 */
export class InvalidCriteriaError extends AppError {
  /**
   * Create a new InvalidCriteriaError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Invalid evaluation criteria', metadata = {}) {
    super(message, 400, metadata);
    this.name = 'InvalidCriteriaError';
  }
}

/**
 * Error thrown when evaluation submission is not found
 */
export class SubmissionNotFoundError extends AppError {
  /**
   * Create a new SubmissionNotFoundError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Evaluation submission not found', metadata = {}) {
    super(message, 404, metadata);
    this.name = 'SubmissionNotFoundError';
  }
}

/**
 * Error thrown when evaluation result is not found
 */
export class ResultNotFoundError extends AppError {
  /**
   * Create a new ResultNotFoundError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Evaluation result not found', metadata = {}) {
    super(message, 404, metadata);
    this.name = 'ResultNotFoundError';
  }
}

/**
 * Error thrown when evaluation scoring fails
 */
export class ScoringError extends AppError {
  /**
   * Create a new ScoringError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Evaluation scoring failed', metadata = {}) {
    super(message, 500, metadata);
    this.name = 'ScoringError';
  }
}

/**
 * Create evaluation error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {EvaluationError} - New EvaluationError instance
 */
export const createEvaluationError = (message, metadata = {}) => {
  return new EvaluationError(message, metadata);
};

/**
 * Create evaluation not found error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {EvaluationNotFoundError} - New EvaluationNotFoundError instance
 */
export const createEvaluationNotFoundError = (message, metadata = {}) => {
  return new EvaluationNotFoundError(message, metadata);
};

/**
 * Create evaluation validation error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {EvaluationValidationError} - New EvaluationValidationError instance
 */
export const createEvaluationValidationError = (message, metadata = {}) => {
  return new EvaluationValidationError(message, metadata);
};

/**
 * Create evaluation repository error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {EvaluationRepositoryError} - New EvaluationRepositoryError instance
 */
export const createEvaluationRepositoryError = (message, metadata = {}) => {
  return new EvaluationRepositoryError(message, metadata);
};

/**
 * Create evaluation processing error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {EvaluationProcessingError} - New EvaluationProcessingError instance
 */
export const createEvaluationProcessingError = (message, metadata = {}) => {
  return new EvaluationProcessingError(message, metadata);
};

/**
 * Create invalid criteria error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {InvalidCriteriaError} - New InvalidCriteriaError instance
 */
export const createInvalidCriteriaError = (message, metadata = {}) => {
  return new InvalidCriteriaError(message, metadata);
};

/**
 * Create submission not found error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {SubmissionNotFoundError} - New SubmissionNotFoundError instance
 */
export const createSubmissionNotFoundError = (message, metadata = {}) => {
  return new SubmissionNotFoundError(message, metadata);
};

/**
 * Create result not found error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {ResultNotFoundError} - New ResultNotFoundError instance
 */
export const createResultNotFoundError = (message, metadata = {}) => {
  return new ResultNotFoundError(message, metadata);
};

/**
 * Create scoring error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {ScoringError} - New ScoringError instance
 */
export const createScoringError = (message, metadata = {}) => {
  return new ScoringError(message, metadata);
};

export default {
  EvaluationError,
  EvaluationNotFoundError,
  EvaluationValidationError,
  EvaluationRepositoryError,
  EvaluationProcessingError,
  InvalidCriteriaError,
  SubmissionNotFoundError,
  ResultNotFoundError,
  ScoringError,
  createEvaluationError,
  createEvaluationNotFoundError,
  createEvaluationValidationError,
  createEvaluationRepositoryError,
  createEvaluationProcessingError,
  createInvalidCriteriaError,
  createSubmissionNotFoundError,
  createResultNotFoundError,
  createScoringError
};
