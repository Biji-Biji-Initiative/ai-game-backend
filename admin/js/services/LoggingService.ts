// Types improved by ts-improve-types
/**
 * Logging Service
 * Provides an abstraction layer for logging operations
 */

/**
 * Log level enumeration
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  NONE = 6,
}

/**
 * Log message structure
 */
export interface LogMessage {
  /** Log level */
  level: LogLevel;
  /** Message text */
  message: string;
  /** Additional details */
  details?: unknown;
  /** Timestamp */
  timestamp: Date;
  /** Source component */
  source?: string;
  /** Error object if applicable */
  error?: Error;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to display */
  minLevel?: LogLevel;
  /** Whether to include timestamp in output */
  includeTimestamp?: boolean;
  /** Whether to include source in output */
  includeSource?: boolean;
  /** Whether to enable console output */
  enableConsole?: boolean;
  /** Whether to enable local storage */
  enableLocalStorage?: boolean;
  /** Maximum log entries to keep in memory */
  maxInMemoryEntries?: number;
  /** Maximum log entries to keep in local storage */
  maxLocalStorageEntries?: number;
  /** Local storage key */
  localStorageKey?: string;
  /** Custom formatters */
  formatters?: {
    [key in LogLevel]?: (message: LogMessage) => string;
  };
}

/**
 * LoggingService interface
 */
export interface LoggingService {
  /**
   * Log a message at TRACE level
   * @param message Message to log
   * @param details Additional details
   */
  trace(message: string, details?: unknown): void;

  /**
   * Log a message at DEBUG level
   * @param message Message to log
   * @param details Additional details
   */
  debug(message: string, details?: unknown): void;

  /**
   * Log a message at INFO level
   * @param message Message to log
   * @param details Additional details
   */
  info(message: string, details?: unknown): void;

  /**
   * Log a message at WARN level
   * @param message Message to log
   * @param details Additional details
   */
  warn(message: string, details?: unknown): void;

  /**
   * Log a message at ERROR level
   * @param message Message to log
   * @param details Additional details or error
   */
  error(message: string, details?: unknown): void;

  /**
   * Log a message at FATAL level
   * @param message Message to log
   * @param details Additional details or error
   */
  fatal(message: string, details?: unknown): void;

  /**
   * Log a message
   * @param level Log level
   * @param message Message to log
   * @param details Additional details
   */
  log(level: LogLevel, message: string, details?: unknown): void;

  /**
   * Get all log entries
   */
  getEntries(): LogMessage[];

  /**
   * Clear log entries
   */
  clearEntries(): void;

  /**
   * Set minimum log level
   * @param level Minimum log level
   */
  setLevel(level: LogLevel): void;

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig;

  /**
   * Update configuration
   * @param config Updated configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void;

  /**
   * Create a child logger
   * @param source Source name
   */
  createLogger(source: string): LoggingService;
}

/**
 * Console implementation of LoggingService
 */
export class ConsoleLoggingService implements LoggingService {
  private config: LoggerConfig = {
    minLevel: LogLevel.INFO,
    includeTimestamp: true,
    includeSource: true,
    enableConsole: true,
    enableLocalStorage: false,
    maxInMemoryEntries: 1000,
    maxLocalStorageEntries: 100,
    localStorageKey: 'app_logs',
  };
  private entries: LogMessage[] = [];
  private source?: string;

  /**
   * Constructor
   * @param config Logger configuration
   * @param source Source name
   */
  constructor(config?: Partial<LoggerConfig>, source?: string) {
    if (config) {
      this.updateConfig(config);
    }
    this.source = source;
  }

  /**
   * Log a message at TRACE level
   * @param message Message to log
   * @param details Additional details
   */
  public trace(message: string, details?: unknown): void {
    this.log(LogLevel.TRACE, message, details);
  }

  /**
   * Log a message at DEBUG level
   * @param message Message to log
   * @param details Additional details
   */
  public debug(message: string, details?: unknown): void {
    this.log(LogLevel.DEBUG, message, details);
  }

  /**
   * Log a message at INFO level
   * @param message Message to log
   * @param details Additional details
   */
  public info(message: string, details?: unknown): void {
    this.log(LogLevel.INFO, message, details);
  }

  /**
   * Log a message at WARN level
   * @param message Message to log
   * @param details Additional details
   */
  public warn(message: string, details?: unknown): void {
    this.log(LogLevel.WARN, message, details);
  }

  /**
   * Log a message at ERROR level
   * @param message Message to log
   * @param details Additional details or error
   */
  public error(message: string, details?: unknown): void {
    this.log(LogLevel.ERROR, message, details);
  }

  /**
   * Log a message at FATAL level
   * @param message Message to log
   * @param details Additional details or error
   */
  public fatal(message: string, details?: unknown): void {
    this.log(LogLevel.FATAL, message, details);
  }

  /**
   * Log a message
   * @param level Log level
   * @param message Message to log
   * @param details Additional details
   */
  public log(level: LogLevel, message: string, details?: unknown): void {
    // Check if level is sufficient
    if (level < this.config.minLevel!) {
      return;
    }

    // Extract error if details is an Error
    let error: Error | undefined;
    if (details instanceof Error) {
      error = details;
      details = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // Create log message
    const logMessage: LogMessage = {
      level,
      message,
      details,
      timestamp: new Date(),
      source: this.source,
      error,
    };

    // Add to entries
    this.entries.push(logMessage);
    if (this.entries.length > this.config.maxInMemoryEntries!) {
      this.entries.shift();
    }

    // Log to console if enabled
    if (this.config.enableConsole) {
      this.logToConsole(logMessage);
    }

    // Log to local storage if enabled
    if (this.config.enableLocalStorage) {
      this.logToLocalStorage(logMessage);
    }
  }

  /**
   * Get all log entries
   */
  public getEntries(): LogMessage[] {
    return [...this.entries];
  }

  /**
   * Clear log entries
   */
  public clearEntries(): void {
    this.entries = [];
    if (this.config.enableLocalStorage) {
      try {
        localStorage.removeItem(this.config.localStorageKey!);
      } catch (error) {
        this.logToConsole({
          level: LogLevel.ERROR,
          message: 'Failed to clear logs from local storage',
          details: error,
          timestamp: new Date(),
          source: this.source,
        });
      }
    }
  }

  /**
   * Set minimum log level
   * @param level Minimum log level
   */
  public setLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  /**
   * Get current configuration
   */
  public getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param config Updated configuration
   */
  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Create a child logger
   * @param source Source name
   */
  public createLogger(source: string): LoggingService {
    return new ConsoleLoggingService(this.config, source);
  }

  /**
   * Log to console
   * @param message Log message
   */
  private logToConsole(message: LogMessage): void {
    let prefix = '';
    
    if (this.config.includeTimestamp) {
      prefix += `[${this.formatTimestamp(message.timestamp)}] `;
    }
    
    if (this.config.includeSource && message.source) {
      prefix += `[${message.source}] `;
    }

    // Use custom formatter if available
    const formatter = this.config.formatters?.[message.level];
    if (formatter) {
      const formattedMessage = formatter(message);
      
      // Log with appropriate level
      this.consoleLogWithLevel(message.level, formattedMessage);
      return;
    }

    // Format message
    const formattedMessage = `${prefix}${message.message}`;
    
    // Log with appropriate level
    this.consoleLogWithLevel(message.level, formattedMessage, message.details, message.error);
  }

  /**
   * Log to console with appropriate level
   * @param level Log level
   * @param message Message
   * @param details Details
   * @param error Error
   */
  private consoleLogWithLevel(
    level: LogLevel,
    message: string,
    details?: unknown,
    error?: Error
  ): void {
    switch (level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        if (details) {
          console.debug(message, details);
        } else {
          console.debug(message);
        }
        break;
      case LogLevel.INFO:
        if (details) {
          console.info(message, details);
        } else {
          console.info(message);
        }
        break;
      case LogLevel.WARN:
        if (details) {
          console.warn(message, details);
        } else {
          console.warn(message);
        }
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        if (error) {
          console.error(message, error);
        } else if (details) {
          console.error(message, details);
        } else {
          console.error(message);
        }
        break;
    }
  }

  /**
   * Log to local storage
   * @param message Log message
   */
  private logToLocalStorage(message: LogMessage): void {
    try {
      // Get existing logs
      const storedLogs = localStorage.getItem(this.config.localStorageKey!);
      let logs: LogMessage[] = [];
      
      if (storedLogs) {
        logs = JSON.parse(storedLogs);
      }
      
      // Add new log
      logs.push(message);
      
      // Trim if needed
      if (logs.length > this.config.maxLocalStorageEntries!) {
        logs = logs.slice(-this.config.maxLocalStorageEntries!);
      }
      
      // Save logs
      localStorage.setItem(this.config.localStorageKey!, JSON.stringify(logs));
    } catch (error) {
      // Log to console if local storage fails
      this.logToConsole({
        level: LogLevel.ERROR,
        message: 'Failed to log to local storage',
        details: error,
        timestamp: new Date(),
        source: this.source,
      });
    }
  }

  /**
   * Format timestamp
   * @param date Date to format
   * @returns Formatted timestamp
   */
  private formatTimestamp(date: Date): string {
    return date.toISOString();
  }
} 