import { ConfigManager } from './ConfigManager';

/**
 * Log levels with corresponding numeric values
 */
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4
}

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  /**
   * Minimum log level to display (default: LogLevel.ERROR)
   */
  level?: LogLevel;
  
  /**
   * Enable timestamp in logs (default: true)
   */
  showTimestamp?: boolean;
  
  /**
   * Enable component name in logs (default: true)
   */
  showComponent?: boolean;
  
  /**
   * Enable log level in output (default: true)
   */
  showLevel?: boolean;
  
  /**
   * Custom prefix for all logs (default: none)
   */
  prefix?: string;
}

/**
 * Default logger options
 */
const DEFAULT_OPTIONS: LoggerOptions = {
  level: LogLevel.ERROR,
  showTimestamp: true,
  showComponent: true,
  showLevel: true,
  prefix: '',
};

/**
 * Logger class for consistent application logging
 */
export class Logger {
  private static instance: Logger;
  private options: LoggerOptions;
  
  /**
   * Get the singleton instance of Logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  /**
   * Get a component-specific logger
   * @param component Component name
   */
  public static getLogger(component: string): ComponentLogger {
    return new ComponentLogger(component, Logger.getInstance());
  }
  
  /**
   * Private constructor to prevent direct creation
   */
  private constructor() {
    // Get default log level from config if available
    const config = ConfigManager.getInstance();
    const configLevel = config.get('logLevel');
    let level = DEFAULT_OPTIONS.level;
    
    if (configLevel) {
      switch (configLevel) {
        case 'error': level = LogLevel.ERROR; break;
        case 'warn': level = LogLevel.WARN; break;
        case 'info': level = LogLevel.INFO; break;
        case 'debug': level = LogLevel.DEBUG; break;
        case 'none': level = LogLevel.NONE; break;
      }
    }
    
    this.options = {
      ...DEFAULT_OPTIONS,
      level,
    };
  }
  
  /**
   * Configure the logger
   * @param options Logger options
   */
  public configure(options: LoggerOptions): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * Get current logger options
   */
  public getOptions(): LoggerOptions {
    return { ...this.options };
  }
  
  /**
   * Set the current log level
   * @param level New log level
   */
  public setLevel(level: LogLevel): void {
    this.options.level = level;
  }
  
  /**
   * Log an error message
   * @param component Component name
   * @param message Error message
   * @param args Additional arguments
   */
  public error(component: string, message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, component, message, args);
  }
  
  /**
   * Log a warning message
   * @param component Component name
   * @param message Warning message
   * @param args Additional arguments
   */
  public warn(component: string, message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, component, message, args);
  }
  
  /**
   * Log an info message
   * @param component Component name
   * @param message Info message
   * @param args Additional arguments
   */
  public info(component: string, message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, component, message, args);
  }
  
  /**
   * Log a debug message
   * @param component Component name
   * @param message Debug message
   * @param args Additional arguments
   */
  public debug(component: string, message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, component, message, args);
  }
  
  /**
   * Internal log method
   * @param level Log level
   * @param component Component name
   * @param message Log message
   * @param args Additional arguments
   */
  private log(level: LogLevel, component: string, message: string, args: any[]): void {
    // Check if we should log this level
    if (!this.options.level || level > this.options.level) {
      return;
    }
    
    // Build log prefix
    let prefix = this.options.prefix ? `${this.options.prefix} ` : '';
    
    // Add timestamp if enabled
    if (this.options.showTimestamp) {
      const now = new Date();
      prefix += `[${now.toISOString()}] `;
    }
    
    // Add log level if enabled
    if (this.options.showLevel) {
      const levelName = LogLevel[level];
      prefix += `${levelName} `;
    }
    
    // Add component name if enabled
    if (this.options.showComponent && component) {
      prefix += `[${component}] `;
    }
    
    // Select console method based on level
    let method: 'error' | 'warn' | 'info' | 'debug' | 'log';
    switch (level) {
      case LogLevel.ERROR: method = 'error'; break;
      case LogLevel.WARN: method = 'warn'; break;
      case LogLevel.INFO: method = 'info'; break;
      case LogLevel.DEBUG: method = 'debug'; break;
      default: method = 'log';
    }
    
    // Log the message
    if (args.length > 0) {
      console[method](prefix + message, ...args);
    } else {
      console[method](prefix + message);
    }
  }
}

/**
 * Component-specific logger that remembers the component name
 */
export class ComponentLogger {
  private component: string;
  private logger: Logger;
  
  /**
   * Create a new component logger
   * @param component Component name
   * @param logger Parent logger
   */
  constructor(component: string, logger: Logger) {
    this.component = component;
    this.logger = logger;
  }
  
  /**
   * Log an error message
   * @param message Error message
   * @param args Additional arguments
   */
  public error(message: string, ...args: any[]): void {
    this.logger.error(this.component, message, ...args);
  }
  
  /**
   * Log a warning message
   * @param message Warning message
   * @param args Additional arguments
   */
  public warn(message: string, ...args: any[]): void {
    this.logger.warn(this.component, message, ...args);
  }
  
  /**
   * Log an info message
   * @param message Info message
   * @param args Additional arguments
   */
  public info(message: string, ...args: any[]): void {
    this.logger.info(this.component, message, ...args);
  }
  
  /**
   * Log a debug message
   * @param message Debug message
   * @param args Additional arguments
   */
  public debug(message: string, ...args: any[]): void {
    this.logger.debug(this.component, message, ...args);
  }
} 