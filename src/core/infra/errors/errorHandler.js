import AppError from "../../infra/errors/AppError.js";
import { logger } from "../../infra/logging/logger.js";
import config from "../../../config/config.js";
import { DomainErrorCodes } from "./DomainErrorCodes.js";
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
 * Global error handling middleware for Express
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} _next - Express next function (unused)
 * @returns {void}
 */
const errorHandler = (err, req, res, _next) => {
  // Determine HTTP status code based on error code or default to 500
  err.statusCode = err.statusCode || getStatusCodeForError(err.errorCode) || 500;
  err.status = err.status || 'error';
  
  // Add request ID to error for tracking
  err.requestId = req.id;
  
  // Add user context if available
  if (req.user) {
    err.userId = req.user.id;
    err.userEmail = req.user.email;
  }
  
  // Determine error severity based on status code
  const isServerError = err.statusCode >= 500;
  const logMethod = isServerError ? 'error' : 'warn';
  
  // Log the error with context
  logger[logMethod](`${err.message}`, {
    errorCode: err.errorCode,
    statusCode: err.statusCode,
    requestId: req.id,
    path: req.path,
    method: req.method,
    userId: err.userId || (req.user ? req.user.id : undefined),
    userEmail: err.userEmail || (req.user ? req.user.email : undefined),
    domain: err.metadata?.domain || 'unknown',
    metadata: err.metadata || {},
    causes: err.cause ? extractCauseChain(err) : undefined,
    stack: err.stack
  });
  
  // Send error response based on environment
  const isDevelopment = config.server.environment === 'development';
  res.status(err.statusCode).json(formatErrorResponse(err, isDevelopment));
};

/**
 * 404 Not Found handler for Express
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404, {
    errorCode: 'ROUTE_NOT_FOUND',
    metadata: {
      path: req.originalUrl
    }
  });
  next(error);
};

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
 * and providing a consistent error handling interface
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

export { errorHandler };
export { notFoundHandler };
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