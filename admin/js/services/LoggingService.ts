/**
 * Logging Service
 *
 * Provides an abstraction for logging operations with different
 * log levels and output destinations.
 */

/**
 * Log levels enum
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  OFF = 6,
}

/**
 * LoggingService interface for logging operations
 */
export interface LoggingService {
  /**
   * Set the minimum log level
   * @param level Minimum log level to display
   */
  setLogLevel(level: LogLevel): void;

  /**
   * Get the current log level
   * @returns Current log level
   */
  getLogLevel(): LogLevel;

  /**
   * Log a message at TRACE level
   * @param message Message or object to log
   * @param details Additional details to log
   */
  trace(message: string, ...details: any[]): void;

  /**
   * Log a message at DEBUG level
   * @param message Message or object to log
   * @param details Additional details to log
   */
  debug(message: string, ...details: any[]): void;

  /**
   * Log a message at INFO level
   * @param message Message or object to log
   * @param details Additional details to log
   */
  info(message: string, ...details: any[]): void;

  /**
   * Log a message at WARN level
   * @param message Message or object to log
   * @param details Additional details to log
   */
  warn(message: string, ...details: any[]): void;

  /**
   * Log a message at ERROR level
   * @param message Message or object to log
   * @param details Additional details to log
   */
  error(message: string, ...details: any[]): void;

  /**
   * Log a message at FATAL level
   * @param message Message or object to log
   * @param details Additional details to log
   */
  fatal(message: string, ...details: any[]): void;

  /**
   * Create a child logger with a specific context
   * @param context Context for the child logger
   * @returns Child logger instance
   */
  child(context: string): LoggingService;
}

/**
 * ConsoleLoggingService implementation
 * Logs to browser console
 */
export class ConsoleLoggingService implements LoggingService {
  private level: LogLevel = LogLevel.INFO;
  private context: string;

  /**
   * Create a new console logger
   * @param context Optional context for the logger
   * @param level Initial log level
   */
  constructor(context = 'app', level = LogLevel.INFO) {
    this.context = context;
    this.level = level;
  }

  /**
   * Set the minimum log level
   * @param level Minimum log level to display
   */
  setLogLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current log level
   * @returns Current log level
   */
  getLogLevel(): LogLevel {
    return this.level;
  }

  /**
   * Log a message at TRACE level
   * @param message Message to log
   * @param details Additional details to log
   */
  trace(message: string, ...details: any[]): void {
    if (this.level <= LogLevel.TRACE) {
      console.trace(`[${this.context}] TRACE: ${message}`, ...details);
    }
  }

  /**
   * Log a message at DEBUG level
   * @param message Message to log
   * @param details Additional details to log
   */
  debug(message: string, ...details: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[${this.context}] DEBUG: ${message}`, ...details);
    }
  }

  /**
   * Log a message at INFO level
   * @param message Message to log
   * @param details Additional details to log
   */
  info(message: string, ...details: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`[${this.context}] INFO: ${message}`, ...details);
    }
  }

  /**
   * Log a message at WARN level
   * @param message Message to log
   * @param details Additional details to log
   */
  warn(message: string, ...details: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[${this.context}] WARN: ${message}`, ...details);
    }
  }

  /**
   * Log a message at ERROR level
   * @param message Message to log
   * @param details Additional details to log
   */
  error(message: string, ...details: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[${this.context}] ERROR: ${message}`, ...details);
    }
  }

  /**
   * Log a message at FATAL level
   * @param message Message to log
   * @param details Additional details to log
   */
  fatal(message: string, ...details: any[]): void {
    if (this.level <= LogLevel.FATAL) {
      console.error(`[${this.context}] FATAL: ${message}`, ...details);
    }
  }

  /**
   * Create a child logger with a specific context
   * @param context Context for the child logger
   * @returns Child logger instance
   */
  child(context: string): LoggingService {
    return new ConsoleLoggingService(`${this.context}:${context}`, this.level);
  }
}

/**
 * StorageLoggingService implementation
 * Logs to browser storage (localStorage)
 */
export class StorageLoggingService implements LoggingService {
  private level: LogLevel = LogLevel.INFO;
  private context: string;
  private storageKey: string;
  private maxLogSize: number;

  /**
   * Create a new storage logger
   * @param storageKey Key to use for localStorage
   * @param maxLogSize Maximum number of log entries to keep
   * @param context Optional context for the logger
   * @param level Initial log level
   */
  constructor(storageKey = 'app_logs', maxLogSize = 100, context = 'app', level = LogLevel.INFO) {
    this.storageKey = storageKey;
    this.maxLogSize = maxLogSize;
    this.context = context;
    this.level = level;
  }

  /**
   * Set the minimum log level
   * @param level Minimum log level to display
   */
  setLogLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current log level
   * @returns Current log level
   */
  getLogLevel(): LogLevel {
    return this.level;
  }

  /**
   * Log a message at TRACE level
   * @param message Message to log
   * @param details Additional details to log
   */
  trace(message: string, ...details: any[]): void {
    if (this.level <= LogLevel.TRACE) {
      this.saveLog('TRACE', message, details);
    }
  }

  /**
   * Log a message at DEBUG level
   * @param message Message to log
   * @param details Additional details to log
   */
  debug(message: string, ...details: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      this.saveLog('DEBUG', message, details);
    }
  }

  /**
   * Log a message at INFO level
   * @param message Message to log
   * @param details Additional details to log
   */
  info(message: string, ...details: any[]): void {
    if (this.level <= LogLevel.INFO) {
      this.saveLog('INFO', message, details);
    }
  }

  /**
   * Log a message at WARN level
   * @param message Message to log
   * @param details Additional details to log
   */
  warn(message: string, ...details: any[]): void {
    if (this.level <= LogLevel.WARN) {
      this.saveLog('WARN', message, details);
    }
  }

  /**
   * Log a message at ERROR level
   * @param message Message to log
   * @param details Additional details to log
   */
  error(message: string, ...details: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      this.saveLog('ERROR', message, details);
    }
  }

  /**
   * Log a message at FATAL level
   * @param message Message to log
   * @param details Additional details to log
   */
  fatal(message: string, ...details: any[]): void {
    if (this.level <= LogLevel.FATAL) {
      this.saveLog('FATAL', message, details);
    }
  }

  /**
   * Create a child logger with a specific context
   * @param context Context for the child logger
   * @returns Child logger instance
   */
  child(context: string): LoggingService {
    return new StorageLoggingService(
      this.storageKey,
      this.maxLogSize,
      `${this.context}:${context}`,
      this.level,
    );
  }

  /**
   * Save a log entry to storage
   * @param level Log level
   * @param message Message to log
   * @param details Additional details
   */
  private saveLog(level: string, message: string, details: any[]): void {
    try {
      // Get existing logs
      const logsJson = localStorage.getItem(this.storageKey) || '[]';
      const logs = JSON.parse(logsJson);

      // Create new log entry
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        context: this.context,
        message,
        details: details.length > 0 ? this.stringifyDetails(details) : undefined,
      };

      // Add to logs and trim if needed
      logs.unshift(logEntry);
      if (logs.length > this.maxLogSize) {
        logs.length = this.maxLogSize;
      }

      // Save logs back to storage
      localStorage.setItem(this.storageKey, JSON.stringify(logs));
    } catch (error) {
      console.error(`Failed to save log entry to storage: ${error}`);
    }
  }

  /**
   * Stringify log details for storage
   * @param details Details to stringify
   * @returns Stringified details
   */
  private stringifyDetails(details: any[]): string {
    try {
      return JSON.stringify(details);
    } catch (error) {
      return `[Error stringifying details: ${error}]`;
    }
  }
}

/**
 * CompositeLoggingService implementation
 * Logs to multiple outputs at once
 */
export class CompositeLoggingService implements LoggingService {
  private loggers: LoggingService[];
  private level: LogLevel = LogLevel.INFO;
  private context: string;

  /**
   * Create a new composite logger
   * @param loggers Loggers to use
   * @param context Optional context for the logger
   * @param level Initial log level
   */
  constructor(loggers: LoggingService[], context = 'app', level = LogLevel.INFO) {
    this.loggers = loggers;
    this.context = context;
    this.level = level;
  }

  /**
   * Set the minimum log level
   * @param level Minimum log level to display
   */
  setLogLevel(level: LogLevel): void {
    this.level = level;
    for (const logger of this.loggers) {
      logger.setLogLevel(level);
    }
  }

  /**
   * Get the current log level
   * @returns Current log level
   */
  getLogLevel(): LogLevel {
    return this.level;
  }

  /**
   * Log a message at TRACE level
   * @param message Message to log
   * @param details Additional details to log
   */
  trace(message: string, ...details: any[]): void {
    for (const logger of this.loggers) {
      logger.trace(message, ...details);
    }
  }

  /**
   * Log a message at DEBUG level
   * @param message Message to log
   * @param details Additional details to log
   */
  debug(message: string, ...details: any[]): void {
    for (const logger of this.loggers) {
      logger.debug(message, ...details);
    }
  }

  /**
   * Log a message at INFO level
   * @param message Message to log
   * @param details Additional details to log
   */
  info(message: string, ...details: any[]): void {
    for (const logger of this.loggers) {
      logger.info(message, ...details);
    }
  }

  /**
   * Log a message at WARN level
   * @param message Message to log
   * @param details Additional details to log
   */
  warn(message: string, ...details: any[]): void {
    for (const logger of this.loggers) {
      logger.warn(message, ...details);
    }
  }

  /**
   * Log a message at ERROR level
   * @param message Message to log
   * @param details Additional details to log
   */
  error(message: string, ...details: any[]): void {
    for (const logger of this.loggers) {
      logger.error(message, ...details);
    }
  }

  /**
   * Log a message at FATAL level
   * @param message Message to log
   * @param details Additional details to log
   */
  fatal(message: string, ...details: any[]): void {
    for (const logger of this.loggers) {
      logger.fatal(message, ...details);
    }
  }

  /**
   * Create a child logger with a specific context
   * @param context Context for the child logger
   * @returns Child logger instance
   */
  child(context: string): LoggingService {
    const childLoggers: LoggingService[] = this.loggers.map(logger => logger.child(context));
    return new CompositeLoggingService(childLoggers, `${this.context}:${context}`, this.level);
  }
}
