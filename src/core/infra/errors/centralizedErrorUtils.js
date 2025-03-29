'use strict';

/**
 * Centralized Error Handling Utilities
 * 
 * Provides a single source of truth for applying error handling to methods
 * across all domains. This replaces the domain-specific errorHandlingUtil.js files.
 */

const {
  withRepositoryErrorHandling,
  withServiceErrorHandling,
  withControllerErrorHandling,
  createErrorMapper,
  handleServiceError,
} = require('./errorStandardization');

/**
 * Apply repository error handling to a method
 * @param {Object} instance - Repository instance
 * @param {string} methodName - Method name
 * @param {string} domainName - Domain name (e.g., 'challenge', 'user')
 * @param {Function} errorMapper - Error mapper function
 * @returns {Function} Method with error handling applied
 */
function applyRepositoryErrorHandling(instance, methodName, domainName, errorMapper) {
  return withRepositoryErrorHandling(instance[methodName].bind(instance), {
    methodName,
    domainName,
    logger: instance.logger,
    errorMapper,
  });
}

/**
 * Apply service error handling to a method
 * @param {Object} instance - Service instance
 * @param {string} methodName - Method name
 * @param {string} domainName - Domain name (e.g., 'challenge', 'user')
 * @param {Function} errorMapper - Error mapper function
 * @returns {Function} Method with error handling applied
 */
function applyServiceErrorHandling(instance, methodName, domainName, errorMapper) {
  return withServiceErrorHandling(instance[methodName].bind(instance), {
    methodName,
    domainName,
    logger: instance.logger,
    errorMapper,
  });
}

/**
 * Apply controller error handling to a method
 * @param {Object} instance - Controller instance
 * @param {string} methodName - Method name
 * @param {string} domainName - Domain name (e.g., 'challenge', 'user')
 * @param {Array} errorMappings - Array of error mappings to HTTP status codes
 * @returns {Function} Method with error handling applied
 */
function applyControllerErrorHandling(instance, methodName, domainName, errorMappings) {
  return withControllerErrorHandling(instance[methodName].bind(instance), {
    methodName,
    domainName,
    logger: instance.logger,
    errorMappings,
  });
}

module.exports = {
  applyRepositoryErrorHandling,
  applyServiceErrorHandling,
  applyControllerErrorHandling,
  createErrorMapper,
  handleServiceError,
}; 