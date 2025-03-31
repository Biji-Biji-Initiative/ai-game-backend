/**
 * Circuit Breaker for OpenAI API
 * 
 * Implements the Circuit Breaker pattern to handle OpenAI API failures gracefully.
 * This helps prevent cascading failures when the OpenAI API is experiencing issues.
 */

import CircuitBreaker from 'opossum';
import domainLogger from '../logging/domainLogger.js';

const { apiLogger } = domainLogger;

/**
 * Default circuit breaker options
 */
const DEFAULT_OPTIONS = {
  // The number of failures before opening the circuit
  failureThreshold: 50,
  // The percentage of failures that will open the circuit (0-100)
  failurePercentage: 50,
  // The time in milliseconds to wait before trying to close the circuit again
  resetTimeout: 30000, // 30 seconds
  // The time in milliseconds after which a request will timeout
  timeout: 10000, // 10 seconds
  // Cache size for client-side caching of successful responses
  cacheSizeMax: 100,
  // Maximum number of queued requests when the circuit is half-open
  halfOpenQueueSize: 10,
  // Error codes that should not count as failures (temporary issues)
  ignoredErrorCodes: [
    'rate_limit_exceeded',
    'timeout',
    'context_length_exceeded',
    'tokens_exceeded'
  ]
};

/**
 * Creates a circuit breaker for OpenAI API calls
 * 
 * @param {Function} apiFunction - The OpenAI API function to protect with the circuit breaker
 * @param {Object} options - Circuit breaker configuration options
 * @param {Object} logger - Logger instance
 * @returns {CircuitBreaker} The configured circuit breaker
 */
export function createOpenAICircuitBreaker(apiFunction, options = {}, logger = null) {
  const log = logger || apiLogger.child('openai:circuit-breaker');
  const circuitOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // Create the circuit breaker
  const breaker = new CircuitBreaker(apiFunction, circuitOptions);
  
  // Set up event listeners
  breaker.on('open', () => {
    log.warn('OpenAI circuit breaker has opened - API calls will fail fast', {
      failureCount: breaker.stats.failures,
      failurePercentage: breaker.stats.failures / breaker.stats.total * 100,
      total: breaker.stats.total
    });
  });
  
  breaker.on('halfOpen', () => {
    log.info('OpenAI circuit breaker is half-open - testing the connection');
  });
  
  breaker.on('close', () => {
    log.info('OpenAI circuit breaker has closed - API calls are now being allowed');
  });
  
  breaker.on('fallback', (result) => {
    log.warn('OpenAI circuit breaker fallback executed', {
      error: result?.message || 'Unknown error'
    });
  });

  breaker.on('timeout', (delay) => {
    log.warn('OpenAI API call timed out', { timeoutMs: delay });
  });

  breaker.on('reject', () => {
    log.warn('OpenAI API call was rejected (circuit open)');
  });

  breaker.on('success', () => {
    log.debug('OpenAI API call completed successfully');
  });

  breaker.on('failure', (error) => {
    // Check if this is an error we should ignore for circuit breaking
    const errorCode = error?.code || error?.error?.code;
    
    if (circuitOptions.ignoredErrorCodes.includes(errorCode)) {
      log.info('OpenAI API call failed but with ignorable error code', { 
        errorCode,
        message: error.message
      });
      // Return true to indicate this failure should not count toward the circuit breaker threshold
      return true;
    }
    
    log.error('OpenAI API call failed', {
      errorCode,
      message: error.message,
      failureCount: breaker.stats.failures,
      total: breaker.stats.total
    });
    
    // Return false to count this as a failure for the circuit breaker
    return false;
  });
  
  return breaker;
}

/**
 * Wraps all methods of an OpenAI client with circuit breakers
 * 
 * @param {Object} client - The OpenAI client instance
 * @param {Object} options - Circuit breaker configuration options
 * @param {Object} logger - Logger instance
 * @returns {Object} A new client with all methods wrapped in circuit breakers
 */
export function wrapClientWithCircuitBreaker(client, options = {}, logger = null) {
  const log = logger || apiLogger.child('openai:circuit-breaker');
  
  // Create a proxy handler that wraps methods with circuit breakers on-demand
  const handler = {
    get(target, prop) {
      const value = target[prop];
      
      // Only create circuit breakers for functions
      if (typeof value !== 'function' || prop === 'constructor') {
        return value;
      }
      
      // Different circuit breaker for each API method
      const breakerName = `openai:${prop}`;
      const methodOptions = { 
        ...options, 
        name: breakerName 
      };
      
      // Create a function wrapper for the method
      const wrapped = function(...args) {
        const breaker = createOpenAICircuitBreaker(
          () => value.apply(target, args),
          methodOptions,
          log
        );
        
        // Define fallback behavior for when the circuit is open
        breaker.fallback(() => {
          const error = new Error(`OpenAI API call to ${prop} failed (circuit open)`);
          error.code = 'circuit_open';
          error.isCircuitBreakerError = true;
          throw error;
        });
        
        return breaker.fire();
      };
      
      return wrapped;
    }
  };
  
  // Create a proxy that wraps the client methods
  return new Proxy(client, handler);
}

export default {
  createOpenAICircuitBreaker,
  wrapClientWithCircuitBreaker
}; 