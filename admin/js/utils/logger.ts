/**
 * Logger Utility
 * Provides logging functionality with different severity levels
 */

/**
 *
 */
export class Logger {
  // Log levels
  static LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4,
  };

  // Level names for display
  static LEVEL_NAMES = {
    0: 'DEBUG',
    1: 'INFO',
    2: 'WARN',
    3: 'ERROR',
    4: 'NONE',
  };

  /**
   * Creates a new Logger instance
   * @param {Object} options - Logger options
   */
  constructor(options = {}) {
    this.options = {
      level: Logger.LEVELS.INFO, // Default to INFO level
      enableTimestamps: true,
      consoleOutput: true, // Output to console
      fileOutput: false, // Output to file (not implemented in browser)
      ...options,
    };

    // Initialize log storage if needed
    if (this.options.storeInMemory) {
      this.logs = [];
    }
  }

  /**
   * Sets the log level
   * @param {string|number} level - The log level (can be string name or number)
   */
  setLevel(level) {
    if (typeof level === 'string') {
      const upperLevel = level.toUpperCase();
      if (upperLevel in Logger.LEVELS) {
        this.options.level = Logger.LEVELS[upperLevel];
      } else {
        console.warn(`Invalid log level: ${level}. Defaulting to INFO.`);
        this.options.level = Logger.LEVELS.INFO;
      }
    } else if (typeof level === 'number' && level >= 0 && level <= 4) {
      this.options.level = level;
    } else {
      console.warn(`Invalid log level: ${level}. Defaulting to INFO.`);
      this.options.level = Logger.LEVELS.INFO;
    }
  }

  /**
   * Gets the current log level name
   * @returns {string} The current log level name
   */
  getLevelName() {
    return Logger.LEVEL_NAMES[this.options.level];
  }

  /**
   * Formats a log message
   * @param {string} level - The log level
   * @param {string} message - The log message
   * @param {Array} args - Additional arguments to log
   * @returns {Object} The formatted log entry
   */
  formatLogEntry(level, message, args) {
    const timestamp = this.options.enableTimestamps ? new Date() : null;

    return {
      level,
      message,
      timestamp,
      args: args.length > 0 ? args : undefined,
    };
  }

  /**
   * Logs a message if the level is sufficient
   * @param {number} level - The numeric log level
   * @param {string} levelName - The log level name
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  log(level, levelName, message, ...args) {
    // Only log if the level is sufficient
    if (level >= this.options.level) {
      const logEntry = this.formatLogEntry(levelName, message, args);

      // Output to console if enabled
      if (this.options.consoleOutput) {
        const method =
          level === Logger.LEVELS.DEBUG
            ? 'debug'
            : level === Logger.LEVELS.INFO
              ? 'info'
              : level === Logger.LEVELS.WARN
                ? 'warn'
                : 'error';

        const prefix = this.options.enableTimestamps
          ? `[${logEntry.timestamp.toISOString()}] [${levelName}]`
          : `[${levelName}]`;

        if (args.length > 0) {
          console[method](prefix, message, ...args);
        } else {
          console[method](prefix, message);
        }
      }

      // Store in memory if enabled
      if (this.options.storeInMemory) {
        this.logs.push(logEntry);

        // Trim logs if maxLogsInMemory is set
        if (this.options.maxLogsInMemory && this.logs.length > this.options.maxLogsInMemory) {
          this.logs = this.logs.slice(-this.options.maxLogsInMemory);
        }
      }
    }
  }

  /**
   * Logs a debug message
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  debug(message, ...args) {
    this.log(Logger.LEVELS.DEBUG, 'DEBUG', message, ...args);
  }

  /**
   * Logs an info message
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  info(message, ...args) {
    this.log(Logger.LEVELS.INFO, 'INFO', message, ...args);
  }

  /**
   * Logs a warning message
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  warn(message, ...args) {
    this.log(Logger.LEVELS.WARN, 'WARN', message, ...args);
  }

  /**
   * Logs an error message
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  error(message, ...args) {
    this.log(Logger.LEVELS.ERROR, 'ERROR', message, ...args);
  }

  /**
   * Returns all logs stored in memory
   * @returns {Array} The logs stored in memory
   */
  getLogs() {
    return this.options.storeInMemory ? [...this.logs] : [];
  }

  /**
   * Clears all logs stored in memory
   */
  clearLogs() {
    if (this.options.storeInMemory) {
      this.logs = [];
    }
  }
}
