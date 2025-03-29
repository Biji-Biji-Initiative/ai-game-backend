/**
 * Base Service class that other services can extend
 * Provides common functionality for services
 */
class BaseService {
  /**
   * Constructor
   * @param {Object} dependencies - Service dependencies
   */
  constructor(dependencies = {}) {
    this.dependencies = dependencies;
    this.logger = dependencies.logger || console;
  }

  /**
   * Initialize the service
   * @returns {Promise<void>}
   */
  async initialize() {
    // Base implementation - can be overridden by subclasses
    return Promise.resolve();
  }

  /**
   * Validate input against a schema
   * @param {Object} input - Input to validate
   * @param {Object} schema - Validation schema
   * @returns {boolean} - Validation result
   */
  validate(input, schema) {
    // Simple validation implementation
    return true;
  }

  /**
   * Log information
   * @param {string} message - Message to log
   * @param {Object} data - Optional data to log
   */
  logInfo(message, data) {
    this.logger.info(message, data);
  }

  /**
   * Log error
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  logError(message, error) {
    this.logger.error(message, error);
  }
}

module.exports = BaseService;
