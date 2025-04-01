import * as winston from "winston";
import { v4 as uuidv4 } from "uuid";
import { AsyncLocalStorage } from "async_hooks";
import fs from 'fs';
import path from 'path';

// Default config if config.js module is not available
const defaultConfig = {
    logging: {
        consoleLevel: 'info',
        fileLevel: 'info'
    }
};

// Ensure logs directory exists
try {
  // Determine logs directory - relative to current file
  const logsDir = path.resolve(process.cwd(), 'logs');
  
  // Check if directory exists, create it if it doesn't
  if (!fs.existsSync(logsDir)) {
    console.log(`Creating logs directory at: ${logsDir}`);
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  console.error(`Error ensuring logs directory exists: ${error.message}`);
  // Continue anyway - the winston transports will handle file errors
}

// Initialize with default config
let config = defaultConfig;

// Try to import config asynchronously, update later if it loads
(async () => {
  try {
    // Dynamic import to handle potential missing module
    const configModule = await import("#app/config/config.js");
    const loadedConfig = configModule.default;
    
    // If we got a config but it doesn't have logging settings, apply defaults
    if (!loadedConfig || !loadedConfig.logging) {
      console.warn('Config loaded but missing logging section, using defaults');
      config = {
        ...loadedConfig,
        logging: defaultConfig.logging
      };
    } else {
      config = loadedConfig;
      // Update winston logger levels if needed
      winstonLogger.transports.forEach(transport => {
        if (transport.name === 'console' && config.logging.consoleLevel) {
          transport.level = config.logging.consoleLevel;
        }
        if (transport.name === 'file' && transport.filename === 'logs/combined.log' && config.logging.fileLevel) {
          transport.level = config.logging.fileLevel;
        }
      });
    }
  }
  catch (error) {
    console.warn(`Could not load config.js, using default logging config: ${error.message}`);
    // Already using default config, no need to update
  }
})().catch(err => {
  console.error("Error initializing logger config:", err);
  // Already using default config, no need to update
});

// Create a storage for correlation IDs
const correlationIdStorage = new AsyncLocalStorage();
// Define log levels and colors
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    trace: 5,
};
// Configure Winston format
const logFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), winston.format.errors({ stack: true }), winston.format.splat(), winston.format.json());
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
        format: winston.format.combine(winston.format.colorize(), consoleFormat),
        level: config.logging.consoleLevel || 'info',
    }),
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: process.env.NODE_ENV === 'production' ? 5242880 : 10485760, // 5MB in prod, 10MB in dev
        maxFiles: process.env.NODE_ENV === 'production' ? 10 : 5, // More history in production
        tailable: true,
        zippedArchive: process.env.NODE_ENV === 'production', // Compress older logs in production
    }),
    new winston.transports.File({
        filename: 'logs/combined.log',
        level: config.logging.fileLevel || 'info',
        maxsize: 10485760, // 10MB
        maxFiles: process.env.NODE_ENV === 'production' ? 20 : 10, // More history in production
        tailable: true,
        zippedArchive: process.env.NODE_ENV === 'production', // Compress older logs in production
    }),
];
// Create the Winston logger
const winstonLogger = winston.createLogger({
    levels: logLevels,
    format: logFormat,
    transports,
    exitOnError: false,
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
 * Filter sensitive data from headers before logging
 * @param {Object} headers - Request headers
 * @returns {Object} Filtered headers
 */
const filterSensitiveHeaders = (headers) => {
  if (!headers) return {};
  
  // Create a copy of headers
  const filteredHeaders = { ...headers };
  
  // List of sensitive headers to mask
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-auth-token',
    'x-api-key',
    'api-key',
    'password',
    'token',
    'refresh-token',
    'secret',
    'private-key'
  ];
  
  // Mask sensitive headers
  sensitiveHeaders.forEach(header => {
    const headerLower = header.toLowerCase();
    if (filteredHeaders[headerLower]) {
      filteredHeaders[headerLower] = '[REDACTED]';
    }
    // Also check for header with different casing
    Object.keys(filteredHeaders).forEach(key => {
      if (key.toLowerCase() === headerLower) {
        filteredHeaders[key] = '[REDACTED]';
      }
    });
  });
  
  return filteredHeaders;
};
/**
 * Base logger class
 */
class Logger {
    /**
     * Create a new logger instance
     * @param {string} namespace - Logger namespace
     * @param {Object} options - Logger options
     * @param {string} [options.correlationId] - Initial correlation ID
     */
    constructor(namespace, options = {}) {
        this.namespace = namespace || 'app';
        this.correlationId = options.correlationId;
    }
    /**
     * Create a child logger with a new namespace
     * @param {string} namespace - Child namespace
     * @param {Object} options - Logger options
     * @param {string} [options.correlationId] - Correlation ID for the child logger
     * @returns {Logger} New logger instance
     */
    child(namespace, options = {}) {
        return new Logger(`${this.namespace}:${namespace}`, {
            correlationId: options.correlationId || this.correlationId,
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
     * @param {string} [meta.correlationId] - Optional correlation ID to use for this log entry
     */
    error(message, meta = {}) {
        const correlationId = getCorrelationId(meta.correlationId || this.correlationId);
        winstonLogger.error(message, {
            ...meta,
            correlationId,
            namespace: this.namespace,
        });
    }
    /**
     * Log at warning level
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     * @param {string} [meta.correlationId] - Optional correlation ID to use for this log entry
     */
    warn(message, meta = {}) {
        const correlationId = getCorrelationId(meta.correlationId || this.correlationId);
        winstonLogger.warn(message, {
            ...meta,
            correlationId,
            namespace: this.namespace,
        });
    }
    /**
     * Log at info level
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     * @param {string} [meta.correlationId] - Optional correlation ID to use for this log entry
     */
    info(message, meta = {}) {
        const correlationId = getCorrelationId(meta.correlationId || this.correlationId);
        winstonLogger.info(message, {
            ...meta,
            correlationId,
            namespace: this.namespace,
        });
    }
    /**
     * Log at HTTP level
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     * @param {string} [meta.correlationId] - Optional correlation ID to use for this log entry
     */
    http(message, meta = {}) {
        const correlationId = getCorrelationId(meta.correlationId || this.correlationId);
        winstonLogger.http(message, {
            ...meta,
            correlationId,
            namespace: this.namespace,
        });
    }
    /**
     * Log at debug level
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     * @param {string} [meta.correlationId] - Optional correlation ID to use for this log entry
     */
    debug(message, meta = {}) {
        const correlationId = getCorrelationId(meta.correlationId || this.correlationId);
        winstonLogger.debug(message, {
            ...meta,
            correlationId,
            namespace: this.namespace,
        });
    }
    /**
     * Log at trace level
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     * @param {string} [meta.correlationId] - Optional correlation ID to use for this log entry
     */
    trace(message, meta = {}) {
        const correlationId = getCorrelationId(meta.correlationId || this.correlationId);
        winstonLogger.log('trace', message, {
            ...meta,
            correlationId,
            namespace: this.namespace,
        });
    }
}
// Create and export the base application logger
const logger = new Logger('app');
/**
 * Middleware to set up correlation ID for each request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const correlationIdMiddleware = (req, res, next) => {
    // Generate or get correlation ID
    const correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || uuidv4();
    // Store in AsyncLocalStorage
    correlationIdStorage.run({ correlationId }, () => {
        // Add to response headers
        res.setHeader('X-Correlation-ID', correlationId);
        next();
    });
};
/**
 * Request logging middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // Extract essential request info
    const requestInfo = {
        method: req.method,
        url: req.url,
        query: req.query,
        ip: req.ip,
        // Filter sensitive data from headers
        headers: filterSensitiveHeaders(req.headers)
    };
    
    // Log request
    logger.info(`Incoming ${req.method} ${req.url}`, requestInfo);
    
    // Log response
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info(`Completed ${req.method} ${req.url}`, {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration,
        });
    });
    
    next();
};
/**
 * Error logging middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorLogger = (err, req, res, next) => {
    logger.error('Request error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
        query: req.query,
        body: req.body,
        headers: filterSensitiveHeaders(req.headers),
        ip: req.ip,
    });
    next(err);
};
export { logger };
export { Logger };
export { correlationIdMiddleware };
export { requestLogger };
export { errorLogger };
export default {
    logger,
    Logger,
    correlationIdMiddleware,
    requestLogger,
    errorLogger
};
