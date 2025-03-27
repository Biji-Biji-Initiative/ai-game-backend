/**
 * Logger Module
 * Provides standardized logging functionality for the application
 * 
 * @module logger
 */

const winston = require('winston');

// Define log levels and colors
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'cyan',
  debug: 'blue',
};

// Determine the log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  return isDevelopment ? 'debug' : logLevel;
};

// Add colors to Winston
winston.addColors(colors);

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    
    return `${timestamp} ${level}: ${message} ${metaString}`;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true })
      ),
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      handleExceptions: true
    }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Ensure log directories exist
try {
  const fs = require('fs');
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
  }
} catch (error) {
  console.warn('Could not create logs directory:', error.message);
}

module.exports = logger;

