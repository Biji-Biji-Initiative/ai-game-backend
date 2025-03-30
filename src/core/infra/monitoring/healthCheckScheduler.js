/**
 * Health Check Scheduler
 * 
 * This module provides automated health checks for system components
 * and sends alerts when issues are detected.
 */

import domainLogger from '../logging/domainLogger.js';
import { captureMessage, setTag } from './sentry.js';

const { systemLogger } = domainLogger;
const logger = systemLogger.child('health-check-scheduler');

// Default configuration
const DEFAULT_CONFIG = {
  // Check interval in milliseconds (default: 1 minute)
  intervalMs: 60000,
  
  // Whether to log all checks
  logAllChecks: false,
  
  // Whether to send health metrics to Sentry
  sendToSentry: true,
};

// Store for health check services
let healthCheckServices = {};

// Interval reference
let healthCheckInterval = null;

/**
 * Start periodic health checks
 * 
 * @param {Object} config - Health check configuration
 * @param {number} [config.intervalMs] - Check interval in milliseconds
 * @param {boolean} [config.logAllChecks] - Whether to log all health checks
 * @param {boolean} [config.sendToSentry] - Whether to send health metrics to Sentry
 */
export function startHealthChecks(config = {}) {
  // Stop existing health checks if running
  if (healthCheckInterval) {
    stopHealthChecks();
  }
  
  // Merge with default config
  const healthCheckConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  
  logger.info('Starting scheduled health checks', {
    intervalMs: healthCheckConfig.intervalMs,
    registeredServices: Object.keys(healthCheckServices),
  });
  
  // Run initial health check immediately
  runHealthChecks(healthCheckConfig);
  
  // Schedule periodic health checks
  healthCheckInterval = setInterval(() => {
    runHealthChecks(healthCheckConfig);
  }, healthCheckConfig.intervalMs);
}

/**
 * Stop periodic health checks
 */
export function stopHealthChecks() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    logger.info('Stopped scheduled health checks');
  }
}

/**
 * Register a service for health checks
 * 
 * @param {string} serviceName - Name of the service
 * @param {Function} checkFunction - Async function that performs the health check
 * @param {Object} options - Options for this service
 * @param {string} [options.category] - Category of the service
 * @param {boolean} [options.isCritical=false] - Whether this service is critical
 */
export function registerHealthCheck(serviceName, checkFunction, options = {}) {
  if (typeof checkFunction !== 'function') {
    throw new Error(`Health check for ${serviceName} must be a function`);
  }
  
  healthCheckServices[serviceName] = {
    check: checkFunction,
    name: serviceName,
    category: options.category || 'service',
    isCritical: options.isCritical || false,
  };
  
  logger.info(`Registered health check for ${serviceName}`, {
    ...options,
    serviceCount: Object.keys(healthCheckServices).length,
  });
}

/**
 * Unregister a service from health checks
 * 
 * @param {string} serviceName - Name of the service to unregister
 */
export function unregisterHealthCheck(serviceName) {
  if (healthCheckServices[serviceName]) {
    delete healthCheckServices[serviceName];
    logger.info(`Unregistered health check for ${serviceName}`);
  }
}

/**
 * Run health checks for all registered services
 * 
 * @param {Object} config - Health check configuration
 * @private
 */
async function runHealthChecks(config) {
  const results = {};
  const allHealthy = true;
  let criticalFailure = false;
  
  // Track start time for performance measuring
  const startTime = Date.now();
  
  try {
    // Run all health checks in parallel
    const checks = Object.values(healthCheckServices).map(async (service) => {
      try {
        // Run the health check
        const result = await service.check();
        
        // Store the result
        results[service.name] = {
          status: result.status,
          message: result.message,
          details: result.details || {},
          isCritical: service.isCritical,
          category: service.category,
        };
        
        // Check if this is an unhealthy critical service
        if (service.isCritical && result.status !== 'healthy') {
          criticalFailure = true;
        }
        
        // Log check result if configured to do so or if unhealthy
        if (config.logAllChecks || result.status !== 'healthy') {
          const logLevel = result.status === 'healthy' ? 'debug' : 'warn';
          logger[logLevel](`Health check for ${service.name}: ${result.status}`, {
            service: service.name,
            status: result.status,
            message: result.message,
          });
        }
        
        // Report unhealthy services to Sentry
        if (config.sendToSentry && result.status !== 'healthy') {
          reportUnhealthyService(service.name, result);
        }
        
        return result;
      } catch (error) {
        // Handle errors in health check
        logger.error(`Error in health check for ${service.name}`, {
          service: service.name,
          error: error.message,
        });
        
        // Store error result
        results[service.name] = {
          status: 'error',
          message: `Health check error: ${error.message}`,
          error: error.message,
          isCritical: service.isCritical,
          category: service.category,
        };
        
        // Check if this is a critical service
        if (service.isCritical) {
          criticalFailure = true;
        }
        
        // Report error to Sentry
        if (config.sendToSentry) {
          reportUnhealthyService(service.name, results[service.name], error);
        }
        
        return results[service.name];
      }
    });
    
    // Wait for all checks to complete
    await Promise.all(checks);
    
    // Calculate execution time
    const executionTime = Date.now() - startTime;
    
    // Log summary of health checks
    const summary = {
      status: criticalFailure ? 'unhealthy' : 'healthy',
      executionTimeMs: executionTime,
      services: Object.keys(results).length,
      criticalFailure,
    };
    
    logger.info('Health check summary', summary);
    
    // Return results
    return {
      overallStatus: criticalFailure ? 'unhealthy' : 'healthy',
      services: results,
      timestamp: new Date().toISOString(),
      executionTimeMs: executionTime,
    };
  } catch (error) {
    logger.error('Critical error running health checks', {
      error: error.message,
      stack: error.stack,
    });
    
    // Return error status
    return {
      overallStatus: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Report an unhealthy service to Sentry
 * 
 * @param {string} serviceName - Name of the service
 * @param {Object} result - Health check result
 * @param {Error} [error] - Error object if available
 * @private
 */
function reportUnhealthyService(serviceName, result, error = null) {
  // Determine severity based on status and whether service is critical
  const level = result.isCritical ? 'error' : 'warning';
  
  // Set tags for filtering in Sentry
  setTag('health_check.service', serviceName);
  setTag('health_check.status', result.status);
  if (result.category) {
    setTag('health_check.category', result.category);
  }
  
  // Capture as message
  captureMessage(
    `Service unhealthy: ${serviceName} (${result.status})`,
    {
      service: serviceName,
      result,
      error: error ? { message: error.message, stack: error.stack } : undefined,
    },
    level
  );
}

export default {
  startHealthChecks,
  stopHealthChecks,
  registerHealthCheck,
  unregisterHealthCheck,
}; 