const logger = require('./logger');
const config = require('../config/config');

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  /**
   * Create a new application error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {object} metadata - Additional error metadata
   */
  constructor(message, statusCode, metadata = {}) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.metadata = metadata;

    Error.captureStackTrace(this, this.constructor);
  }
}

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
 * Global error handling middleware
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
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404);
  next(error);
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  formatErrorResponse
};
