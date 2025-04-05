/**
 * @fileoverview Authentication-related error definitions
 * Provides specialized error types for authentication and authorization
 */

import { AppError } from '../../infra/errors/errorHandler.js';

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends AppError {
  /**
   * Create a new AuthenticationError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Authentication failed', metadata = {}) {
    super(message, 401, metadata);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when a user doesn't have permission to access a resource
 */
export class AuthorizationError extends AppError {
  /**
   * Create a new AuthorizationError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'You do not have permission to access this resource', metadata = {}) {
    super(message, 403, metadata);
    this.name = 'AuthorizationError';
  }
}

/**
 * Error thrown when a token is invalid or expired
 */
export class TokenError extends AppError {
  /**
   * Create a new TokenError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Invalid or expired token', metadata = {}) {
    super(message, 401, metadata);
    this.name = 'TokenError';
  }
}

/**
 * Error thrown when a user is not found
 */
export class UserNotFoundError extends AppError {
  /**
   * Create a new UserNotFoundError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'User not found', metadata = {}) {
    super(message, 404, metadata);
    this.name = 'UserNotFoundError';
  }
}

/**
 * Error thrown when registration fails
 */
export class RegistrationError extends AppError {
  /**
   * Create a new RegistrationError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Registration failed', metadata = {}) {
    super(message, 400, metadata);
    this.name = 'RegistrationError';
  }
}

/**
 * Error thrown when an auth repository operation fails
 */
export class AuthRepositoryError extends AppError {
  /**
   * Create a new AuthRepositoryError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Auth repository operation failed', metadata = {}) {
    super(message, 500, metadata);
    this.name = 'AuthRepositoryError';
  }
}

/**
 * Create authentication error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {AuthenticationError} - New AuthenticationError instance
 */
export const createAuthenticationError = (message, metadata = {}) => {
  return new AuthenticationError(message, metadata);
};

/**
 * Create authorization error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {AuthorizationError} - New AuthorizationError instance
 */
export const createAuthorizationError = (message, metadata = {}) => {
  return new AuthorizationError(message, metadata);
};

/**
 * Create token error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {TokenError} - New TokenError instance
 */
export const createTokenError = (message, metadata = {}) => {
  return new TokenError(message, metadata);
};

/**
 * Create user not found error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {UserNotFoundError} - New UserNotFoundError instance
 */
export const createUserNotFoundError = (message, metadata = {}) => {
  return new UserNotFoundError(message, metadata);
};

/**
 * Create registration error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {RegistrationError} - New RegistrationError instance
 */
export const createRegistrationError = (message, metadata = {}) => {
  return new RegistrationError(message, metadata);
};

/**
 * Create auth repository error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {AuthRepositoryError} - New AuthRepositoryError instance
 */
export const createAuthRepositoryError = (message, metadata = {}) => {
  return new AuthRepositoryError(message, metadata);
};

export default {
  AuthenticationError,
  AuthorizationError,
  TokenError,
  UserNotFoundError,
  RegistrationError,
  AuthRepositoryError,
  createAuthenticationError,
  createAuthorizationError,
  createTokenError,
  createUserNotFoundError,
  createRegistrationError,
  createAuthRepositoryError
};
