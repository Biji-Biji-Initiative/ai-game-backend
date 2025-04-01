/**
 * Logger Utility
 * Provides consistent logging throughout the application
 */

/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  maxEntries: number;
  prefix: string;
}

/**
 * Log entry interface
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: 'info',
  enableConsole: true,
  maxEntries: 1000,
  prefix: '[Admin UI]'
};

/**
 * Level priority map (higher number = higher priority)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * Logger class
 */
class Logger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];
  private listeners: Set<(entry: LogEntry) => void> = new Set();

  /**
   * Create a new Logger instance
   * @param config Logger configuration
   */
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Log a message at debug level
   * @param message Log message
   * @param data Optional data to log
   */
  public debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  /**
   * Log a message at info level
   * @param message Log message
   * @param data Optional data to log
   */
  public info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * Log a message at warn level
   * @param message Log message
   * @param data Optional data to log
   */
  public warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * Log a message at error level
   * @param message Log message
   * @param data Optional data to log
   */
  public error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  /**
   * Log a message at the specified level
   * @param level Log level
   * @param message Log message
   * @param data Optional data to log
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // Check if this level should be logged
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.level]) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      level,
      message: `${this.config.prefix} ${message}`,
      timestamp: new Date().toISOString(),
      data
    };

    // Add to entries
    this.entries.push(entry);

    // Trim entries if needed
    if (this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(-this.config.maxEntries);
    }

    // Console output if enabled
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // Notify listeners
    this.notifyListeners(entry);
  }

  /**
   * Output a log entry to the console
   * @param entry Log entry to output
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}]${entry.message}`;

    switch (entry.level) {
      case 'debug':
        console.debug(prefix, entry.data || '');
        break;
      case 'info':
        console.info(prefix, entry.data || '');
        break;
      case 'warn':
        console.warn(prefix, entry.data || '');
        break;
      case 'error':
        console.error(prefix, entry.data || '');
        break;
    }
  }

  /**
   * Get all log entries
   * @returns Array of log entries
   */
  public getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Get log entries filtered by level
   * @param level Minimum log level to include
   * @returns Filtered log entries
   */
  public getEntriesByLevel(level: LogLevel): LogEntry[] {
    const levelPriority = LOG_LEVEL_PRIORITY[level];
    return this.entries.filter(entry => LOG_LEVEL_PRIORITY[entry.level] >= levelPriority);
  }

  /**
   * Clear all log entries
   */
  public clearEntries(): void {
    this.entries = [];
  }

  /**
   * Update logger configuration
   * @param config New configuration (partial)
   */
  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add a log entry listener
   * @param listener Function to call when a new log entry is added
   */
  public addListener(listener: (entry: LogEntry) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove a log entry listener
   * @param listener Listener to remove
   */
  public removeListener(listener: (entry: LogEntry) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of a new log entry
   * @param entry Log entry to notify about
   */
  private notifyListeners(entry: LogEntry): void {
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        console.error('Error in log listener:', error);
      }
    });
  }
}

// Export singleton logger instance
export const logger = new Logger();
