/**
 * Challenge Domain Error Classes
 * 
 * Provides specific error types for the Challenge domain
 * following Domain-Driven Design principles.
 */

const AppError = require('../../infra/errors/AppError');

/**
 * Challenge Not Found Error
 * Thrown when attempting to access a challenge that doesn't exist
 */
class ChallengeNotFoundError extends AppError {
  constructor(message = 'Challenge not found') {
    super(message, 404);
    this.name = 'ChallengeNotFoundError';
  }
}

/**
 * Challenge Generation Error
 * Thrown when there's an issue generating a new challenge
 */
class ChallengeGenerationError extends AppError {
  constructor(message = 'Failed to generate challenge') {
    super(message, 500);
    this.name = 'ChallengeGenerationError';
  }
}

/**
 * Challenge Response Error
 * Thrown when there's an issue with processing a challenge response
 */
class ChallengeResponseError extends AppError {
  constructor(message = 'Failed to process challenge response') {
    super(message, 400);
    this.name = 'ChallengeResponseError';
  }
}

/**
 * Challenge Validation Error
 * Thrown when challenge data fails validation
 */
class ChallengeValidationError extends AppError {
  constructor(message = 'Invalid challenge data') {
    super(message, 400);
    this.name = 'ChallengeValidationError';
  }
}

/**
 * Challenge Persistence Error
 * Thrown when there's an issue saving or retrieving challenge data
 */
class ChallengePersistenceError extends AppError {
  constructor(message = 'Failed to save or retrieve challenge data') {
    super(message, 500);
    this.name = 'ChallengePersistenceError';
  }
}

module.exports = {
  ChallengeNotFoundError,
  ChallengeGenerationError,
  ChallengeResponseError,
  ChallengeValidationError,
  ChallengePersistenceError
}; 