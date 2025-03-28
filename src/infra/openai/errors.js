/**
 * OpenAI API Errors
 * 
 * Custom error classes for OpenAI API interactions
 */

/**
 * Base error class for OpenAI API errors
 */
class OpenAIError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.context = options.context || {};
    this.cause = options.cause;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error for OpenAI API request failures
 */
class OpenAIRequestError extends OpenAIError {
  constructor(message, options = {}) {
    super(message, {
      statusCode: options.statusCode || 502,
      context: options.context,
      cause: options.cause
    });
  }
}

/**
 * Error for OpenAI API response parsing failures
 */
class OpenAIResponseError extends OpenAIError {
  constructor(message, options = {}) {
    super(message, {
      statusCode: options.statusCode || 500,
      context: options.context,
      cause: options.cause
    });
  }
}

/**
 * Error for OpenAI state management issues
 */
class OpenAIStateManagementError extends OpenAIError {
  constructor(message, context = {}) {
    super(message, {
      statusCode: 500,
      context
    });
  }
}

module.exports = {
  OpenAIError,
  OpenAIRequestError,
  OpenAIResponseError,
  OpenAIStateManagementError
}; 