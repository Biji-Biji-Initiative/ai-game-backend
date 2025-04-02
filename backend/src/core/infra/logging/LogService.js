/**
 * LogService provides centralized logging capabilities.
 * It acts as a wrapper around the individual loggers and provides a consistent API.
 */
class LogService {
  /**
   * Create a new LogService instance
   * @param {Object} options - Configuration options
   * @param {Function} options.getLogger - Function to retrieve a logger by name
   */
  constructor({ getLogger }) {
    this.getLogger = getLogger;
    this.defaultLogger = getLogger('app') || console;
    this.loggers = new Map();
  }

  /**
   * Get a logger for a specific namespace
   * @param {string} namespace - The namespace for the logger
   * @returns {Object} The logger instance
   */
  getLoggerFor(namespace) {
    if (!this.loggers.has(namespace)) {
      this.loggers.set(namespace, this.getLogger(namespace) || this.defaultLogger);
    }
    return this.loggers.get(namespace);
  }

  /**
   * Log at info level
   * @param {string} namespace - The namespace
   * @param {string} message - The message to log
   * @param {Object} [data] - Additional data to log
   */
  info(namespace, message, data = {}) {
    const logger = this.getLoggerFor(namespace);
    logger.info(data, message);
  }

  /**
   * Log at error level
   * @param {string} namespace - The namespace
   * @param {string} message - The message to log
   * @param {Object|Error} [error] - Error object or additional data to log
   */
  error(namespace, message, error = {}) {
    const logger = this.getLoggerFor(namespace);
    logger.error(error instanceof Error ? { err: error } : error, message);
  }

  /**
   * Log at warn level
   * @param {string} namespace - The namespace
   * @param {string} message - The message to log
   * @param {Object} [data] - Additional data to log
   */
  warn(namespace, message, data = {}) {
    const logger = this.getLoggerFor(namespace);
    logger.warn(data, message);
  }

  /**
   * Log at debug level
   * @param {string} namespace - The namespace
   * @param {string} message - The message to log
   * @param {Object} [data] - Additional data to log
   */
  debug(namespace, message, data = {}) {
    const logger = this.getLoggerFor(namespace);
    logger.debug(data, message);
  }
}

export default LogService; 