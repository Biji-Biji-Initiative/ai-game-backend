/**
 * Advanced Logger Implementation using Winston
 * Provides structured logging with multiple levels and transports
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format (more readable for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

// Create Winston logger with multiple transports
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'responses-api-fight-club' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
  ],
  exitOnError: false
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

/**
 * Create a backward-compatible logger interface
 * This maintains compatibility with the existing codebase
 */
const logger = {
  error: (message, meta = {}) => winstonLogger.error(message, meta),
  warn: (message, meta = {}) => winstonLogger.warn(message, meta),
  info: (message, meta = {}) => winstonLogger.info(message, meta),
  debug: (message, meta = {}) => winstonLogger.debug(message, meta),
  verbose: (message, meta = {}) => winstonLogger.verbose(message, meta),
  silly: (message, meta = {}) => winstonLogger.silly(message, meta)
};

/**
 * Middleware for logging HTTP requests
 */
const requestLogger = (req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
};

/**
 * Middleware for handling errors
 */
const errorLogger = (err, req, res, next) => {
  logger.error(`${err.message}`, {
    stack: err.stack,
    method: req.method,
    path: req.path,
    statusCode: err.statusCode || 500
  });
  next(err);
};

// Export both the Winston logger and the backward-compatible interface
module.exports = {
  logger,
  requestLogger,
  errorLogger,
  winstonLogger
};
