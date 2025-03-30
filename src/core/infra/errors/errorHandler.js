import AppError from "./AppError.js";
import { logger } from "../logging/logger.js";
import config from "../../../config/config.js";
'use strict';

// Standard error codes for API responses
const StandardErrorCodes = {
  // General errors (1xxx)
  UNKNOWN_ERROR: 'ERR_1000',
  VALIDATION_ERROR: 'ERR_1001',
  NOT_FOUND: 'ERR_1002',
  UNAUTHORIZED: 'ERR_1003',
  FORBIDDEN: 'ERR_1004',
  BAD_REQUEST: 'ERR_1005',
  CONFLICT: 'ERR_1006',
  TIMEOUT: 'ERR_1007',
  TOO_MANY_REQUESTS: 'ERR_1008',
  // Infrastructure errors (2xxx)
  DATABASE_ERROR: 'ERR_2000',
  NETWORK_ERROR: 'ERR_2001',
  EXTERNAL_SERVICE_ERROR: 'ERR_2002',
  DEPENDENCY_ERROR: 'ERR_2003',
  CONFIGURATION_ERROR: 'ERR_2004',
  // Domain-specific errors (3xxx)
  DOMAIN_ERROR: 'ERR_3000',
  BUSINESS_RULE_VIOLATION: 'ERR_3001',
  INVALID_STATE_TRANSITION: 'ERR_3002',
  // Integration errors (4xxx)
  API_ERROR: 'ERR_4000',
  OPENAI_ERROR: 'ERR_4001',
  AUTH_SERVICE_ERROR: 'ERR_4002',
  // User interaction errors (5xxx)
  INPUT_ERROR: 'ERR_5000',
  RESOURCE_LIMIT_EXCEEDED: 'ERR_5001',
  RATE_LIMITED: 'ERR_5002'
};
/**
 * Maps domain error types to standard error codes
 * @param {Error} err - The error object
 * @returns {string} Standard error code
 */
const mapErrorToStandardCode = err => {
  // If error already has an errorCode, use it
  if (err.errorCode) {
    return err.errorCode;
  }
  // Map based on error status code
  if (err.statusCode) {
    switch (err.statusCode) {
      case 400:
        return StandardErrorCodes.BAD_REQUEST;
      case 401:
        return StandardErrorCodes.UNAUTHORIZED;
      case 403:
        return StandardErrorCodes.FORBIDDEN;
      case 404:
        return StandardErrorCodes.NOT_FOUND;
      case 408:
        return StandardErrorCodes.TIMEOUT;
      case 409:
        return StandardErrorCodes.CONFLICT;
      case 429:
        return StandardErrorCodes.TOO_MANY_REQUESTS;
    }
  }
  // Map based on error name/type
  if (err.name) {
    if (err.name.includes('Validation')) {
      return StandardErrorCodes.VALIDATION_ERROR;
    }
    if (err.name.includes('NotFound')) {
      return StandardErrorCodes.NOT_FOUND;
    }
    if (err.name.includes('Unauthorized')) {
      return StandardErrorCodes.UNAUTHORIZED;
    }
    if (err.name.includes('Forbidden')) {
      return StandardErrorCodes.FORBIDDEN;
    }
    if (err.name.includes('Timeout')) {
      return StandardErrorCodes.TIMEOUT;
    }
    if (err.name.includes('Duplicate') || err.name.includes('Conflict')) {
      return StandardErrorCodes.CONFLICT;
    }
  }
  // Default to unknown error
  return StandardErrorCodes.UNKNOWN_ERROR;
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
  // Get a standard error code if not provided
  const errorCode = err.errorCode || mapErrorToStandardCode(err);
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
  // Set default status code and error status if not provided
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  // Add request ID to error for tracking
  err.requestId = req.id;
  // Add user context if available
  if (req.user) {
    err.userId = req.user.id;
    err.userEmail = req.user.email;
  }
  // Try to apply a standard error code if none exists
  if (!err.errorCode) {
    err.errorCode = mapErrorToStandardCode(err);
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
    errorCode: StandardErrorCodes.NOT_FOUND,
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
    requestId: req.id
  };
  // If we have a domain, add domain-specific data
  if (err.metadata && err.metadata.domain) {
    errorResponse.domain = err.metadata.domain;
    errorResponse.errorType = err.metadata.errorType || 'UNKNOWN_ERROR';
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
    this.standardErrorCodes = StandardErrorCodes;
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
   * Map an error to a standard error code
   * @param {Error} err - Error to map
   * @returns {string} Standard error code
   */
  getStandardErrorCode(err) {
    return mapErrorToStandardCode(err);
  }
}
export { errorHandler };
export { notFoundHandler };
export { formatErrorResponse };
export { formatError };
export { StandardErrorCodes };
export { mapErrorToStandardCode };
export { AppError };
export { ErrorHandler };
export default {
  errorHandler,
  notFoundHandler,
  formatErrorResponse,
  formatError,
  StandardErrorCodes,
  mapErrorToStandardCode,
  AppError,
  ErrorHandler
};