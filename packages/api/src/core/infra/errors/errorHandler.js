import AppError from "../../infra/errors/AppError.js";
import { logger } from "../../infra/logging/logger.js";
import config from "../../../config/config.js";
import { DomainErrorCodes } from "./DomainErrorCodes.js";
import { StatusCodes } from 'http-status-codes';
const UserErrorCodes = DomainErrorCodes.User
'use strict';

// Map domain error codes to HTTP status codes
const errorCodeToStatusMap = {
  // Not found errors - 404
  '_NOT_FOUND': 404,

  // Validation errors - 400
  '_VALIDATION': 400,

  // Processing/Domain errors - 500
  '_PROCESSING': 500,
  '_GENERATION': 500,

  // Repository/Database errors - 500
  '_REPOSITORY': 500,
  '_PERSISTENCE': 500,

  // Authentication errors - 401
  'AUTH_INVALID_CREDENTIALS': 401,
  'AUTH_EXPIRED_TOKEN': 401,
  'AUTH_INVALID_TOKEN': 401,
  'USER_AUTH_FAILED': 401,

  // Authorization errors - 403
  'ACCESS_DENIED': 403,
  'INSUFFICIENT_PERMISSIONS': 403,
  'AUTH_ACCESS_DENIED': 403,
  'USER_ACCESS_DENIED': 403,
  'FOCUS_ACCESS_DENIED': 403,

  // Conflict errors - 409
  'EMAIL_IN_USE': 409,

  // Rate limiting - 429
  'RATE_LIMIT': 429
};

/**
 * Maps domain error code to HTTP status code
 * @param {string} errorCode - Domain-specific error code
 * @returns {number} HTTP status code
 */
const getStatusCodeForError = (errorCode) => {
  if (!errorCode) return 500;

  // Check for exact match
  for (const [pattern, statusCode] of Object.entries(errorCodeToStatusMap)) {
    if (errorCode === pattern) {
      return statusCode;
    }
  }

  // Check for pattern match
  for (const [pattern, statusCode] of Object.entries(errorCodeToStatusMap)) {
    if (errorCode.includes(pattern)) {
      return statusCode;
    }
  }

  // Default to 500 for unknown error types
  return 500;
};

/**
 * Extract cause chain from error
 * @param {Error} err - The error object
 * @returns {Array} Array of error causes
 */
const extractCauseChain = err => {
  const causes = [];
  let currentCause = err.cause;
  while (currentCause) {
    causes.push({
      message: currentCause.message,
      name: currentCause.name,
      ...(currentCause.code && {
        code: currentCause.code
      }),
      ...(currentCause.errorCode && {
        errorCode: currentCause.errorCode
      })
    });
    currentCause = currentCause.cause;
  }
  return causes;
};

/**
 * Error response formatter - formats error response for API clients
 * @param {Error} err - The error object to format
 * @param {boolean} includeDetails - Whether to include detailed error information
 * @returns {Object} Formatted error response object
 */
const formatErrorResponse = (err, includeDetails = false) => {
  const errorCode = err.errorCode || 'UNKNOWN_ERROR';

  const response = {
    success: false,
    status: err.status || 'error',
    message: err.isOperational ? err.message : 'Something went wrong!',
    errorCode: errorCode,
    requestId: err.requestId
  };

  if (includeDetails) {
    response.error = {
      name: err.name,
      message: err.message,
      stack: err.stack
    };
    if (err.cause) {
      response.causes = extractCauseChain(err);
    }
    if (err.metadata) {
      response.metadata = err.metadata;
    }
  }

  return response;
};

/**
 * Maps error types to HTTP status codes
 * @param {Error} err - The error object
 * @returns {number} HTTP status code
 */
function getStatusCode(err) {
    if (err.statusCode) return err.statusCode;

    // Map error types to status codes
    switch (err.name) {
        case 'ValidationError':
            return StatusCodes.BAD_REQUEST;
        case 'AuthenticationError':
            return StatusCodes.UNAUTHORIZED;
        case 'ForbiddenError':
            return StatusCodes.FORBIDDEN;
        case 'NotFoundError':
            return StatusCodes.NOT_FOUND;
        case 'ConflictError':
            return StatusCodes.CONFLICT;
        case 'RateLimitError':
            return StatusCodes.TOO_MANY_REQUESTS;
        default:
            return StatusCodes.INTERNAL_SERVER_ERROR;
    }
}

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next function
 */
export function errorHandler(err, req, res, next) {
    // Get request ID for tracking
    const requestId = req.id || req.headers['x-request-id'];

    // Extract error details
    const statusCode = getStatusCode(err);
    const isProduction = process.env.NODE_ENV === 'production';

    // Log error with request details for debugging
    const logger = req.logger || console;
    logger.error('Request error:', {
        error: err.message,
        stack: err.stack,
        statusCode,
        method: req.method,
        url: req.originalUrl,
        requestId,
        userId: req.user?.id
    });

    // Prepare error response
    const errorResponse = {
        error: isProduction
            ? getGenericErrorMessage(statusCode)
            : err.message || 'Unknown error',
        status: statusCode,
        requestId
    };

    // Add debugging information in non-production environments
    if (!isProduction) {
        errorResponse.stack = err.stack;
        errorResponse.details = err.details || err.errors;
        errorResponse.code = err.code;
        errorResponse.name = err.name;
        errorResponse.environment = process.env.NODE_ENV;
    }

    // Send error response
    res.status(statusCode).json(errorResponse);
}

/**
 * Handler for 404 errors
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export function notFoundHandler(req, res) {
    const requestId = req.id || req.headers['x-request-id'];
    const isProduction = process.env.NODE_ENV === 'production';

    // Log 404 errors for monitoring
    const logger = req.logger || console;
    logger.warn('Not found:', {
        method: req.method,
        url: req.originalUrl,
        requestId,
        userId: req.user?.id
    });

    // Prepare 404 response
    const errorResponse = {
        error: 'Not Found',
        message: isProduction
            ? 'The requested resource could not be found'
            : `Route ${req.method} ${req.originalUrl} not found`,
        status: StatusCodes.NOT_FOUND,
        requestId
    };

    // Add debugging info for non-production
    if (!isProduction) {
        errorResponse.environment = process.env.NODE_ENV;
        errorResponse.params = req.params;
        errorResponse.query = req.query;
    }

    res.status(StatusCodes.NOT_FOUND).json(errorResponse);
}

/**
 * Get generic error message for production environments
 * @param {number} statusCode - HTTP status code
 * @returns {string} Generic error message
 */
function getGenericErrorMessage(statusCode) {
    switch (statusCode) {
        case StatusCodes.BAD_REQUEST:
            return 'Invalid request parameters';
        case StatusCodes.UNAUTHORIZED:
            return 'Authentication required';
        case StatusCodes.FORBIDDEN:
            return 'Access denied';
        case StatusCodes.NOT_FOUND:
            return 'Resource not found';
        case StatusCodes.CONFLICT:
            return 'Request conflicts with current state';
        case StatusCodes.TOO_MANY_REQUESTS:
            return 'Too many requests';
        case StatusCodes.INTERNAL_SERVER_ERROR:
        default:
            return 'Internal server error';
    }
}

/**
 * Format error response based on environment
 * @param {Error} err - The error object
 * @param {Object} req - The request object
 * @returns {Object} Formatted error response
 */
const formatError = (err, req) => {
  // Start with basic error info
  const errorResponse = {
    status: err.status || 'error',
    message: err.message || 'Something went wrong',
    requestId: req.id,
    errorCode: err.errorCode || 'UNKNOWN_ERROR'
  };

  // If we have a domain, add domain-specific data
  if (err.metadata && err.metadata.domain) {
    errorResponse.domain = err.metadata.domain;
  }

  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.metadata = err.metadata;
  }

  return errorResponse;
};

/**
 * Error Handler Class
 *
 * Central error handling utility for transforming errors
 * and providing a consistent error interface
 */
class ErrorHandler {
  /**
   * Create a new ErrorHandler instance
   */
  constructor() {
    this.formatErrorResponse = formatErrorResponse;
    this.formatError = formatError;
    this.domainErrorCodes = DomainErrorCodes;
  }

  /**
   * Handle error for Express middleware
   * @param {Error} err - Error to handle
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   * @returns {void}
   */
  handleError(err, req, res, next) {
    return errorHandler(err, req, res, next);
  }

  /**
   * Handle 404 Not Found errors
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   * @returns {void}
   */
  handleNotFound(req, res, next) {
    return notFoundHandler(req, res, next);
  }

  /**
   * Get HTTP status code for an error code
   * @param {string} errorCode - Domain-specific error code
   * @returns {number} HTTP status code
   */
  getStatusCode(errorCode) {
    return getStatusCodeForError(errorCode);
  }
}

export { formatErrorResponse };
export { formatError };
export { DomainErrorCodes };
export { getStatusCodeForError };
export { AppError };
export { ErrorHandler };

export default {
  errorHandler,
  notFoundHandler,
  formatErrorResponse,
  formatError,
  DomainErrorCodes,
  getStatusCodeForError,
  AppError,
  ErrorHandler
};
