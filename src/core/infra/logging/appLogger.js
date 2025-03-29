'use strict';

/**
 * Application Logger
 *
 * Specialized logger for application layer.
 * Follows domain-driven logging practices.
 */

const { createLogger, format, transports } = require('winston');
const { LEVEL, MESSAGE } = require('triple-beam');

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || 'info';

// Create a custom format for domain logging
const domainFormat = format.printf(info => {
  // Build basic log message
  let logMessage = `${info.timestamp} ${info.level}: ${info.message}`;

  // Format metadata (excluding level, message, timestamp, domain)
  const metaFields = { ...info };
  delete metaFields.level;
  delete metaFields.message;
  delete metaFields.timestamp;
  delete metaFields.domain;
  delete metaFields.component;

  // Add metadata if present
  if (Object.keys(metaFields).length > 0) {
    logMessage += ` ${JSON.stringify(metaFields)}`;
  }

  return logMessage;
});

// Create a base logger
const baseLogger = createLogger({
  level: logLevel,
  format: format.combine(format.timestamp(), format.colorize(), domainFormat),
  transports: [new transports.Console()],
});

// Create application domain logger
const appLogger = {
  debug: (message, meta = {}) => baseLogger.debug(message, { domain: 'application', ...meta }),
  info: (message, meta = {}) => baseLogger.info(message, { domain: 'application', ...meta }),
  warn: (message, meta = {}) => baseLogger.warn(message, { domain: 'application', ...meta }),
  error: (message, meta = {}) => baseLogger.error(message, { domain: 'application', ...meta }),

  // Create a child logger for specific components
  child: component => {
    return {
      debug: (message, meta = {}) =>
        baseLogger.debug(message, { domain: 'application', component, ...meta }),
      info: (message, meta = {}) =>
        baseLogger.info(message, { domain: 'application', component, ...meta }),
      warn: (message, meta = {}) =>
        baseLogger.warn(message, { domain: 'application', component, ...meta }),
      error: (message, meta = {}) =>
        baseLogger.error(message, { domain: 'application', component, ...meta }),
    };
  },
};

module.exports = {
  appLogger,
};
