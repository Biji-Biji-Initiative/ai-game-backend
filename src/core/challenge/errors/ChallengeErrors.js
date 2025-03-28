/**
 * Challenge Domain Error Classes
 * 
 * Provides specific error types for the Challenge domain
 * following Domain-Driven Design principles.
 */

const AppError = require('../../infra/errors/AppError');

// Error codes for the Challenge domain
const CHALLENGE_ERROR_CODES = {
  NOT_FOUND: 'CHALLENGE_NOT_FOUND',
  GENERATION_FAILED: 'CHALLENGE_GENERATION_FAILED',
  INVALID_RESPONSE: 'CHALLENGE_INVALID_RESPONSE',
  VALIDATION_FAILED: 'CHALLENGE_VALIDATION_FAILED',
  PERSISTENCE_FAILED: 'CHALLENGE_PERSISTENCE_FAILED',
  INVALID_STATUS_TRANSITION: 'CHALLENGE_INVALID_STATUS_TRANSITION',
  INVALID_STATE: 'CHALLENGE_INVALID_STATE',
  DUPLICATE: 'CHALLENGE_DUPLICATE',
  TIMEOUT: 'CHALLENGE_TIMEOUT'
};

/**
 * Challenge Not Found Error
 * Thrown when attempting to access a challenge that doesn't exist
 */
class ChallengeNotFoundError extends AppError {
  constructor(message = 'Challenge not found', options = {}) {
    super(message, 404, {
      ...options,
      errorCode: CHALLENGE_ERROR_CODES.NOT_FOUND,
      metadata: {
        ...options.metadata,
        domain: 'challenge'
      }
    });
    this.name = 'ChallengeNotFoundError';
  }
}

/**
 * Challenge Generation Error
 * Thrown when there's an issue generating a new challenge
 */
class ChallengeGenerationError extends AppError {
  constructor(message = 'Failed to generate challenge', options = {}) {
    super(message, 500, {
      ...options,
      errorCode: CHALLENGE_ERROR_CODES.GENERATION_FAILED,
      metadata: {
        ...options.metadata,
        domain: 'challenge'
      }
    });
    this.name = 'ChallengeGenerationError';
  }
}

/**
 * Challenge Response Error
 * Thrown when there's an issue with processing a challenge response
 */
class ChallengeResponseError extends AppError {
  constructor(message = 'Failed to process challenge response', options = {}) {
    super(message, 400, {
      ...options,
      errorCode: CHALLENGE_ERROR_CODES.INVALID_RESPONSE,
      metadata: {
        ...options.metadata,
        domain: 'challenge'
      }
    });
    this.name = 'ChallengeResponseError';
  }
}

/**
 * Challenge Validation Error
 * Thrown when challenge data fails validation
 */
class ChallengeValidationError extends AppError {
  constructor(message = 'Invalid challenge data', options = {}) {
    super(message, 400, {
      ...options,
      errorCode: CHALLENGE_ERROR_CODES.VALIDATION_FAILED,
      metadata: {
        ...options.metadata,
        domain: 'challenge'
      }
    });
    this.name = 'ChallengeValidationError';
  }
}

/**
 * Challenge Persistence Error
 * Thrown when there's an issue saving or retrieving challenge data
 */
class ChallengePersistenceError extends AppError {
  constructor(message = 'Failed to save or retrieve challenge data', options = {}) {
    super(message, 500, {
      ...options,
      errorCode: CHALLENGE_ERROR_CODES.PERSISTENCE_FAILED,
      metadata: {
        ...options.metadata,
        domain: 'challenge'
      }
    });
    this.name = 'ChallengePersistenceError';
  }
}

/**
 * Challenge Invalid State Error
 * Thrown when a challenge is in an invalid state for an operation
 */
class ChallengeInvalidStateError extends AppError {
  constructor(message = 'Challenge is in an invalid state for this operation', options = {}) {
    super(message, 400, {
      ...options,
      errorCode: CHALLENGE_ERROR_CODES.INVALID_STATE,
      metadata: {
        ...options.metadata,
        domain: 'challenge'
      }
    });
    this.name = 'ChallengeInvalidStateError';
  }
}

/**
 * Invalid Challenge Status Transition Error
 * Thrown when attempting to transition a challenge to an invalid state
 */
class InvalidChallengeStatusTransitionError extends AppError {
  constructor(message = 'Invalid challenge status transition', options = {}) {
    super(message, 400, {
      ...options,
      errorCode: CHALLENGE_ERROR_CODES.INVALID_STATUS_TRANSITION,
      metadata: {
        ...options.metadata,
        domain: 'challenge'
      }
    });
    this.name = 'InvalidChallengeStatusTransitionError';
  }
}

/**
 * Challenge Duplicate Error
 * Thrown when attempting to create a duplicate challenge
 */
class ChallengeDuplicateError extends AppError {
  constructor(message = 'Challenge already exists', options = {}) {
    super(message, 409, {
      ...options,
      errorCode: CHALLENGE_ERROR_CODES.DUPLICATE,
      metadata: {
        ...options.metadata,
        domain: 'challenge'
      }
    });
    this.name = 'ChallengeDuplicateError';
  }
}

/**
 * Challenge Timeout Error
 * Thrown when a challenge operation times out
 */
class ChallengeTimeoutError extends AppError {
  constructor(message = 'Challenge operation timed out', options = {}) {
    super(message, 408, {
      ...options,
      errorCode: CHALLENGE_ERROR_CODES.TIMEOUT,
      metadata: {
        ...options.metadata,
        domain: 'challenge'
      }
    });
    this.name = 'ChallengeTimeoutError';
  }
}

module.exports = {
  CHALLENGE_ERROR_CODES,
  ChallengeNotFoundError,
  ChallengeGenerationError,
  ChallengeResponseError,
  ChallengeValidationError,
  ChallengePersistenceError,
  ChallengeInvalidStateError,
  InvalidChallengeStatusTransitionError,
  ChallengeDuplicateError,
  ChallengeTimeoutError
}; 