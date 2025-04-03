/**
 * Simple logger utility
 * 
 * Provides basic logging functionality with log levels
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Log level configuration (defaults to INFO in production, DEBUG otherwise)
 */
let currentLogLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}

/**
 * Set the current log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Get the current log level
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * Logger implementation
 */
class LoggerImpl implements Logger {
  /**
   * Log a debug message
   */
  debug(message: string, ...args: unknown[]): void {
    if (currentLogLevel <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: unknown[]): void {
    if (currentLogLevel <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (currentLogLevel <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: unknown[]): void {
    if (currentLogLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    setLogLevel(level);
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return getLogLevel();
  }
}

/**
 * Export a single logger instance
 */
export const logger = new LoggerImpl(); 