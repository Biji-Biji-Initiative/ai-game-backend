/**
 * Logger Module
 *
 * Implements a centralized logging system using Winston.
 * Provides consistent logging across the application with
 * formatted output, log levels, and structured metadata.
 */
const winston = require('winston');
const config = require('../../../config/config');
const { AsyncLocalStorage } = require('async_hooks');

// Create a storage for correlation IDs
const correlationIdStorage = new AsyncLocalStorage();

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
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create console transport with custom format
const consoleFormat = winston.format.printf(({ level, message, timestamp, correlationId, ...meta }) => {
  const correlationPart = correlationId ? `[${correlationId}]` : '';
  const namespacePart = meta.namespace ? `[${meta.namespace}]` : '';
  const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} ${correlationPart} ${namespacePart} [${level.toUpperCase()}]: ${message} ${metaString}`;
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
 * Get current correlation ID from context or explicit value
 * @param {string} [explicitCorrelationId] - Optional explicit correlation ID to use
 * @returns {string|undefined} Current correlation ID or undefined
 */
function getCorrelationId(explicitCorrelationId) {
  // If explicitly provided, use that
  if (explicitCorrelationId) {
    return explicitCorrelationId;
  }

  // Otherwise, try to get from AsyncLocalStorage
  const store = correlationIdStorage.getStore();
  return store?.correlationId;
}

/**
 * Base logger class
 */
class Logger {
  /**
   * Create a new logger instance
   * @param {string} namespace - Logger namespace
   * @param {Object} options - Logger options
   * @param {string} options.correlationId - Initial correlation ID
   */
  constructor(namespace, options = {}) {
    this.namespace = namespace || 'app';
    this.correlationId = options.correlationId;
  }

  /**
   * Create a child logger with a new namespace
   * @param {string} namespace - Child namespace
   * @param {Object} options - Logger options
   * @param {string} options.correlationId - Correlation ID for the child logger
   * @returns {Logger} New logger instance
   */
  child(namespace, options = {}) {
    return new Logger(`${this.namespace}:${namespace}`, {
      correlationId: options.correlationId || this.correlationId
    });
  }

  /**
   * Set the correlation ID for this logger instance
   * @param {string} correlationId - Correlation ID
   * @returns {Logger} This logger instance for chaining
   */
  withCorrelationId(correlationId) {
    this.correlationId = correlationId;
    return this;
  }

  /**
   * Log at error level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @param {string} meta.correlationId - Optional correlation ID to use for this log entry
   */
  error(message, meta = {}) {
    const correlationId = getCorrelationId(meta.correlationId || this.correlationId);
    winstonLogger.error(message, { 
      ...meta, 
      correlationId, 
      namespace: this.namespace
    });
  }

  /**
   * Log at warning level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @param {string} meta.correlationId - Optional correlation ID to use for this log entry
   */
  warn(message, meta = {}) {
    const correlationId = getCorrelationId(meta.correlationId || this.correlationId);
    winstonLogger.warn(message, { 
      ...meta, 
      correlationId, 
      namespace: this.namespace
    });
  }

  /**
   * Log at info level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @param {string} meta.correlationId - Optional correlation ID to use for this log entry
   */
  info(message, meta = {}) {
    const correlationId = getCorrelationId(meta.correlationId || this.correlationId);
    winstonLogger.info(message, { 
      ...meta, 
      correlationId, 
      namespace: this.namespace
    });
  }

  /**
   * Log at HTTP level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @param {string} meta.correlationId - Optional correlation ID to use for this log entry
   */
  http(message, meta = {}) {
    const correlationId = getCorrelationId(meta.correlationId || this.correlationId);
    winstonLogger.http(message, { 
      ...meta, 
      correlationId, 
      namespace: this.namespace
    });
  }

  /**
   * Log at debug level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @param {string} meta.correlationId - Optional correlation ID to use for this log entry
   */
  debug(message, meta = {}) {
    const correlationId = getCorrelationId(meta.correlationId || this.correlationId);
    winstonLogger.debug(message, { 
      ...meta, 
      correlationId, 
      namespace: this.namespace
    });
  }

  /**
   * Log at trace level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @param {string} meta.correlationId - Optional correlation ID to use for this log entry
   */
  trace(message, meta = {}) {
    const correlationId = getCorrelationId(meta.correlationId || this.correlationId);
    winstonLogger.log('trace', message, { 
      ...meta, 
      correlationId, 
      namespace: this.namespace
    });
  }
}

// Create and export the base application logger
const logger = new Logger('app');

/**
 * Middleware to set up correlation ID for each request
 */
const correlationIdMiddleware = (req, res, next) => {
  // Use an existing ID or generate a new one
  const correlationId = req.id;

  // Store in AsyncLocalStorage for this request context
  correlationIdStorage.run({ correlationId }, () => {
    next();
  });
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
      correlationId: req.id,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
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
    correlationId: req.id,
    statusCode: err.statusCode || 500
  });
  
  next(err);
};

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  correlationIdMiddleware,
  correlationIdStorage,
  getCorrelationId,
  Logger
}; 