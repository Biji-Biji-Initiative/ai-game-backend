/**
 * User Domain Error Classes
 * 
 * Provides specific error types for the User domain
 * following Domain-Driven Design principles.
 */

const AppError = require('../../infra/errors/AppError');

/**
 * Base class for User domain errors
 */
class UserError extends AppError {
  constructor(message = 'User operation failed', statusCode = 400) {
    super(message, statusCode);
    this.name = 'UserError';
  }
}

/**
 * User Not Found Error
 * Thrown when attempting to access a user that doesn't exist
 */
class UserNotFoundError extends UserError {
  constructor(identifier = '') {
    const message = identifier 
      ? `User not found: ${identifier}` 
      : 'User not found';
    super(message, 404);
    this.name = 'UserNotFoundError';
  }
}

/**
 * User Update Error
 * Thrown when there's an issue updating a user
 */
class UserUpdateError extends UserError {
  constructor(message = 'Failed to update user') {
    super(message, 500);
    this.name = 'UserUpdateError';
  }
}

/**
 * User Validation Error
 * Thrown when user data fails validation
 */
class UserValidationError extends UserError {
  constructor(message = 'Invalid user data') {
    super(message, 400);
    this.name = 'UserValidationError';
  }
}

/**
 * User Authentication Error
 * Thrown when there's an issue with user authentication
 */
class UserAuthenticationError extends UserError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'UserAuthenticationError';
  }
}

/**
 * User Authorization Error
 * Thrown when a user doesn't have permission for an operation
 */
class UserAuthorizationError extends UserError {
  constructor(message = 'Not authorized') {
    super(message, 403);
    this.name = 'UserAuthorizationError';
  }
}

/**
 * Focus Area Error
 * Thrown when there's an issue with user focus areas
 */
class FocusAreaError extends UserError {
  constructor(message = 'Focus area operation failed') {
    super(message, 400);
    this.name = 'FocusAreaError';
  }
}

module.exports = {
  UserError,
  UserNotFoundError,
  UserUpdateError,
  UserValidationError,
  UserAuthenticationError,
  UserAuthorizationError,
  FocusAreaError
}; 