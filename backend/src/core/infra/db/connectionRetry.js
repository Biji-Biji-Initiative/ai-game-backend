/**
 * Database Connection Retry Utility
 * 
 * Provides retry functionality for database operations to handle transient
 * connection issues and improve application resilience.
 */

'use strict';

import { logger } from "#app/core/infra/logging/logger.js";
import { DatabaseError } from "#app/core/common/errors/DatabaseErrors.js";

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 500, // ms
  maxDelay: 5000, // ms
  backoffFactor: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'PROTOCOL_CONNECTION_LOST',
    'ECONNREFUSED',
    'socket hang up',
    'ConnectionError',
    'ConnectionTimeoutError',
    'ConnectionClosed'
  ]
};

/**
 * Determines if an error is retryable based on error type and message patterns
 * @param {Error} error - The error to evaluate
 * @param {Array<string>} retryableErrors - List of error codes/messages that should be retried
 * @returns {boolean} True if the error should be retried, false otherwise
 */
function isRetryableError(error, retryableErrors = DEFAULT_RETRY_CONFIG.retryableErrors) {
  if (!error) return false;
  
  // Check error code
  if (error.code && retryableErrors.includes(error.code)) {
    return true;
  }
  
  // Check error message
  if (error.message) {
    return retryableErrors.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  // Special case for Supabase
  if (error.name === 'FetchError' || 
      error.message?.includes('fetch failed') ||
      error.message?.includes('network error')) {
    return true;
  }
  
  return false;
}

/**
 * Calculate delay time using exponential backoff
 * @param {number} attempt - The current attempt number (0-based)
 * @param {Object} config - Retry configuration 
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt, config = DEFAULT_RETRY_CONFIG) {
  const delay = Math.min(
    config.maxDelay,
    config.initialDelay * Math.pow(config.backoffFactor, attempt)
  );
  
  // Add some jitter (±20%) to prevent thundering herd problem
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return delay + jitter;
}

/**
 * Sleep for a specified amount of time
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes a database operation with automatic retries on transient errors
 * 
 * @param {Function} operation - Async function that performs the database operation
 * @param {Object} options - Configuration options
 * @param {string} options.context - Context description for logging
 * @param {number} options.maxRetries - Maximum number of retry attempts
 * @param {number} options.initialDelay - Initial delay in ms
 * @param {number} options.maxDelay - Maximum delay in ms
 * @param {number} options.backoffFactor - Exponential backoff multiplier
 * @param {Array<string>} options.retryableErrors - List of error messages/codes to retry
 * @returns {Promise} Result of the operation
 * @throws {DatabaseError} On operation failure after all retries
 */
async function withRetry(operation, options = {}) {
  // Merge options with defaults
  const config = {
    ...DEFAULT_RETRY_CONFIG,
    ...options
  };
  
  const context = options.context || 'database operation';
  let lastError = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // If not the first attempt, log retry info
      if (attempt > 0) {
        logger.info(`Retry attempt ${attempt}/${config.maxRetries} for ${context}`);
      }
      
      // Perform the operation
      return await operation();
      
    } catch (error) {
      lastError = error;
      
      // Determine if we should retry
      const shouldRetry = 
        attempt < config.maxRetries && 
        isRetryableError(error, config.retryableErrors);
      
      if (shouldRetry) {
        // Calculate and apply backoff delay
        const delay = calculateBackoffDelay(attempt, config);
        
        logger.warn(`Database operation failed (${context}), retrying in ${Math.round(delay)}ms`, {
          error: error.message,
          attempt: attempt + 1,
          maxRetries: config.maxRetries,
          delay
        });
        
        await sleep(delay);
      } else {
        // We're out of retries or it's not a retryable error
        break;
      }
    }
  }
  
  // If we got here, all retries failed
  const wrappedError = new DatabaseError(
    `${context} failed after ${config.maxRetries} retries: ${lastError.message}`,
    lastError
  );
  
  logger.error(`Database operation permanently failed (${context})`, {
    error: lastError.message,
    retries: config.maxRetries,
    stack: lastError.stack
  });
  
  throw wrappedError;
}

/**
 * Creates a wrapper around a database client that adds retry capability
 * to all of its methods.
 * 
 * @param {Object} client - The database client to wrap
 * @param {Object} config - Retry configuration
 * @returns {Object} A wrapped client with retry capabilities
 */
function createRetryableClient(client, config = DEFAULT_RETRY_CONFIG) {
  if (!client) {
    throw new Error('Cannot create retryable client from null or undefined');
  }
  
  // Create a proxy that intercepts method calls and adds retry logic
  return new Proxy(client, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);
      
      // Only add retry logic to functions
      if (typeof original === 'function') {
        return async function(...args) {
          return withRetry(
            () => original.apply(target, args),
            {
              ...config,
              context: `${typeof target.constructor === 'function' ? target.constructor.name : 'DbClient'}.${prop}`
            }
          );
        };
      }
      
      return original;
    }
  });
}

export {
  withRetry,
  createRetryableClient,
  isRetryableError,
  calculateBackoffDelay
}; 