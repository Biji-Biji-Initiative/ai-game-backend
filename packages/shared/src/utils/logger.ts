/**
 * Shared logger utility for consistent logging across packages
 */

/**
 * Basic logger interface
 */
export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

/**
 * Creates a logger with the given namespace
 * @param namespace Logger namespace
 * @returns Logger instance
 */
export function createLogger(namespace: string): Logger {
  return {
    info(message: string, meta?: Record<string, any>): void {
      console.info(`[INFO] [${namespace}] ${message}`, meta || '');
    },
    warn(message: string, meta?: Record<string, any>): void {
      console.warn(`[WARN] [${namespace}] ${message}`, meta || '');
    },
    error(message: string, meta?: Record<string, any>): void {
      console.error(`[ERROR] [${namespace}] ${message}`, meta || '');
    },
    debug(message: string, meta?: Record<string, any>): void {
      console.debug(`[DEBUG] [${namespace}] ${message}`, meta || '');
    }
  };
}
