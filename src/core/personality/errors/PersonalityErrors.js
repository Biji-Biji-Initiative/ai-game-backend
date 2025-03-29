'use strict';

/**
 * Personality Domain Error Classes
 *
 * Provides specific error types for the Personality domain
 * following Domain-Driven Design principles.
 */

const AppError = require('../../../core/infra/errors/AppError');

/**
 * Base class for Personality domain errors
 */
class PersonalityError extends AppError {
  /**
   * Create a new PersonalityError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message = 'Personality operation failed', statusCode = 400) {
    super(message, statusCode);
    this.name = 'PersonalityError';
  }
}

/**
 * Personality Not Found Error
 * Thrown when attempting to access a personality that doesn't exist
 */
class PersonalityNotFoundError extends PersonalityError {
  /**
   * Create a new PersonalityNotFoundError
   * @param {string} identifier - Personality identifier that wasn't found
   */
  constructor(identifier = '') {
    const message = identifier ? `Personality not found: ${identifier}` : 'Personality not found';
    super(message, 404);
    this.name = 'PersonalityNotFoundError';
  }
}

/**
 * Personality Validation Error
 * Thrown when personality data fails validation
 */
class PersonalityValidationError extends PersonalityError {
  /**
   * Create a new PersonalityValidationError
   * @param {string} message - Error message describing the validation failure
   */
  constructor(message = 'Invalid personality data') {
    super(message, 400);
    this.name = 'PersonalityValidationError';
  }
}

/**
 * Personality Processing Error
 * Thrown when there's an issue processing a personality
 */
class PersonalityProcessingError extends PersonalityError {
  /**
   * Create a new PersonalityProcessingError
   * @param {string} message - Error message describing the processing failure
   */
  constructor(message = 'Failed to process personality') {
    super(message, 500);
    this.name = 'PersonalityProcessingError';
  }
}

/**
 * Personality Repository Error
 * Thrown when there's an issue with the personality repository operations
 */
class PersonalityRepositoryError extends PersonalityError {
  /**
   * Create a new PersonalityRepositoryError
   * @param {string} message - Error message describing the repository operation failure
   * @param {Object} options - Additional error options
   * @param {Error} [options.cause] - The underlying error that caused this error
   * @param {Object} [options.metadata] - Additional metadata about the error
   */
  constructor(message = 'Failed to perform personality repository operation', options = {}) {
    super(message, 500);
    this.name = 'PersonalityRepositoryError';
    this.cause = options.cause || null;
    this.metadata = options.metadata || {};
  }
}

module.exports = {
  PersonalityError,
  PersonalityNotFoundError,
  PersonalityValidationError,
  PersonalityProcessingError,
  PersonalityRepositoryError
};
