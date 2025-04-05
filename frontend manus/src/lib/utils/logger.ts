/**
 * Logger utility for consistent logging across the application
 * This provides structured logging with levels, timestamps, and session tracking
 */

// Log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// Log entry structure
export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  sessionId?: string;
  source?: string;
}

// Storage key for logs
const LOGS_STORAGE_KEY = 'ai_fight_club_logs';

// Maximum number of logs to keep
const MAX_LOGS = 500;

class Logger {
  private sessionId: string | null = null;
  private listeners: Array<(entry: LogEntry) => void> = [];

  constructor() {
    // Generate a unique ID if this is a browser environment
    if (typeof window !== 'undefined') {
      this.sessionId = localStorage.getItem('ai_fight_club_session_id') || 
        `session_${Math.random().toString(36).substring(2, 10)}`;
    }
  }

  /**
   * Set the session ID for tracking
   */
  setSessionId(id: string): void {
    this.sessionId = id;
  }

  /**
   * Add a listener for real-time log updates
   */
  addListener(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Log a message at a specific level
   */
  private log(level: LogLevel, message: string, data?: unknown, source?: string): LogEntry {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      sessionId: this.sessionId || undefined,
      source
    };

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const consoleMethod = level === LogLevel.ERROR 
        ? console.error 
        : level === LogLevel.WARN 
          ? console.warn 
          : level === LogLevel.INFO 
            ? console.info 
            : console.debug;
      
      consoleMethod(`[${level}] ${message}`, data || '');
    }

    // Store in localStorage if available
    if (typeof window !== 'undefined') {
      try {
        // Get existing logs
        const existingLogs = this.getLogs();
        
        // Add new log and limit the number stored
        const updatedLogs = [entry, ...existingLogs].slice(0, MAX_LOGS);
        
        // Save to localStorage
        localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updatedLogs));
      } catch (error) {
        console.error('Failed to save log to localStorage:', error);
      }
    }

    // Notify listeners
    console.warn(`Logger: New log [${level}] from ${source || 'Unknown'}: ${message}`);
    this.listeners.forEach(listener => listener(entry));

    return entry;
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: unknown, source?: string): LogEntry {
    return this.log(LogLevel.DEBUG, message, data, source);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: unknown, source?: string): LogEntry {
    return this.log(LogLevel.INFO, message, data, source);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: unknown, source?: string): LogEntry {
    return this.log(LogLevel.WARN, message, data, source);
  }

  /**
   * Log an error message
   */
  error(message: string, data?: unknown, source?: string): LogEntry {
    return this.log(LogLevel.ERROR, message, data, source);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOGS_STORAGE_KEY);
    }
    
    // Notify listeners of the clear action
    this.listeners.forEach(listener => 
      listener({
        id: 'clear',
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        message: 'Logs cleared',
        sessionId: this.sessionId || undefined
      })
    );
  }

  /**
   * Export logs as a JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.getLogs(), null, 2);
  }

  /**
   * Get all logs from storage
   */
  getLogs(): LogEntry[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const logsString = localStorage.getItem(LOGS_STORAGE_KEY);
      return logsString ? JSON.parse(logsString) : [];
    } catch (error) {
      console.error('Failed to retrieve logs from localStorage:', error);
      return [];
    }
  }
}

// Create a singleton instance
const logger = new Logger();

export default logger;
