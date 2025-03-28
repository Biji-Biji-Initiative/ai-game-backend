/**
 * OpenAI API Errors
 * 
 * Custom error classes for OpenAI API interactions
 */

/**
 * Error types for OpenAI API interactions
 */

/**
 * Base Error class for OpenAI API errors
 */
class OpenAIError extends Error {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   * @param {Error} [options.cause] - The cause of this error
   * @param {Object} [options.context] - Additional context for the error
   * @param {string} [options.code] - Error code
   */
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.cause = options.cause;
    this.context = options.context || {};
    this.code = options.code;
  }
}

/**
 * Error thrown when there's an issue with the request to OpenAI API
 */
class OpenAIRequestError extends OpenAIError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   */
  constructor(message, options = {}) {
    super(message, options);
    this.statusCode = options.statusCode;
  }
}

/**
 * Error thrown when there's an issue with the response from OpenAI API
 */
class OpenAIResponseHandlingError extends OpenAIError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   */
  constructor(message, options = {}) {
    super(message, options);
  }
}

/**
 * Rate limit error - thrown when OpenAI rate limits are exceeded
 */
class OpenAIRateLimitError extends OpenAIRequestError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   */
  constructor(message = 'OpenAI API rate limit exceeded', options = {}) {
    super(message, { 
      ...options, 
      code: 'rate_limit_exceeded',
      statusCode: 429
    });
    this.retryAfter = options.retryAfter || null; // Seconds to wait before retrying
  }
}

/**
 * Context length error - thrown when input exceeds model's context window
 */
class OpenAIContextLengthError extends OpenAIRequestError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   */
  constructor(message = 'Input exceeds maximum context length', options = {}) {
    super(message, { 
      ...options, 
      code: 'context_length_exceeded',
      statusCode: 400
    });
    this.maxTokens = options.maxTokens || null;
  }
}

/**
 * Invalid request error - thrown for malformed requests
 */
class OpenAIInvalidRequestError extends OpenAIRequestError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   */
  constructor(message = 'Invalid request parameters', options = {}) {
    super(message, { 
      ...options, 
      code: 'invalid_request_error',
      statusCode: 400
    });
  }
}

/**
 * Authentication error - thrown for API key issues
 */
class OpenAIAuthenticationError extends OpenAIRequestError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   */
  constructor(message = 'Authentication failed', options = {}) {
    super(message, { 
      ...options, 
      code: 'authentication_error',
      statusCode: 401
    });
  }
}

/**
 * Permission error - thrown when API key lacks permissions
 */
class OpenAIPermissionError extends OpenAIRequestError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   */
  constructor(message = 'API key lacks required permissions', options = {}) {
    super(message, { 
      ...options, 
      code: 'permission_error',
      statusCode: 403
    });
  }
}

/**
 * Service unavailable error - thrown for OpenAI service issues
 */
class OpenAIServiceUnavailableError extends OpenAIRequestError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   */
  constructor(message = 'OpenAI service is currently unavailable', options = {}) {
    super(message, { 
      ...options, 
      code: 'service_unavailable',
      statusCode: 503
    });
  }
}

/**
 * Creates the appropriate error type based on error code or status
 * @param {string|Object} error - Error object or message from OpenAI API
 * @param {Object} [options] - Additional error options
 * @returns {OpenAIError} The appropriate error instance
 */
function createOpenAIError(error, options = {}) {
  const message = typeof error === 'string' ? error : error.message || 'Unknown OpenAI API error';
  const code = typeof error === 'object' ? error.code : null;
  const statusCode = typeof error === 'object' ? error.status || options.statusCode : options.statusCode;
  
  // Create options with code from error
  const errorOptions = {
    ...options,
    code: code || options.code,
    statusCode: statusCode,
    context: {
      ...(typeof error === 'object' ? error : {}),
      ...(options.context || {})
    }
  };
  
  // Map to specific error classes based on code or status
  switch (code) {
    case 'rate_limit_exceeded':
      return new OpenAIRateLimitError(message, errorOptions);
    case 'context_length_exceeded':
      return new OpenAIContextLengthError(message, errorOptions);
    case 'invalid_request_error':
      return new OpenAIInvalidRequestError(message, errorOptions);
    case 'authentication_error':
      return new OpenAIAuthenticationError(message, errorOptions);
    case 'permission_error':
      return new OpenAIPermissionError(message, errorOptions);
    default:
      // Handle by HTTP status code if available
      if (statusCode === 429) {
        return new OpenAIRateLimitError(message, errorOptions);
      } else if (statusCode === 401) {
        return new OpenAIAuthenticationError(message, errorOptions);
      } else if (statusCode === 403) {
        return new OpenAIPermissionError(message, errorOptions);
      } else if (statusCode === 503 || statusCode === 502) {
        return new OpenAIServiceUnavailableError(message, errorOptions);
      }
      
      // Default to general request error
      return new OpenAIRequestError(message, errorOptions);
  }
}

module.exports = {
  OpenAIError,
  OpenAIRequestError,
  OpenAIResponseHandlingError,
  OpenAIRateLimitError,
  OpenAIContextLengthError,
  OpenAIInvalidRequestError,
  OpenAIAuthenticationError,
  OpenAIPermissionError,
  OpenAIServiceUnavailableError,
  createOpenAIError
}; 