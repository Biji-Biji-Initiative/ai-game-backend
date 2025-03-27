/**
 * Logger Utility
 * Provides consistent logging across the application
 */

// Simple logger implementation
const logger = {
  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} [data] - Additional data to log
   */
  debug: (message, data = {}) => {
    console.log(`${new Date().toISOString()} debug: ${message}`, data || '');
  },
  
  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} [data] - Additional data to log
   */
  info: (message, data = {}) => {
    console.log(`${new Date().toISOString()} info: ${message}`, data || '');
  },
  
  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} [data] - Additional data to log
   */
  warn: (message, data = {}) => {
    console.warn(`${new Date().toISOString()} warn: ${message}`, data || '');
  },
  
  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Object} [data] - Additional data to log
   */
  error: (message, data = {}) => {
    console.error(`${new Date().toISOString()} error: ${message}`, data || '');
  }
};

module.exports = {
  logger
}; 