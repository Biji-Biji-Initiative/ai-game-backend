/**
 * OpenAI API Monitoring
 * 
 * This module provides specialized monitoring for OpenAI API calls,
 * including circuit breaker integration, error tracking, and
 * performance monitoring.
 */

import * as Sentry from '@sentry/node';
import domainLogger from '../logging/domainLogger.js';
import { captureError, captureMessage, startTransaction } from './sentry.js';

const { apiLogger } = domainLogger;
const logger = apiLogger.child('openai:monitoring');

// Transaction categories
const TRANSACTION_CATEGORIES = {
  API_REQUEST: 'openai.api.request',
  EMBEDDING: 'openai.embedding',
  CHAT_COMPLETION: 'openai.chat.completion',
  FUNCTION_CALL: 'openai.function.call',
  STREAM: 'openai.stream'
};

// Alert thresholds
const ALERT_THRESHOLDS = {
  // Response time thresholds (ms)
  RESPONSE_TIME: {
    WARNING: 2000,  // 2 seconds
    CRITICAL: 5000   // 5 seconds
  },
  // Circuit breaker thresholds
  CIRCUIT_BREAKER: {
    WARNING_PERCENTAGE: 10,   // Alert when 10% of requests fail
    CRITICAL_PERCENTAGE: 25   // Critical alert when 25% of requests fail
  }
};

/**
 * Monitor OpenAI API health
 * Tracks API status and circuit breaker state
 * 
 * @param {Object} openAIClient - OpenAI client instance
 * @returns {Object} Current health status
 */
export async function monitorOpenAIHealth(openAIClient) {
  if (!openAIClient) {
    logger.warn('OpenAI client not provided for health monitoring');
    return { status: 'unknown', message: 'Client not provided' };
  }

  try {
    // Get health status including circuit breaker information
    const health = await openAIClient.checkHealth();
    
    // Log health status
    if (health.status === 'healthy') {
      logger.debug('OpenAI API health check successful', { 
        status: health.status,
        circuitBreakerStatus: health.circuitBreaker?.status || 'unknown'
      });
    } else {
      // Log warning for non-healthy status
      logger.warn('OpenAI API health check failed', {
        status: health.status,
        error: health.error,
        circuitBreakerStatus: health.circuitBreaker?.status || 'unknown'
      });
      
      // Capture health issue in Sentry
      captureMessage(
        `OpenAI API health check: ${health.status}`,
        { health },
        health.status === 'warning' ? 'warning' : 'error'
      );
    }
    
    // Check circuit breaker status
    if (health.circuitBreaker && health.circuitBreaker.status === 'open') {
      // Circuit is open - capture this as a significant event
      captureMessage(
        'OpenAI API circuit breaker is open',
        {
          health,
          threshold: ALERT_THRESHOLDS.CIRCUIT_BREAKER.CRITICAL_PERCENTAGE
        },
        'error'
      );
    } else if (health.circuitBreaker && 
               health.circuitBreaker.percentageFailures > ALERT_THRESHOLDS.CIRCUIT_BREAKER.WARNING_PERCENTAGE) {
      // Circuit is showing elevated failures but not open yet
      captureMessage(
        'OpenAI API experiencing elevated failure rate',
        {
          health,
          percentageFailures: health.circuitBreaker.percentageFailures,
          threshold: ALERT_THRESHOLDS.CIRCUIT_BREAKER.WARNING_PERCENTAGE
        },
        'warning'
      );
    }
    
    return health;
  } catch (error) {
    logger.error('Error monitoring OpenAI health', {
      error: error.message
    });
    
    // Capture error in Sentry
    captureError(error, {
      component: 'openai-health-monitoring'
    });
    
    return {
      status: 'error',
      message: `Monitoring error: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Monitor OpenAI API request
 * Tracks performance and errors for OpenAI API calls
 * 
 * @param {string} operationName - Name of the operation (e.g., 'chatCompletion')
 * @param {string} category - Operation category from TRANSACTION_CATEGORIES
 * @param {Function} apiCall - The API call to monitor
 * @param {Object} [options] - Additional monitoring options
 * @param {Object} [options.context] - Context information to include with errors
 * @param {boolean} [options.isHighPriority=false] - Whether this is a high-priority operation
 * @returns {any} Result of the API call
 */
export async function monitorOpenAIRequest(operationName, category, apiCall, options = {}) {
  const { context = {}, isHighPriority = false } = options;
  
  // Start a Sentry transaction for performance monitoring
  const transaction = startTransaction(operationName, category, {
    isHighPriority
  });
  
  try {
    // Add transaction to active span if one exists
    const span = transaction ? 
      transaction.startChild({
        op: `${category}.execute`,
        description: operationName
      }) : null;
    
    // Set operation data as a tag for errors
    if (transaction) {
      Sentry.setTag('openai.operation', operationName);
      Sentry.setTag('openai.category', category);
      if (isHighPriority) {
        Sentry.setTag('openai.priority', 'high');
      }
    }
    
    // Start timing
    const startTime = Date.now();
    
    // Execute the API call
    const result = await apiCall();
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Check if response time exceeds thresholds
    if (responseTime > ALERT_THRESHOLDS.RESPONSE_TIME.CRITICAL) {
      captureMessage(
        `OpenAI API response time critical: ${responseTime}ms`,
        { 
          operation: operationName,
          responseTime,
          threshold: ALERT_THRESHOLDS.RESPONSE_TIME.CRITICAL,
          ...context
        },
        'error'
      );
    } else if (responseTime > ALERT_THRESHOLDS.RESPONSE_TIME.WARNING) {
      captureMessage(
        `OpenAI API response time slow: ${responseTime}ms`,
        { 
          operation: operationName,
          responseTime,
          threshold: ALERT_THRESHOLDS.RESPONSE_TIME.WARNING,
          ...context
        },
        'warning'
      );
    }
    
    // Finish the span
    if (span) {
      span.setData('response_time_ms', responseTime);
      span.finish();
    }
    
    // Finish the transaction
    if (transaction) {
      transaction.finish();
    }
    
    return result;
  } catch (error) {
    // Log the error
    logger.error(`Error in OpenAI operation: ${operationName}`, {
      error: error.message,
      category,
      isCircuitBreakerError: error.isCircuitBreakerError || false,
      ...context
    });
    
    // Set error information
    if (transaction) {
      transaction.setData('error', error.message);
      transaction.setData('error_type', error.name);
      if (error.isCircuitBreakerError) {
        transaction.setData('circuit_breaker_open', true);
      }
    }
    
    // Add special handling for circuit breaker errors
    if (error.isCircuitBreakerError || error.code === 'circuit_open') {
      captureMessage(
        'OpenAI API circuit breaker open',
        {
          operation: operationName,
          ...context
        },
        'error'
      );
    } else {
      // Capture other errors
      captureError(error, {
        operation: operationName,
        category,
        isHighPriority,
        ...context
      });
    }
    
    // Finish the transaction
    if (transaction) {
      transaction.finish();
    }
    
    // Re-throw the error
    throw error;
  }
}

/**
 * Factory function that wraps OpenAI client methods with monitoring
 * 
 * @param {Object} client - OpenAI client instance
 * @returns {Object} Wrapped client with monitoring
 */
export function createMonitoredOpenAIClient(client) {
  if (!client) {
    throw new Error('OpenAI client is required for monitoring');
  }
  
  const monitoredClient = {
    // Wrap sendMessage with monitoring
    sendMessage: async (messages, options = {}) => {
      return monitorOpenAIRequest(
        'sendMessage',
        TRANSACTION_CATEGORIES.API_REQUEST,
        () => client.sendMessage(messages, options),
        {
          context: {
            modelName: options.model,
            messageCount: Array.isArray(messages) ? messages.length : 1
          }
        }
      );
    },
    
    // Wrap sendJsonMessage with monitoring
    sendJsonMessage: async (messages, options = {}) => {
      return monitorOpenAIRequest(
        'sendJsonMessage',
        TRANSACTION_CATEGORIES.API_REQUEST,
        () => client.sendJsonMessage(messages, options),
        {
          context: {
            modelName: options.model,
            messageCount: Array.isArray(messages) ? messages.length : 1
          }
        }
      );
    },
    
    // Wrap streamMessage with monitoring
    streamMessage: async (messages, options = {}) => {
      return monitorOpenAIRequest(
        'streamMessage',
        TRANSACTION_CATEGORIES.STREAM,
        () => client.streamMessage(messages, options),
        {
          context: {
            modelName: options.model,
            messageCount: Array.isArray(messages) ? messages.length : 1
          }
        }
      );
    },
    
    // Wrap health check with monitoring
    checkHealth: async () => {
      return monitorOpenAIHealth(client);
    }
  };
  
  // Pass through any additional methods or properties
  return new Proxy(monitoredClient, {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }
      return client[prop];
    }
  });
}

export default {
  monitorOpenAIHealth,
  monitorOpenAIRequest,
  createMonitoredOpenAIClient,
  TRANSACTION_CATEGORIES,
  ALERT_THRESHOLDS
}; 