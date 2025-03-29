'use strict';

/**
 * Adaptive Domain Error Classes
 *
 * Provides specific error types for the Adaptive domain
 * following Domain-Driven Design principles.
 */

const AppError = require('../../../core/infra/errors/AppError');

/**
 * Base class for Adaptive domain errors
 */
class AdaptiveError extends AppError {
  /**
   *
   */
  /**
   * Method constructor
   */
  constructor(message = 'Adaptive operation failed', statusCode = 400) {
    super(message, statusCode);
    this.name = 'AdaptiveError';
  }
}

/**
 * Adaptive Not Found Error
 * Thrown when attempting to access a adaptive that doesn't exist
 */
class AdaptiveNotFoundError extends AdaptiveError {
  /**
   *
   */
  /**
   * Method constructor
   */
  constructor(identifier = '') {
    const message = identifier ? `Adaptive not found: ${identifier}` : 'Adaptive not found';
    super(message, 404);
    this.name = 'AdaptiveNotFoundError';
  }
}

/**
 * Adaptive Validation Error
 * Thrown when adaptive data fails validation
 */
class AdaptiveValidationError extends AdaptiveError {
  /**
   *
   */
  /**
   * Method constructor
   */
  constructor(message = 'Invalid adaptive data') {
    super(message, 400);
    this.name = 'AdaptiveValidationError';
  }
}

/**
 * Adaptive Processing Error
 * Thrown when there's an issue processing a adaptive
 */
class AdaptiveProcessingError extends AdaptiveError {
  /**
   *
   */
  /**
   * Method constructor
   */
  constructor(message = 'Failed to process adaptive') {
    super(message, 500);
    this.name = 'AdaptiveProcessingError';
  }
}

/**
 * Adaptive Repository Error
 * Thrown when there's an issue with the adaptive repository operations
 */
class AdaptiveRepositoryError extends AdaptiveError {
  /**
   *
   */
  /**
   * Method constructor
   */
  constructor(message = 'Failed to perform adaptive repository operation', options = {}) {
    super(message, 500);
    this.name = 'AdaptiveRepositoryError';
    this.cause = options.cause || null;
    this.metadata = options.metadata || {};
  }
}

module.exports = {
  AdaptiveError,
  AdaptiveNotFoundError,
  AdaptiveValidationError,
  AdaptiveProcessingError,
  AdaptiveRepositoryError,
};
