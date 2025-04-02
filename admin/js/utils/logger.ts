// Types improved by ts-improve-types
/**
 * Logger Utility
 * Provides standardized logging functionality
 */

export interface LogOptions {
  timestamp?: boolean;
  source?: string;
  context?: Record<string, unknown>;
  level?: LogLevel;
  prefix?: string;
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARNING',
  ERROR = 'ERROR',
}

/**
 * Logger class
 */
export class Logger {
  private static instance: Logger;
  private level: LogLevel;
  private prefix: string;
  private context: string | null = null;

  private constructor(options?: LogOptions) {
    this.level = options?.level || LogLevel.INFO;
    this.prefix = options?.prefix || '';
  }

  /**
   * Get logger instance (singleton)
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set context for all logs
   * @param context Context name
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Log a debug message
   * @param message Message to log
   * @param data Additional data
   * @param options Log options
   */
  debug(message: string, data?: unknown, options?: LogOptions): void {
    this.log(LogLevel.DEBUG, message, data, options);
  }

  /**
   * Log an info message
   * @param message Message to log
   * @param data Additional data
   * @param options Log options
   */
  info(message: string, data?: unknown, options?: LogOptions): void {
    this.log(LogLevel.INFO, message, data, options);
  }

  /**
   * Log a warning message
   * @param message Message to log
   * @param data Additional data
   * @param options Log options
   */
  warn(message: string, data?: unknown, options?: LogOptions): void {
    this.log(LogLevel.WARN, message, data, options);
  }

  /**
   * Log an error message
   * @param message Message to log
   * @param data Additional data
   * @param options Log options
   */
  error(message: string, data?: unknown, options?: LogOptions): void {
    this.log(LogLevel.ERROR, message, data, options);
  }

  // Core log method
  private log(level: LogLevel, message: string, data?: unknown, options?: LogOptions): void {
    if (level >= this.level) {
      const logContext = options?.context || this.context || '';
      const logPrefix = this.prefix ? `[${this.prefix}]` : '';
      const fullPrefix = `${logPrefix}${logContext ? `[${logContext}]` : ''}`;
      const timestamp = new Date().toISOString();

      const logArgs: unknown[] = [
        `%c${timestamp} %c${LogLevel[level as keyof typeof LogLevel]}%c ${fullPrefix} ${message}`,
        'color: gray',
        `color: ${this.getColor(level)}`,
        'color: inherit',
      ];

      if (data !== undefined) {
        logArgs.push(data);
      }

      // Use appropriate console method
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(...logArgs);
          break;
        case LogLevel.INFO:
          console.info(...logArgs);
          break;
        case LogLevel.WARN:
          console.warn(...logArgs);
          break;
        case LogLevel.ERROR:
          console.error(...logArgs);
          break;
        default:
          console.log(...logArgs);
      }
    }
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '#909090'; // Gray
      case LogLevel.INFO:
        return '#2196F3'; // Blue
      case LogLevel.WARN:
        return '#FFC107'; // Amber
      case LogLevel.ERROR:
        return '#F44336'; // Red
      default:
        return 'inherit';
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
