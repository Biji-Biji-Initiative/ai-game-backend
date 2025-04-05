/**
 * @fileoverview User-related error definitions
 * Provides specialized error types for user operations
 */

import { AppError } from '../../infra/errors/errorHandler.js';

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
 * Error thrown when user creation fails
 */
export class UserCreationError extends AppError {
  /**
   * Create a new UserCreationError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Failed to create user', metadata = {}) {
    super(message, 400, metadata);
    this.name = 'UserCreationError';
  }
}

/**
 * Error thrown when user update fails
 */
export class UserUpdateError extends AppError {
  /**
   * Create a new UserUpdateError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Failed to update user', metadata = {}) {
    super(message, 400, metadata);
    this.name = 'UserUpdateError';
  }
}

/**
 * Error thrown when user deletion fails
 */
export class UserDeletionError extends AppError {
  /**
   * Create a new UserDeletionError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Failed to delete user', metadata = {}) {
    super(message, 400, metadata);
    this.name = 'UserDeletionError';
  }
}

/**
 * Error thrown when user profile is invalid
 */
export class InvalidProfileError extends AppError {
  /**
   * Create a new InvalidProfileError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Invalid user profile', metadata = {}) {
    super(message, 400, metadata);
    this.name = 'InvalidProfileError';
  }
}

/**
 * Error thrown when user preferences are invalid
 */
export class InvalidPreferencesError extends AppError {
  /**
   * Create a new InvalidPreferencesError
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(message = 'Invalid user preferences', metadata = {}) {
    super(message, 400, metadata);
    this.name = 'InvalidPreferencesError';
  }
}

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
 * Create user creation error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {UserCreationError} - New UserCreationError instance
 */
export const createUserCreationError = (message, metadata = {}) => {
  return new UserCreationError(message, metadata);
};

/**
 * Create user update error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {UserUpdateError} - New UserUpdateError instance
 */
export const createUserUpdateError = (message, metadata = {}) => {
  return new UserUpdateError(message, metadata);
};

/**
 * Create user deletion error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {UserDeletionError} - New UserDeletionError instance
 */
export const createUserDeletionError = (message, metadata = {}) => {
  return new UserDeletionError(message, metadata);
};

/**
 * Create invalid profile error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {InvalidProfileError} - New InvalidProfileError instance
 */
export const createInvalidProfileError = (message, metadata = {}) => {
  return new InvalidProfileError(message, metadata);
};

/**
 * Create invalid preferences error
 * @param {string} message - Error message
 * @param {Object} [metadata] - Additional error metadata
 * @returns {InvalidPreferencesError} - New InvalidPreferencesError instance
 */
export const createInvalidPreferencesError = (message, metadata = {}) => {
  return new InvalidPreferencesError(message, metadata);
};

export default {
  UserNotFoundError,
  UserCreationError,
  UserUpdateError,
  UserDeletionError,
  InvalidProfileError,
  InvalidPreferencesError,
  createUserNotFoundError,
  createUserCreationError,
  createUserUpdateError,
  createUserDeletionError,
  createInvalidProfileError,
  createInvalidPreferencesError
};
