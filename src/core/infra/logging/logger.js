/**
 * Logger Module
 *
 * Implements a centralized logging system using Winston.
 * Provides consistent logging across the application with
 * formatted output, log levels, and structured metadata.
 */
const winston = require('winston');
const config = require('../../../config/config');

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5
};

// Configure Winston format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create console transport with custom format
const consoleFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaString}`;
});

// Set up transports
const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      consoleFormat
    ),
    level: config.logging.consoleLevel || 'info'
  }),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5
  }),
  new winston.transports.File({
    filename: 'logs/combined.log',
    level: config.logging.fileLevel || 'info',
    maxsize: 10485760, // 10MB
    maxFiles: 10
  })
];

// Create the Winston logger
const winstonLogger = winston.createLogger({
  levels: logLevels,
  format: logFormat,
  transports,
  exitOnError: false
});

/**
 * Base logger class
 */
class Logger {
  constructor(namespace) {
    this.namespace = namespace || 'app';
  }

  /**
   * Create a child logger with a new namespace
   * @param {string} namespace - Child namespace
   * @returns {Logger} New logger instance
   */
  child(namespace) {
    return new Logger(`${this.namespace}:${namespace}`);
  }

  /**
   * Log at error level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    winstonLogger.error(message, { ...meta, namespace: this.namespace });
  }

  /**
   * Log at warning level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    winstonLogger.warn(message, { ...meta, namespace: this.namespace });
  }

  /**
   * Log at info level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    winstonLogger.info(message, { ...meta, namespace: this.namespace });
  }

  /**
   * Log at HTTP level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  http(message, meta = {}) {
    winstonLogger.http(message, { ...meta, namespace: this.namespace });
  }

  /**
   * Log at debug level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    winstonLogger.debug(message, { ...meta, namespace: this.namespace });
  }

  /**
   * Log at trace level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  trace(message, meta = {}) {
    winstonLogger.log('trace', message, { ...meta, namespace: this.namespace });
  }
}

// Create and export the base application logger
const logger = new Logger('app');

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
  errorLogger,
  Logger
}; 