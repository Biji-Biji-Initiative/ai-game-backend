'use strict';

/**
 * API Response Formatter
 *
 * Standardizes API responses across all controllers.
 * Located in the infrastructure layer as a cross-cutting concern.
 */

/**
 * Format a successful response
 * @param {Object} data - The data to include in the response
 * @param {string} message - Optional message (defaults to 'Success')
 * @param {number} statusCode - HTTP status code (defaults to 200)
 * @returns {Object} Formatted response object
 */
const formatSuccess = (data, message = 'Success', statusCode = 200) => {
  return {
    status: 'success',
    message,
    statusCode,
    data,
  };
};

/**
 * Format a paginated response
 * @param {Array} data - Array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Formatted paginated response
 */
const formatPaginated = (data, page, limit, total) => {
  return {
    status: 'success',
    message: 'Success',
    statusCode: 200,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Express middleware to add response formatting methods to res object
 */
const responseFormatterMiddleware = (req, res, next) => {
  // Add success response method
  res.success = (data, message, statusCode = 200) => {
    return res.status(statusCode).json(formatSuccess(data, message, statusCode));
  };

  // Add paginated response method
  res.paginated = (data, page, limit, total) => {
    return res.status(200).json(formatPaginated(data, page, limit, total));
  };

  next();
};

module.exports = {
  formatSuccess,
  formatPaginated,
  responseFormatterMiddleware,
};
