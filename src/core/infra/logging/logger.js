/**
 * Logger Infrastructure
 * 
 * Provides centralized logging for the application
 * Placed in infrastructure layer as a cross-cutting concern
 */

// Simple logger implementation that could be extended to use a proper logging library
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

/**
 * Express middleware for logging requests
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log when the request completes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      requestId: req.id,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    };
    
    if (res.statusCode >= 400) {
      logger.warn(`HTTP ${req.method} ${req.path} ${res.statusCode}`, logData);
    } else {
      logger.info(`HTTP ${req.method} ${req.path} ${res.statusCode}`, logData);
    }
  });
  
  next();
};

/**
 * Express middleware for logging errors
 */
const errorLogger = (err, req, res, next) => {
  logger.error(`Error processing ${req.method} ${req.path}`, {
    error: err.message,
    stack: err.stack,
    requestId: req.id
  });
  
  next(err);
};

module.exports = {
  logger,
  requestLogger,
  errorLogger
}; 