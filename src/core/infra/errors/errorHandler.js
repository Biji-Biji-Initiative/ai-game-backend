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

module.exports = {
  errorHandler,
  notFoundHandler,
  formatErrorResponse
}; 