import { logger } from "#app/core/infra/logging/logger.js";

/**
 * AppError class for standardized error handling
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, severity = 'ERROR', context = {}) {
    super(message);
    this.statusCode = statusCode;
    this.severity = severity; // 'WARNING', 'ERROR', 'FATAL'
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.isOperational = true; // Operational errors vs programming errors
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware for handling Express errors
 */
export const errorHandler = (err, req, res, next) => {
  // Set default values for the error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let severity = err.severity || 'ERROR';
  let errorType = err.name || 'Error';
  let isOperational = err.isOperational || false;
  
  // Determine error type and appropriate status code
  if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
    severity = 'FATAL';
    errorType = 'ConnectionError';
  } else if (err.code === 'EEXIST') {
    statusCode = 409;
    message = 'Resource already exists';
    severity = 'ERROR';
    errorType = 'ResourceConflictError';
  } else if (err.code === 'ENOENT') {
    statusCode = 404;
    message = 'Resource not found';
    severity = 'ERROR';
    errorType = 'ResourceNotFoundError';
  } else if (err.code === 'EMFILE') {
    statusCode = 503;
    message = 'Too many open files';
    severity = 'FATAL';
    errorType = 'SystemLimitError';
  } else if (err.code === 'EACCES' || err.code === 'EPERM') {
    statusCode = 403;
    message = 'Permission denied';
    severity = 'ERROR';
    errorType = 'PermissionError';
  }
  
  // Structured error log
  const errorLogData = {
    errorType,
    severity,
    statusCode,
    message: err.message,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || 'unauthenticated',
    requestId: req.id,
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    context: err.context || {},
    isOperational
  };
  
  // Log based on severity
  switch (severity) {
    case 'FATAL':
      logger.error('FATAL ERROR:', errorLogData);
      break;
    case 'ERROR':
      logger.error('ERROR:', errorLogData);
      break;
    case 'WARNING':
      logger.warn('WARNING:', errorLogData);
      break;
    default:
      logger.info('INFO:', errorLogData);
  }
  
  // Format error response according to OpenAPI specification
  const errorResponse = {
    status: 'error',
    message: process.env.NODE_ENV === 'production' && !isOperational 
      ? 'Something went wrong' 
      : message,
    code: statusCode.toString()
  };
  
  // Add additional debug information in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = {
      type: errorType,
      stack: err.stack,
      context: err.context,
      requestId: req.id
    };
  }
  
  res.status(statusCode).json(errorResponse);
};

/**
 * Handle 404 errors for undefined routes
 */
export const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Cannot find ${req.originalUrl} on this server`, 404, 'WARNING');
  next(err);
};

/**
 * Handle unhandled rejections and exceptions
 */
export const setupGlobalErrorHandlers = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('UNHANDLED PROMISE REJECTION', { 
      reason: reason.toString(),
      stack: reason.stack,
      promise 
    });
    
    // In production, we don't want to crash the server
    if (process.env.NODE_ENV === 'production') {
      logger.error('Unhandled rejection - not exiting in production');
    } else {
      // In development/test, crash to make errors obvious
      process.exit(1);
    }
  });
  
  process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION', { 
      message: err.message,
      stack: err.stack 
    });
    
    // Always exit on uncaught exceptions as the application is in an undefined state
    process.exit(1);
  });
};

export default {
  errorHandler,
  notFoundHandler,
  setupGlobalErrorHandlers,
  AppError
}; 