/**
 * Personality Domain Error Classes
 * 
 * Provides specific error types for the Personality domain
 * following Domain-Driven Design principles.
 */

const AppError = require('../../infra/errors/AppError');

/**
 * Base class for Personality domain errors
 */
class PersonalityError extends AppError {
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
  constructor(identifier = '') {
    const message = identifier 
      ? `Personality not found: ${identifier}` 
      : 'Personality not found';
    super(message, 404);
    this.name = 'PersonalityNotFoundError';
  }
}

/**
 * Personality Update Error
 * Thrown when there's an issue updating a personality
 */
class PersonalityUpdateError extends PersonalityError {
  constructor(message = 'Failed to update personality') {
    super(message, 500);
    this.name = 'PersonalityUpdateError';
  }
}

/**
 * Personality Validation Error
 * Thrown when personality data fails validation
 */
class PersonalityValidationError extends PersonalityError {
  constructor(message = 'Invalid personality data') {
    super(message, 400);
    this.name = 'PersonalityValidationError';
  }
}

/**
 * Trait Analysis Error
 * Thrown when there's an issue with personality trait analysis
 */
class TraitAnalysisError extends PersonalityError {
  constructor(message = 'Failed to analyze traits') {
    super(message, 500);
    this.name = 'TraitAnalysisError';
  }
}

/**
 * AI Attitude Error
 * Thrown when there's an issue with AI attitude assessment
 */
class AIAttitudeError extends PersonalityError {
  constructor(message = 'AI attitude operation failed') {
    super(message, 400);
    this.name = 'AIAttitudeError';
  }
}

module.exports = {
  PersonalityError,
  PersonalityNotFoundError,
  PersonalityUpdateError,
  PersonalityValidationError,
  TraitAnalysisError,
  AIAttitudeError
}; 