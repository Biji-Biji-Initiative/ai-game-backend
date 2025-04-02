// Types improved by ts-improve-types
import { ConfigManager } from './ConfigManager';
// Remove conflicting imports from utils/types
// import { ComponentLogger, Logger } from '../utils/logger';
// import { LogLevel } from '../types/logger';
import { Component } from '../types/component-base';
import { EventEmitter } from 'events'; // Keep Node.js events for now if needed
// import { LogOptions } from '../types/logger';
// import { ComponentLoggerOptions } from '../types/component-logger';

/**
 * Log levels enum
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
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

  // Add LogOptions properties if they were distinct and needed
  context?: string;
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
 * Component logger options
 */
export interface ComponentLoggerOptions {
  /**
   * Minimum log level
   */
  level?: LogLevel;

  /**
   * Whether to include timestamps
   */
  includeTimestamps?: boolean;

  /**
   * Additional context
   */
  context?: Record<string, unknown>;
}

/**
 * Component logger class for logging from specific components
 */
export class ComponentLogger {
  private componentName: string;
  private level: LogLevel;
  private includeTimestamps: boolean;
  private context: Record<string, unknown>;

  /**
   * Constructor
   * @param componentName Component name
   * @param options Options
   */
  constructor(componentName: string, options: ComponentLoggerOptions = {}) {
    this.componentName = componentName;
    this.level = options.level ?? LogLevel.INFO;
    this.includeTimestamps = options.includeTimestamps ?? true;
    this.context = options.context ?? {};
  }

  /**
   * Set the log level
   * @param level Log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Set context
   * @param context Context
   */
  setContext(context: Record<string, unknown> | string): void {
    if (typeof context === 'string') {
      this.componentName = context;
    } else {
      this.context = { ...this.context, ...context };
    }
  }

  /**
   * Debug log
   * @param message Message
   * @param data Optional data
   */
  debug(message: string, data?: unknown): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log('debug', message, data);
    }
  }

  /**
   * Info log
   * @param message Message
   * @param data Optional data
   */
  info(message: string, data?: unknown): void {
    if (this.level <= LogLevel.INFO) {
      this.log('info', message, data);
    }
  }

  /**
   * Warning log
   * @param message Message
   * @param data Optional data
   */
  warn(message: string, data?: unknown): void {
    if (this.level <= LogLevel.WARN) {
      this.log('warn', message, data);
    }
  }

  /**
   * Error log
   * @param message Message
   * @param data Optional data
   */
  error(message: string, data?: unknown): void {
    if (this.level <= LogLevel.ERROR) {
      this.log('error', message, data);
    }
  }

  /**
   * Log with level
   * @param level Log level
   * @param message Message
   * @param data Optional data
   */
  private log(level: string, message: string, data?: unknown): void {
    const timestamp = this.includeTimestamps ? new Date().toISOString() : '';
    const prefix = `[${this.componentName}]${timestamp ? ` ${timestamp}` : ''}`;
    
    if (data !== undefined) {
      switch (level) {
        case 'debug':
          console.debug(`${prefix} ${message}`, data);
          break;
        case 'info':
          console.info(`${prefix} ${message}`, data);
          break;
        case 'warn':
          console.warn(`${prefix} ${message}`, data);
          break;
        case 'error':
          console.error(`${prefix} ${message}`, data);
          break;
        default:
          console.log(`${prefix} ${message}`, data);
      }
    } else {
      switch (level) {
        case 'debug':
          console.debug(`${prefix} ${message}`);
          break;
        case 'info':
          console.info(`${prefix} ${message}`);
          break;
        case 'warn':
          console.warn(`${prefix} ${message}`);
          break;
        case 'error':
          console.error(`${prefix} ${message}`);
          break;
        default:
          console.log(`${prefix} ${message}`);
      }
    }
  }
}

/**
 * Logger class
 */
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private componentLoggers: Map<string, ComponentLogger> = new Map();

  /**
   * Get singleton instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Get component logger
   * @param component Component name
   */
  public static getLogger(component: string): ComponentLogger {
    return Logger.getInstance().getComponentLogger(component);
  }

  /**
   * Private constructor
   */
  private constructor() {
    // Initialize logger
  }

  /**
   * Set the global log level
   * @param level Log level
   */
  public setLevel(level: LogLevel): void {
    this.logLevel = level;
    
    // Update all component loggers
    this.componentLoggers.forEach(logger => {
      logger.setLevel(level);
    });
  }

  /**
   * Get component logger
   * @param component Component name
   * @returns Component logger
   */
  public getComponentLogger(component: string): ComponentLogger {
    // Create logger if it doesn't exist
    if (!this.componentLoggers.has(component)) {
      const logger = new ComponentLogger(component, {
        level: this.logLevel,
      });
      this.componentLoggers.set(component, logger);
    }
    
    return this.componentLoggers.get(component)!;
  }

  /**
   * Debug log
   * @param message Message
   * @param data Optional data
   */
  public debug(message: string, data?: unknown): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.debug(message, data);
    }
  }

  /**
   * Info log
   * @param message Message
   * @param data Optional data
   */
  public info(message: string, data?: unknown): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.info(message, data);
    }
  }

  /**
   * Warning log
   * @param message Message
   * @param data Optional data
   */
  public warn(message: string, data?: unknown): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(message, data);
    }
  }

  /**
   * Error log
   * @param message Message
   * @param data Optional data
   */
  public error(message: string, data?: unknown): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(message, data);
    }
  }
}
