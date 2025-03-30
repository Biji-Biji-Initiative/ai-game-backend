/**
 * Enhanced Logger System
 * 
 * This module provides an improved, configurable logging system using Winston.
 * It supports environment-specific configurations, dynamic log level changes,
 * correlation ID propagation, and standardized log formats.
 */

import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

// Create storages for context and correlation IDs
const correlationIdStorage = new AsyncLocalStorage();
const contextStorage = new AsyncLocalStorage();

// Default configuration
const defaultConfig = {
  // Log levels with numeric priorities (lower = more severe)
  levels: {
    fatal: 0,    // Application cannot function
    error: 1,    // Error affecting a single operation
    warn: 2,     // Warning that might affect operation
    info: 3,     // Normal operational information
    http: 4,     // HTTP request/response logging
    debug: 5,    // Detailed information for debugging
    trace: 6,    // Ultra-verbose debugging information
  },
  
  // Log colors for console output
  colors: {
    fatal: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'cyan',
    debug: 'blue',
    trace: 'gray',
  },
  
  // Console output configuration
  console: {
    level: process.env.LOG_LEVEL_CONSOLE || 'info',
    format: 'detailed',  // 'simple', 'json', 'detailed'
    colorize: true,
    handleExceptions: true,
  },
  
  // File output configuration
  file: {
    enabled: true,
    level: process.env.LOG_LEVEL_FILE || 'debug',
    format: 'json',
    dirname: './logs',
    handleExceptions: true,
    maxFiles: '14d', // keep logs for 14 days
    maxSize: '20m',  // 20 megabytes
    // Create separate files for each level at or below warning
    separateLevels: ['fatal', 'error', 'warn'],
  },
  
  // Customization options
  options: {
    enableCorrelationId: true,
    redactSensitiveInfo: true,
    enablePerformanceMetrics: true,
    trackMemoryUsage: false,
    logProcessInfo: false,
    includeTimestamp: true,
    timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
    maskRedactedFields: true,
    logLevelChangePort: process.env.LOG_LEVEL_PORT || 0, // 0 = disabled
  },
  
  // Redaction settings
  redaction: {
    // Fields that should always be completely redacted
    fields: [
      'password', 'token', 'secret', 'apiKey', 'authorization',
      'accessToken', 'refreshToken', 'creditCard', 'ssn', 'pwd'
    ],
    // Patterns that should be redacted (e.g., credit card numbers)
    patterns: [
      /\b(?:\d[ -]*?){13,16}\b/, // Credit card-like numbers
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
    ],
    // Character to use for masking
    maskChar: '*',
  },
};

// Load environment-specific overrides from environment variables
function loadEnvOverrides() {
  const overrides = {};
  
  // Map of environment variables to config properties
  const envMappings = {
    LOG_LEVEL: 'console.level',
    LOG_FORMAT: 'console.format',
    LOG_COLORIZE: 'console.colorize',
    LOG_FILE_ENABLED: 'file.enabled',
    LOG_FILE_LEVEL: 'file.level',
    LOG_FILE_FORMAT: 'file.format',
    LOG_FILE_DIR: 'file.dirname',
    LOG_REDACT: 'options.redactSensitiveInfo',
    LOG_CORRELATION_ID: 'options.enableCorrelationId',
    LOG_PERF_METRICS: 'options.enablePerformanceMetrics',
    LOG_MEMORY: 'options.trackMemoryUsage',
  };
  
  // Process each environment variable
  Object.entries(envMappings).forEach(([envVar, configPath]) => {
    if (process.env[envVar] !== undefined) {
      // Split the path and set the value in the overrides object
      const pathParts = configPath.split('.');
      let current = overrides;
      
      pathParts.forEach((part, index) => {
        if (index === pathParts.length - 1) {
          // Convert value to appropriate type
          let value = process.env[envVar];
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
          else if (!isNaN(Number(value)) && value !== '') value = Number(value);
          
          current[part] = value;
        } else {
          current[part] = current[part] || {};
          current = current[part];
        }
      });
    }
  });
  
  return overrides;
}

// Deep merge objects
function deepMerge(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

// Helper to check if value is an object
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

// Redact sensitive information in an object
function redactSensitiveData(obj, config) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  const mask = config.redaction.maskChar.repeat(8);
  
  // Deep clone to avoid modifying original
  const traverseAndRedact = (obj, path = '') => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check if this key should be redacted
      const shouldRedact = config.redaction.fields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );
      
      if (shouldRedact) {
        // Redact based on type
        if (typeof value === 'string') {
          if (config.options.maskRedactedFields) {
            result[key] = value.length > 0 ? mask : value;
          } else {
            result[key] = '[REDACTED]';
          }
        } else if (typeof value === 'object' && value !== null) {
          // For objects, redact the entire object
          result[key] = '[REDACTED]';
        }
      } else if (typeof value === 'string') {
        // Check for patterns to redact in string values
        let redactedValue = value;
        config.redaction.patterns.forEach(pattern => {
          redactedValue = redactedValue.replace(pattern, '[REDACTED]');
        });
        result[key] = redactedValue;
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        result[key] = traverseAndRedact(value, currentPath);
      }
    });
    
    return result;
  };
  
  return traverseAndRedact(result);
}

// Get current correlation ID from context or explicit value
function getCorrelationId(explicitCorrelationId) {
  // If explicitly provided, use that
  if (explicitCorrelationId) {
    return explicitCorrelationId;
  }
  
  // Otherwise, try to get from AsyncLocalStorage
  const store = correlationIdStorage.getStore();
  return store?.correlationId;
}

// Create a formatter for console output
function createConsoleFormatter(config) {
  const { format } = winston;
  
  // Base formatters
  const baseFormatters = [
    format.errors({ stack: true }),
    format.splat(),
  ];
  
  // Add timestamp if enabled
  if (config.options.includeTimestamp) {
    baseFormatters.push(format.timestamp({
      format: config.options.timestampFormat
    }));
  }
  
  // Add colorization if enabled
  if (config.console.colorize) {
    winston.addColors(config.colors);
    baseFormatters.push(format.colorize());
  }
  
  // Create the appropriate formatter based on format type
  switch (config.console.format.toLowerCase()) {
    case 'json':
      return format.combine(
        ...baseFormatters,
        format.json()
      );
      
    case 'simple':
      return format.combine(
        ...baseFormatters,
        format.printf(info => {
          const timestamp = info.timestamp ? `${info.timestamp} ` : '';
          return `${timestamp}${info.level}: ${info.message}`;
        })
      );
      
    case 'detailed':
    default:
      return format.combine(
        ...baseFormatters,
        format.printf(info => {
          const timestamp = info.timestamp ? `${info.timestamp} ` : '';
          const correlationId = info.correlationId ? `[${info.correlationId}] ` : '';
          const namespace = info.namespace ? `[${info.namespace}] ` : '';
          
          // Remove items that will be displayed in the prefix
          const {
            timestamp: _ts,
            level,
            message,
            correlationId: _cid,
            namespace: _ns,
            ...rest
          } = info;
          
          // Format the remaining metadata if any
          const metadata = Object.keys(rest).length 
            ? `\n${JSON.stringify(rest, null, 2)}`
            : '';
            
          return `${timestamp}${correlationId}${namespace}${level}: ${message}${metadata}`;
        })
      );
  }
}

// Create a formatter for file output
function createFileFormatter(config) {
  const { format } = winston;
  
  // Base formatters
  const baseFormatters = [
    format.errors({ stack: true }),
    format.splat(),
  ];
  
  // Add timestamp if enabled
  if (config.options.includeTimestamp) {
    baseFormatters.push(format.timestamp({
      format: config.options.timestampFormat
    }));
  }
  
  // Always use JSON for file output for better machine processing
  return format.combine(
    ...baseFormatters,
    format.json()
  );
}

// Add system information to log context
function addSystemInfo(logEntry, config) {
  if (!config.options.logProcessInfo) return logEntry;
  
  return {
    ...logEntry,
    system: {
      hostname: os.hostname(),
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version,
    }
  };
}

// Add memory usage information if configured
function addMemoryUsage(logEntry, config) {
  if (!config.options.trackMemoryUsage) return logEntry;
  
  const memoryUsage = process.memoryUsage();
  return {
    ...logEntry,
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // Resident Set Size in MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // Total Heap in MB
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // Used Heap in MB
      external: Math.round((memoryUsage.external || 0) / 1024 / 1024), // External memory in MB
    }
  };
}

// Create file transports for Winston
function createFileTransports(config) {
  if (!config.file.enabled) return [];
  
  const transports = [];
  const fileFormat = createFileFormatter(config);
  
  // Create directory if it doesn't exist
  const logDir = config.file.dirname;
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Add rotation transport for combined logs
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: config.file.level,
      maxSize: config.file.maxSize,
      maxFiles: config.file.maxFiles,
      format: fileFormat,
    })
  );
  
  // Add separate transports for specified levels
  if (config.file.separateLevels && Array.isArray(config.file.separateLevels)) {
    config.file.separateLevels.forEach(level => {
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, `${level}-%DATE%.log`),
          datePattern: 'YYYY-MM-DD',
          level,
          maxSize: config.file.maxSize,
          maxFiles: config.file.maxFiles,
          format: fileFormat,
        })
      );
    });
  }
  
  return transports;
}

// Create the logger with the given configuration
function createLogger(userConfig = {}) {
  // Merge configurations
  const envOverrides = loadEnvOverrides();
  const config = deepMerge(
    defaultConfig,
    deepMerge(userConfig, envOverrides)
  );
  
  // Create console formatter
  const consoleFormat = createConsoleFormatter(config);
  
  // Create transports
  const transports = [
    new winston.transports.Console({
      level: config.console.level,
      format: consoleFormat,
      handleExceptions: config.console.handleExceptions,
    }),
    ...createFileTransports(config)
  ];
  
  // Create the Winston logger
  const winstonLogger = winston.createLogger({
    levels: config.levels,
    transports,
    exitOnError: false,
  });
  
  // Set up dynamic log level adjustment if enabled
  if (config.options.logLevelChangePort > 0) {
    setupDynamicLogLevels(winstonLogger, config);
  }
  
  return winstonLogger;
}

// Set up HTTP server for dynamic log level changes
function setupDynamicLogLevels(logger, config) {
  const port = config.options.logLevelChangePort;
  const http = require('http');
  
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/log-level') {
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          const { level, transport = 'console' } = JSON.parse(body);
          
          // Validate log level
          if (!Object.keys(config.levels).includes(level)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ 
              error: `Invalid log level. Valid levels are: ${Object.keys(config.levels).join(', ')}` 
            }));
            return;
          }
          
          // Change log level
          logger.transports.forEach(t => {
            if (
              (transport === 'console' && t instanceof winston.transports.Console) ||
              (transport === 'file' && t instanceof winston.transports.DailyRotateFile) ||
              transport === 'all'
            ) {
              t.level = level;
            }
          });
          
          res.statusCode = 200;
          res.end(JSON.stringify({ 
            message: `Log level for ${transport} set to ${level}` 
          }));
          
          // Log the change
          logger.info(`Log level for ${transport} changed to ${level}`);
        } catch (error) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid request' }));
        }
      });
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
  
  server.listen(port, () => {
    logger.info(`Log level change server listening on port ${port}`);
  });
  
  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} for log level changes is already in use. Dynamic log level changes disabled.`);
    } else {
      logger.error('Error starting log level change server:', { error: error.message });
    }
  });
}

// Enhanced Logger class
class EnhancedLogger {
  /**
   * Create a new logger instance
   * @param {string} namespace - Logger namespace
   * @param {Object} options - Logger options
   */
  constructor(namespace, options = {}) {
    this.namespace = namespace || 'app';
    this.correlationId = options.correlationId;
    this.config = options.config || {};
    this.logger = options.logger || null; // Will be set by the factory
  }
  
  /**
   * Add standard metadata to log entry
   * @param {Object} meta - Additional metadata
   * @param {string} [meta.correlationId] - Optional correlation ID to use for this log entry
   * @returns {Object} Enhanced metadata
   */
  _enhanceMetadata(meta = {}) {
    // Get correlation ID from meta, instance, or context
    const correlationId = meta.correlationId || 
                         this.correlationId || 
                         getCorrelationId();
    
    // Get any additional context
    const context = contextStorage.getStore() || {};
    
    // Start with base metadata
    let enhancedMeta = {
      ...meta,
      namespace: this.namespace,
      timestamp: new Date().toISOString(),
    };
    
    // Add correlation ID if present
    if (correlationId) {
      enhancedMeta.correlationId = correlationId;
    }
    
    // Add context if present and not already in metadata
    if (Object.keys(context).length) {
      enhancedMeta = {
        ...enhancedMeta,
        ...Object.keys(context)
          .filter(key => !enhancedMeta[key])
          .reduce((obj, key) => {
            obj[key] = context[key];
            return obj;
          }, {})
      };
    }
    
    // Check if we need to add system info
    enhancedMeta = addSystemInfo(enhancedMeta, this.config);
    
    // Check if we need to add memory usage
    enhancedMeta = addMemoryUsage(enhancedMeta, this.config);
    
    // Redact sensitive data if configured
    if (this.config.options.redactSensitiveInfo) {
      enhancedMeta = redactSensitiveData(enhancedMeta, this.config);
    }
    
    return enhancedMeta;
  }
  
  /**
   * Log at fatal level - application cannot function
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  fatal(message, meta = {}) {
    if (!this.logger) return;
    this.logger.log('fatal', message, this._enhanceMetadata(meta));
  }
  
  /**
   * Log at error level - operation failed
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    if (!this.logger) return;
    this.logger.error(message, this._enhanceMetadata(meta));
  }
  
  /**
   * Log at warning level - operation succeeded but with issues
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    if (!this.logger) return;
    this.logger.warn(message, this._enhanceMetadata(meta));
  }
  
  /**
   * Log at info level - normal operation information
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    if (!this.logger) return;
    this.logger.info(message, this._enhanceMetadata(meta));
  }
  
  /**
   * Log at HTTP level - HTTP request/response details
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  http(message, meta = {}) {
    if (!this.logger) return;
    this.logger.http(message, this._enhanceMetadata(meta));
  }
  
  /**
   * Log at debug level - debugging information
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    if (!this.logger) return;
    this.logger.debug(message, this._enhanceMetadata(meta));
  }
  
  /**
   * Log at trace level - very detailed debugging
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  trace(message, meta = {}) {
    if (!this.logger) return;
    this.logger.log('trace', message, this._enhanceMetadata(meta));
  }
  
  /**
   * Create a child logger with a sub-namespace
   * @param {string} subNamespace - Sub-namespace to append
   * @param {Object} options - Additional options
   * @returns {EnhancedLogger} New logger instance
   */
  child(subNamespace, options = {}) {
    const newNamespace = `${this.namespace}:${subNamespace}`;
    const childLogger = new EnhancedLogger(newNamespace, {
      ...options,
      config: this.config,
      logger: this.logger,
    });
    
    return childLogger;
  }
  
  /**
   * Create a performance timer for measuring operations
   * @param {string} operation - Operation name to measure
   * @returns {Object} Timer object with mark and end methods
   */
  timer(operation) {
    const startTime = process.hrtime.bigint();
    const marks = {};
    const logger = this;
    
    return {
      /**
       * Mark a point in time during the operation
       * @param {string} name - Name of the mark point
       * @returns {Object} This timer instance for chaining
       */
      mark(name) {
        marks[name] = process.hrtime.bigint();
        return this;
      },
      
      /**
       * End timing and log the results
       * @param {Object} meta - Additional metadata
       * @param {string} [level='info'] - Log level to use
       * @returns {number} Duration in milliseconds
       */
      end(meta = {}, level = 'info') {
        const endTime = process.hrtime.bigint();
        const durationNs = Number(endTime - startTime);
        const durationMs = durationNs / 1_000_000;
        
        // Calculate intervals between marks
        const intervals = {};
        let lastMark = startTime;
        
        for (const [name, time] of Object.entries(marks)) {
          intervals[`${name}_ms`] = Number(time - lastMark) / 1_000_000;
          lastMark = time;
        }
        
        if (Object.keys(marks).length > 0) {
          intervals.final_ms = Number(endTime - lastMark) / 1_000_000;
        }
        
        // Log the performance data
        logger[level](`Completed ${operation}`, {
          operation,
          duration_ms: durationMs.toFixed(2),
          ...intervals.length > 0 ? { intervals } : {},
          ...meta
        });
        
        return durationMs;
      }
    };
  }
  
  /**
   * Run a function with context data that will be included in all log entries
   * @param {Object} context - Context data to include
   * @param {Function} fn - Function to run with the context
   * @returns {*} Result of the function
   */
  withContext(context, fn) {
    return contextStorage.run({ ...contextStorage.getStore(), ...context }, fn);
  }
  
  /**
   * Run a function with a correlation ID that will be included in all log entries
   * @param {string} correlationId - Correlation ID to use, or generate a new one if not provided
   * @param {Function} fn - Function to run with the correlation ID
   * @returns {*} Result of the function
   */
  withCorrelationId(correlationId, fn) {
    const id = correlationId || uuidv4();
    return correlationIdStorage.run({ correlationId: id }, fn);
  }
}

// Factory to create logger instances
class LoggerFactory {
  constructor(config = {}) {
    this.config = deepMerge(defaultConfig, config);
    this.logger = createLogger(this.config);
    this.loggers = new Map();
  }
  
  /**
   * Get a logger instance for a specific namespace
   * @param {string} namespace - Logger namespace
   * @param {Object} options - Logger options
   * @returns {EnhancedLogger} Logger instance
   */
  getLogger(namespace, options = {}) {
    // Check if we already have this logger
    if (this.loggers.has(namespace)) {
      return this.loggers.get(namespace);
    }
    
    // Create a new logger
    const logger = new EnhancedLogger(namespace, {
      ...options,
      config: this.config,
      logger: this.logger,
    });
    
    // Store for reuse
    this.loggers.set(namespace, logger);
    
    return logger;
  }
  
  /**
   * Update logger configuration at runtime
   * @param {Object} newConfig - New configuration to apply
   */
  updateConfig(newConfig) {
    // Merge with existing config
    this.config = deepMerge(this.config, newConfig);
    
    // Create a new Winston logger with updated config
    this.logger = createLogger(this.config);
    
    // Update all existing loggers to use the new Winston logger
    this.loggers.forEach(logger => {
      logger.logger = this.logger;
      logger.config = this.config;
    });
  }
  
  /**
   * Create correlation ID middleware for Express
   * @returns {Function} Express middleware
   */
  createCorrelationIdMiddleware() {
    return (req, res, next) => {
      // Find existing correlation ID from various standard headers
      const correlationId = 
        req.headers['x-correlation-id'] || 
        req.headers['x-request-id'] || 
        req.headers['request-id'] ||
        uuidv4();
        
      // Set standard headers for downstream services
      res.setHeader('X-Correlation-ID', correlationId);
      
      // Store in AsyncLocalStorage for use throughout the request lifecycle
      correlationIdStorage.run({ correlationId, startTime: Date.now() }, () => {
        // Add to request object for convenience
        req.correlationId = correlationId;
        
        // Continue
        next();
      });
    };
  }
  
  /**
   * Create enhanced request logging middleware
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware
   */
  createRequestLogger(options = {}) {
    const config = {
      logBody: process.env.LOG_REQUEST_BODY === 'true',
      logHeaders: true,
      excludePaths: ['/health', '/metrics'],
      maxBodySize: 1024, // Truncate large bodies
      redactedFields: this.config.redaction.fields,
      logger: this.getLogger('http'),
      ...options
    };
    
    return (req, res, next) => {
      // Skip excluded paths
      if (config.excludePaths.some(path => req.path.startsWith(path))) {
        return next();
      }
      
      const startTime = Date.now();
      const store = correlationIdStorage.getStore() || {};
      const correlationId = store.correlationId;
      
      // Prepare request data
      const requestData = {
        method: req.method,
        url: req.originalUrl || req.url,
        correlationId,
        ip: req.ip,
        userAgent: req.get('user-agent')
      };
      
      // Add headers if configured
      if (config.logHeaders) {
        // Clone headers and redact sensitive ones
        const headers = { ...req.headers };
        if (headers.authorization) headers.authorization = '[REDACTED]';
        if (headers.cookie) headers.cookie = '[REDACTED]';
        requestData.headers = headers;
      }
      
      // Add request body if configured and present
      if (config.logBody && req.body && Object.keys(req.body).length) {
        // Clone and redact sensitive fields
        const body = JSON.parse(JSON.stringify(req.body));
        const redactedBody = redactSensitiveData({ body }, this.config).body;
        
        // Truncate if too large
        requestData.body = JSON.stringify(redactedBody).length > config.maxBodySize 
          ? { truncated: true, preview: JSON.stringify(redactedBody).substring(0, config.maxBodySize) + '...' }
          : redactedBody;
      }
      
      // Log the incoming request
      config.logger.http(`${req.method} ${req.originalUrl || req.url}`, requestData);
      
      // Capture the response
      const originalEnd = res.end;
      
      res.end = function(chunk, encoding) {
        // Restore original end
        res.end = originalEnd;
        
        // Calculate duration
        const duration = Date.now() - startTime;
        
        // Prepare response data
        const responseData = {
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          duration,
          correlationId
        };
        
        // Determine log level based on status code
        const level = res.statusCode >= 500 ? 'error' : 
                      res.statusCode >= 400 ? 'warn' : 
                      'http';
        
        // Log the response
        config.logger[level](`${res.statusCode} ${req.method} ${req.originalUrl || req.url} ${duration}ms`, responseData);
        
        // Call the original end
        return originalEnd.call(this, chunk, encoding);
      };
      
      next();
    };
  }
  
  /**
   * Create error logging middleware
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware
   */
  createErrorLogger(options = {}) {
    const config = {
      logger: this.getLogger('http:error'),
      includeHeaders: true,
      includeBody: true,
      ...options
    };
    
    return (err, req, res, next) => {
      // Prepare error data
      const errorData = {
        error: err.message,
        stack: err.stack,
        status: err.status || err.statusCode || 500,
        code: err.code || err.errorCode,
        method: req.method,
        url: req.originalUrl || req.url,
        correlationId: req.correlationId || getCorrelationId(),
        ip: req.ip
      };
      
      // Add headers if configured
      if (config.includeHeaders) {
        // Clone headers and redact sensitive ones
        const headers = { ...req.headers };
        if (headers.authorization) headers.authorization = '[REDACTED]';
        if (headers.cookie) headers.cookie = '[REDACTED]';
        errorData.headers = headers;
      }
      
      // Add request body if configured and present
      if (config.includeBody && req.body && Object.keys(req.body).length) {
        // Clone and redact sensitive fields
        const body = JSON.parse(JSON.stringify(req.body));
        errorData.body = redactSensitiveData({ body }, this.config).body;
      }
      
      // Log the error
      config.logger.error(`Error: ${err.message}`, errorData);
      
      // Continue to the next error handler
      next(err);
    };
  }
}

// Create default factory with default config
const defaultFactory = new LoggerFactory();

// Export main components
export { 
  EnhancedLogger, 
  LoggerFactory,
  defaultFactory,
  correlationIdStorage,
  contextStorage
};

// Export default logger and middleware for convenience
export const logger = defaultFactory.getLogger('app');
export const correlationIdMiddleware = defaultFactory.createCorrelationIdMiddleware();
export const requestLogger = defaultFactory.createRequestLogger();
export const errorLogger = defaultFactory.createErrorLogger();

export default {
  logger,
  correlationIdMiddleware,
  requestLogger,
  errorLogger,
  LoggerFactory,
  defaultFactory
}; 