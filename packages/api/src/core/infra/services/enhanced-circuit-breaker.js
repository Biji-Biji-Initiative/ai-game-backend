/**
 * Enhanced Circuit Breaker with Advanced Logging
 * 
 * This module extends the Opossum circuit breaker with advanced logging capabilities,
 * detailed state tracking, and integration with the monitoring system.
 */

import CircuitBreaker from 'opossum';
import { logger as defaultLogger } from '../logging/enhancedLogger.js';
import * as Sentry from '@sentry/node';

// Default circuit breaker options with sensible defaults
const DEFAULT_OPTIONS = {
  // Trip circuit after 5 consecutive failures
  failureThreshold: 5,
  // Reset circuit after 10 seconds
  resetTimeout: 10000,
  // Consider operation failed if it takes more than 5 seconds
  timeout: 5000,
  // Enable execution statistics for more insights
  rollingCountTimeout: 60000,
  // Number of buckets for rolling statistics
  rollingCountBuckets: 10,
  // Capacity of the execution queue
  capacity: 10,
  // Error codes to not count as failures
  ignoredErrorCodes: ['ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH']
};

/**
 * Categorize errors for better monitoring and analysis
 * @param {Error} error - The error to categorize
 * @returns {string} Error category
 */
function categorizeError(error) {
  if (!error) return 'unknown';
  
  // If error has a specific category already, use that
  if (error.category) return error.category;
  
  // Check for network/connection errors
  if (
    error.code === 'ETIMEDOUT' || 
    error.code === 'ECONNREFUSED' || 
    error.code === 'EHOSTUNREACH' ||
    error.code === 'ECONNRESET' ||
    error.message?.includes('network') ||
    error.message?.includes('connection')
  ) {
    return 'network';
  }
  
  // Check for timeout errors
  if (
    error.code === 'TIMEOUT' || 
    error.message?.includes('timeout') ||
    error.message?.includes('timed out')
  ) {
    return 'timeout';
  }
  
  // Check for rate limit errors
  if (
    error.code === 'RATE_LIMIT' || 
    error.code === 'TOO_MANY_REQUESTS' ||
    error.status === 429 ||
    error.statusCode === 429 ||
    error.message?.includes('rate limit') ||
    error.message?.includes('too many requests')
  ) {
    return 'rate_limit';
  }
  
  // Check for authentication errors
  if (
    error.code === 'UNAUTHORIZED' || 
    error.code === 'FORBIDDEN' ||
    error.status === 401 ||
    error.status === 403 ||
    error.statusCode === 401 ||
    error.statusCode === 403 ||
    error.message?.includes('unauthorized') ||
    error.message?.includes('forbidden') ||
    error.message?.includes('authentication')
  ) {
    return 'auth';
  }
  
  // Check for server errors
  if (
    error.status >= 500 ||
    error.statusCode >= 500 ||
    error.message?.includes('server error')
  ) {
    return 'server';
  }
  
  // Check for client errors
  if (
    error.status >= 400 && error.status < 500 ||
    error.statusCode >= 400 && error.statusCode < 500
  ) {
    return 'client';
  }
  
  // Default to 'unknown' category
  return 'unknown';
}

/**
 * Create a health status object from circuit breaker statistics
 * @param {CircuitBreaker} circuitBreaker - The circuit breaker instance
 * @returns {Object} Health status object
 */
function createHealthStatus(circuitBreaker) {
  const stats = circuitBreaker.stats;
  const total = stats.successes + stats.failures + stats.rejects + stats.timeouts;
  
  return {
    name: circuitBreaker.name,
    state: circuitBreaker.status.state,
    metrics: {
      total,
      successes: stats.successes,
      failures: stats.failures,
      rejects: stats.rejects,
      timeouts: stats.timeouts,
      percentiles: {
        success: total > 0 ? ((stats.successes / total) * 100).toFixed(2) : 100,
        failure: total > 0 ? ((stats.failures / total) * 100).toFixed(2) : 0,
        rejection: total > 0 ? ((stats.rejects / total) * 100).toFixed(2) : 0,
        timeout: total > 0 ? ((stats.timeouts / total) * 100).toFixed(2) : 0,
      },
      latency: {
        mean: stats.latency?.mean || 0,
        p90: stats.latency?.p90 || 0,
        p95: stats.latency?.p95 || 0,
        p99: stats.latency?.p99 || 0,
      }
    },
    healthy: circuitBreaker.status.state !== 'open',
    lastError: circuitBreaker.status.lastError?.message,
    lastErrorTime: circuitBreaker.status.lastError ? new Date().toISOString() : null,
  };
}

/**
 * Enhanced Circuit Breaker class that adds better logging and monitoring
 */
class EnhancedCircuitBreaker {
  /**
   * Create a new enhanced circuit breaker
   * @param {Function} action - The function to protect with a circuit breaker
   * @param {string} name - Name of the circuit breaker for identification
   * @param {Object} options - Circuit breaker options
   * @param {Object} logger - Logger instance to use
   */
  constructor(action, name, options = {}, logger = defaultLogger) {
    this.name = name;
    this.logger = logger.child(`circuit-breaker:${name}`);
    
    // Merge default options with provided options
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      name,
    };
    
    // Create the underlying circuit breaker
    this.circuitBreaker = new CircuitBreaker(action, this.options);
    
    // Set up enhanced event logging
    this._setupEventLogging();
    
    // Log initialization
    this.logger.info('Circuit breaker initialized', {
      name,
      options: this.options
    });
  }
  
  /**
   * Set up enhanced event logging for the circuit breaker
   * @private
   */
  _setupEventLogging() {
    // Log when circuit opens
    this.circuitBreaker.on('open', () => {
      const status = createHealthStatus(this.circuitBreaker);
      this.logger.warn('Circuit breaker opened', {
        name: this.name,
        failures: this.circuitBreaker.stats.failures,
        failureRate: status.metrics.percentiles.failure,
        latency: status.metrics.latency.mean,
        lastError: this.circuitBreaker.status.lastError?.message,
        lastErrorCategory: categorizeError(this.circuitBreaker.status.lastError),
      });
      
      // Report to Sentry for monitoring
      Sentry.captureMessage(`Circuit breaker ${this.name} opened`, {
        level: Sentry.Severity.Warning,
        tags: {
          name: this.name,
          state: 'open',
        },
        extra: status
      });
    });
    
    // Log when circuit closes
    this.circuitBreaker.on('close', () => {
      const recoveryTime = Date.now() - (this.circuitBreaker.stats.lastOpenTime || Date.now());
      this.logger.info('Circuit breaker closed', {
        name: this.name,
        recoveryTime
      });
      
      // Report to Sentry for monitoring
      Sentry.captureMessage(`Circuit breaker ${this.name} closed`, {
        level: Sentry.Severity.Info,
        tags: {
          name: this.name,
          state: 'closed',
        }
      });
    });
    
    // Log when circuit is half-open
    this.circuitBreaker.on('halfOpen', () => {
      const openTime = Date.now() - (this.circuitBreaker.stats.lastOpenTime || Date.now());
      this.logger.info('Circuit breaker half-opened', {
        name: this.name,
        openTime
      });
    });
    
    // Log all failures with detailed information
    this.circuitBreaker.on('failure', (error) => {
      const status = createHealthStatus(this.circuitBreaker);
      const errorCategory = categorizeError(error);
      
      this.logger.error('Circuit breaker operation failed', {
        name: this.name,
        error: error.message,
        errorCode: error.code,
        errorStatus: error.status || error.statusCode,
        errorCategory,
        stack: error.stack,
        stats: {
          failures: this.circuitBreaker.stats.failures,
          successes: this.circuitBreaker.stats.successes,
          rejects: this.circuitBreaker.stats.rejects,
          timeouts: this.circuitBreaker.stats.timeouts,
          failureRate: status.metrics.percentiles.failure
        }
      });
      
      // Track error metrics in Sentry
      Sentry.addBreadcrumb({
        category: 'circuit-breaker',
        message: `Circuit breaker ${this.name} failure: ${error.message}`,
        level: 'error',
        data: {
          name: this.name,
          errorCategory,
          stats: {
            failures: this.circuitBreaker.stats.failures,
            failureRate: status.metrics.percentiles.failure
          }
        }
      });
    });
    
    // Log rejections (when circuit is open)
    this.circuitBreaker.on('reject', () => {
      const status = createHealthStatus(this.circuitBreaker);
      
      this.logger.warn('Circuit breaker rejected operation', {
        name: this.name,
        state: this.circuitBreaker.status.state,
        stats: {
          rejects: this.circuitBreaker.stats.rejects,
          failures: this.circuitBreaker.stats.failures,
          totalRejectRate: status.metrics.percentiles.rejection
        }
      });
    });
    
    // Log timeouts
    this.circuitBreaker.on('timeout', () => {
      const status = createHealthStatus(this.circuitBreaker);
      
      this.logger.warn('Circuit breaker operation timed out', {
        name: this.name,
        timeout: this.options.timeout,
        stats: {
          timeouts: this.circuitBreaker.stats.timeouts,
          totalTimeoutRate: status.metrics.percentiles.timeout
        }
      });
    });
    
    // Log successful operations (at debug level to avoid excessive logging)
    this.circuitBreaker.on('success', () => {
      this.logger.debug('Circuit breaker operation succeeded', {
        name: this.name,
        successes: this.circuitBreaker.stats.successes
      });
    });
    
    // Additional logs for fallback executions
    if (this.options.fallback) {
      this.circuitBreaker.on('fallback', (result) => {
        this.logger.info('Circuit breaker used fallback', {
          name: this.name,
          state: this.circuitBreaker.status.state
        });
      });
    }
  }
  
  /**
   * Execute an operation through the circuit breaker
   * @param  {...any} args - Arguments to pass to the action function
   * @returns {Promise} Result of the action function or fallback
   */
  async execute(...args) {
    // Create context ID for tracing this specific execution
    const executionId = `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    // Start performance timer
    const timer = this.logger.timer(`${this.name} execution`);
    
    // Log at the start of execution
    this.logger.debug('Circuit breaker executing operation', {
      name: this.name,
      executionId,
      state: this.circuitBreaker.status.state,
      args: JSON.stringify(args).length > 100 
        ? JSON.stringify(args).substr(0, 100) + '...' 
        : args
    });
    
    try {
      // Execute the operation
      const result = await this.circuitBreaker.fire(...args);
      
      // End timer and log success
      timer.mark('completed').end({
        name: this.name,
        executionId,
        state: this.circuitBreaker.status.state,
        result: result ? 'success' : 'empty'
      }, 'debug');
      
      return result;
    } catch (error) {
      // End timer and log error
      timer.mark('error').end({
        name: this.name,
        executionId,
        state: this.circuitBreaker.status.state,
        error: error.message,
        errorCategory: categorizeError(error)
      }, 'error');
      
      // Re-throw error
      throw error;
    }
  }
  
  /**
   * Get detailed health status of the circuit breaker
   * @returns {Object} Health status object
   */
  getStatus() {
    return createHealthStatus(this.circuitBreaker);
  }
  
  /**
   * Check if the circuit is healthy (closed or half-open)
   * @returns {boolean} True if circuit is closed or half-open
   */
  isHealthy() {
    return this.circuitBreaker.status.state !== 'open';
  }
  
  /**
   * Reset the circuit breaker statistics
   */
  resetStats() {
    // Reset underlying stats
    this.circuitBreaker.stats = this.circuitBreaker.stats.reset();
    
    this.logger.info('Circuit breaker statistics reset', {
      name: this.name
    });
  }
  
  /**
   * Force the circuit into a specific state
   * @param {string} state - State to force ('open', 'closed', 'half-open')
   */
  forceState(state) {
    if (state === 'open') {
      this.circuitBreaker.open();
    } else if (state === 'closed') {
      this.circuitBreaker.close();
    } else if (state === 'half-open') {
      this.circuitBreaker.halfOpen();
    } else {
      throw new Error(`Invalid circuit state: ${state}`);
    }
    
    this.logger.warn(`Circuit breaker state manually forced to ${state}`, {
      name: this.name,
      forcedBy: 'manual',
      prevState: this.circuitBreaker.status.state
    });
  }
}

// Factory to create specialized circuit breakers for different services
class CircuitBreakerFactory {
  constructor(options = {}, logger = defaultLogger) {
    this.baseOptions = options;
    this.logger = logger.child('circuit-breaker-factory');
    this.instances = new Map();
  }
  
  /**
   * Create or get a circuit breaker instance
   * @param {Function} action - The function to protect
   * @param {string} name - Name of the circuit breaker
   * @param {Object} options - Circuit breaker options
   * @returns {EnhancedCircuitBreaker} Circuit breaker instance
   */
  create(action, name, options = {}) {
    // Check if instance already exists
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }
    
    // Merge options with base options
    const mergedOptions = {
      ...this.baseOptions,
      ...options
    };
    
    // Create new instance
    const instance = new EnhancedCircuitBreaker(
      action,
      name,
      mergedOptions,
      this.logger
    );
    
    // Store for reuse
    this.instances.set(name, instance);
    
    return instance;
  }
  
  /**
   * Create a circuit breaker specifically optimized for OpenAI API
   * @param {Function} action - The API call function to protect
   * @param {string} name - Name of the circuit breaker
   * @param {Object} options - Additional options
   * @returns {EnhancedCircuitBreaker} Circuit breaker instance
   */
  createForOpenAI(action, name, options = {}) {
    // Get service-specific logger
    const openAILogger = this.logger.child(`openai:${name}`);
    
    // Set OpenAI-specific options
    const openAiOptions = {
      // OpenAI has longer timeouts
      timeout: 30000,
      // OpenAI needs more failure threshold due to occasional hiccups
      failureThreshold: 8,
      // Reset after 30 seconds for OpenAI
      resetTimeout: 30000,
      // Error codes specific to OpenAI that shouldn't count as failures
      ignoredErrorCodes: [
        'ETIMEDOUT', 
        'ECONNREFUSED', 
        'EHOSTUNREACH',
        'rate_limit_exceeded',
        'tokens_exceeded',
        'context_length_exceeded'
      ],
      // Merge with provided options
      ...options
    };
    
    // Create enhanced fallback if not provided
    if (!openAiOptions.fallback) {
      openAiOptions.fallback = (error) => {
        openAILogger.warn('Using OpenAI fallback response', {
          error: error.message,
          errorCategory: categorizeError(error)
        });
        
        throw new Error(`OpenAI service unavailable: ${error.message}`);
      };
    }
    
    return this.create(action, `openai:${name}`, openAiOptions);
  }
  
  /**
   * Get status of all circuit breakers
   * @returns {Array} Array of circuit breaker status objects
   */
  getAllStatus() {
    const result = [];
    
    for (const [name, instance] of this.instances.entries()) {
      result.push(instance.getStatus());
    }
    
    return result;
  }
  
  /**
   * Check health of all circuit breakers
   * @returns {Object} Health status with overall health and individual statuses
   */
  checkHealth() {
    const statuses = this.getAllStatus();
    const unhealthyCircuits = statuses.filter(s => !s.healthy);
    
    return {
      healthy: unhealthyCircuits.length === 0,
      total: statuses.length,
      unhealthy: unhealthyCircuits.length,
      circuits: statuses.map(s => ({
        name: s.name,
        healthy: s.healthy,
        state: s.state
      })),
      unhealthyCircuits: unhealthyCircuits.map(s => ({
        name: s.name,
        lastError: s.lastError,
        lastErrorTime: s.lastErrorTime,
        metrics: {
          failures: s.metrics.failures,
          failureRate: s.metrics.percentiles.failure
        }
      }))
    };
  }
}

// Create default factory
const defaultFactory = new CircuitBreakerFactory();

export {
  EnhancedCircuitBreaker,
  CircuitBreakerFactory,
  defaultFactory,
  categorizeError,
  createHealthStatus
};

export default defaultFactory; 