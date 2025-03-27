/**
 * Application Error Class
 * 
 * DDD-compliant error handling for the application
 * Placed in infrastructure layer as a cross-cutting concern
 */

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

module.exports = AppError; 