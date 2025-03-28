/**
 * Error Handling Infrastructure
 * 
 * Provides centralized error handling for the application
 * Placed in infrastructure layer as a cross-cutting concern
 */

const AppError = require('./AppError');
const { logger } = require('../logging/logger');
const config = require('../../../config/config');

/**
 * Error response formatter - formats error response for API clients
 */
const formatErrorResponse = (err, includeDetails = false) => {
  const response = {
    status: err.status || 'error',
    message: err.isOperational ? err.message : 'Something went wrong!',
    errorCode: err.errorCode,
    requestId: err.requestId
  };

  if (includeDetails) {
    response.error = err;
    response.stack = err.stack;
    if (err.metadata) response.metadata = err.metadata;
  }

  return response;
};

/**
 * Global error handling middleware for Express
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  err.requestId = req.id;

  // Log the error
  logger.error(`${err.message}`, {
    stack: err.stack,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    metadata: err.metadata || {}
  });

  // Send error response based on environment
  const isDevelopment = config.server.environment === 'development';
  res.status(err.statusCode).json(formatErrorResponse(err, isDevelopment));
};

/**
 * 404 Not Found handler for Express
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Format error response based on environment
 * @param {Error} err - The error object
 * @param {Request} req - The request object
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
  constructor() {
    this.formatErrorResponse = formatErrorResponse;
    this.formatError = formatError;
  }

  /**
   * Handle error for Express middleware
   * @param {Error} err - Error to handle
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {Function} next - Express next function
   */
  handleError(err, req, res, next) {
    return errorHandler(err, req, res, next);
  }

  /**
   * Handle 404 Not Found errors
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {Function} next - Express next function
   */
  handleNotFound(req, res, next) {
    return notFoundHandler(req, res, next);
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  formatErrorResponse,
  formatError,
  AppError,
  ErrorHandler
}; 