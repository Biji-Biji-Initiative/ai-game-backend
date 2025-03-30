# OPS-701: Enhanced Logging System - Implementation Plan

This document outlines the detailed implementation plan for enhancing the logging system as described in ticket OPS-701.

## Phase 1: Core Logging Infrastructure

### 1.1 Logger Configuration Enhancement
- Update the Winston configuration to support more customizable options
- Add environment-specific configurations
- Create a configuration loader that reads from environment variables
- Implement dynamic log level changes without server restart

```javascript
// Example enhanced logger configuration
const logConfig = {
  // Base configuration
  console: {
    level: process.env.LOG_LEVEL_CONSOLE || 'info',
    format: 'detailed',  // 'simple', 'detailed', 'json'
    colorize: true
  },
  file: {
    level: process.env.LOG_LEVEL_FILE || 'debug',
    format: 'json',
    maxSize: '10m',
    maxFiles: 5,
    dir: './logs'
  },
  // Runtime settings
  enableCorrelationId: true,
  enablePerformanceLogging: true,
  redactSensitiveInfo: true,
  // Service categorization
  service: process.env.SERVICE_NAME || 'api',
  // Environment variables take precedence
  ...getEnvOverrides()
};
```

### 1.2 Enhanced Correlation ID Middleware
- Improve the existing correlation ID middleware
- Support for multiple formats of incoming correlation IDs
- Add correlation ID propagation to outgoing service requests
- Store correlation ID in AsyncLocalStorage for cross-cutting access

```javascript
// Enhanced correlation ID middleware
const enhancedCorrelationIdMiddleware = (req, res, next) => {
  // Find existing correlation ID from various standard headers
  const correlationId = 
    req.headers['x-correlation-id'] || 
    req.headers['x-request-id'] || 
    req.headers['request-id'] ||
    generateNewCorrelationId();
    
  // Set standard headers for downstream services
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Store in AsyncLocalStorage for use throughout the request lifecycle
  correlationIdStorage.run({ correlationId, startTime: Date.now() }, () => {
    // Add to request object for convenience
    req.correlationId = correlationId;
    
    // Continue
    next();
  });
};
```

### 1.3 Standardized Log Formatters
- Create consistent formatters for different output targets
- Build JSON formatter for machine processing
- Add human-readable formatter for development
- Implement sensitive data redaction in formatters

## Phase 2: Enhanced Logging Features

### 2.1 Performance Logging
- Create timing utilities for measuring operation duration
- Add request duration logging to the request logger middleware
- Implement resource usage monitoring (CPU, memory)
- Build high-resolution timing for critical paths

```javascript
// Performance measurement utility
class PerformanceTimer {
  constructor(logger, operation) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = process.hrtime.bigint();
    this.marks = {};
  }
  
  mark(name) {
    this.marks[name] = process.hrtime.bigint();
    return this; // For chaining
  }
  
  end(metadata = {}) {
    const endTime = process.hrtime.bigint();
    const durationNs = Number(endTime - this.startTime);
    const durationMs = durationNs / 1_000_000;
    
    // Calculate intervals between marks
    const intervals = {};
    let lastMark = this.startTime;
    
    for (const [name, time] of Object.entries(this.marks)) {
      intervals[`${name}_time`] = Number(time - lastMark) / 1_000_000;
      lastMark = time;
    }
    
    intervals.final = Number(endTime - lastMark) / 1_000_000;
    
    // Log the performance data
    this.logger.info(`Completed ${this.operation}`, {
      operation: this.operation,
      duration_ms: durationMs.toFixed(2),
      intervals,
      ...metadata
    });
    
    return durationMs;
  }
}
```

### 2.2 Enhanced Request Logger
- Improve HTTP request/response logging
- Add configurable logging of request/response body
- Implement path-based filtering for high-volume routes
- Create privacy-aware request logging (redact PII)

```javascript
// Enhanced request logger
const enhancedRequestLogger = (options = {}) => {
  const config = {
    logBody: process.env.LOG_REQUEST_BODY === 'true',
    logHeaders: true,
    excludePaths: ['/health', '/metrics'],
    maxBodySize: 1024, // Truncate large bodies
    redactedFields: ['password', 'token', 'secret', 'creditCard'],
    ...options
  };
  
  return (req, res, next) => {
    // Skip excluded paths
    if (config.excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    const startTime = Date.now();
    const store = correlationIdStorage.getStore() || {};
    const correlationId = store.correlationId;
    
    // Prepare request data
    const requestData = {
      method: req.method,
      url: req.originalUrl || req.url,
      correlationId,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };
    
    // Add headers if configured
    if (config.logHeaders) {
      // Clone headers and redact sensitive ones
      const headers = { ...req.headers };
      if (headers.authorization) headers.authorization = '[REDACTED]';
      if (headers.cookie) headers.cookie = '[REDACTED]';
      requestData.headers = headers;
    }
    
    // Add request body if configured and present
    if (config.logBody && req.body && Object.keys(req.body).length) {
      // Clone and redact sensitive fields
      const body = JSON.parse(JSON.stringify(req.body));
      redactSensitiveData(body, config.redactedFields);
      
      // Truncate if too large
      requestData.body = truncateObject(body, config.maxBodySize);
    }
    
    // Log the incoming request
    logger.info(`Incoming ${req.method} ${req.originalUrl || req.url}`, requestData);
    
    // Capture the response
    const originalEnd = res.end;
    
    res.end = function(chunk, encoding) {
      // Restore original end
      res.end = originalEnd;
      
      // Calculate duration
      const duration = Date.now() - startTime;
      
      // Prepare response data
      const responseData = {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration,
        correlationId
      };
      
      // Determine log level based on status code
      const level = res.statusCode >= 500 ? 'error' : 
                    res.statusCode >= 400 ? 'warn' : 
                    'info';
      
      // Log the response
      logger[level](`Completed ${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${duration}ms`, responseData);
      
      // Call the original end
      return originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
};
```

### 2.3 Domain-Specific Loggers
- Refine existing domain loggers
- Add context-specific fields for different domains
- Implement contextual logging helpers for common operations
- Create logging standards for specific services (e.g., OpenAI API)

## Phase 3: Integration and Advanced Features

### 3.1 Sentry Integration Enhancement
- Improve connection between Winston and Sentry
- Add breadcrumbs from log entries
- Enrich Sentry events with logger context
- Create log-driven alerting rules

```javascript
// Enhanced Sentry integration with logging
const createSentryTransport = () => {
  return new winston.transports.Console({
    level: 'error',
    format: winston.format.printf(info => {
      // Send error logs to Sentry
      Sentry.captureMessage(info.message, {
        level: Sentry.Severity.Error,
        extra: {
          ...info,
          timestamp: new Date().toISOString(),
        },
        tags: {
          correlationId: info.correlationId,
          namespace: info.namespace
        }
      });
      
      // Don't actually log anything to console via this transport
      return null;
    })
  });
};
```

### 3.2 Circuit Breaker Logging
- Enhance circuit breaker logging for detailed state transitions
- Add health metrics to logs
- Implement detailed error categorization
- Create circuit state dashboards from logs

```javascript
// Enhanced circuit breaker logging
const enhanceCircuitBreakerLogging = (circuitBreaker, logger) => {
  // Log all state changes
  circuitBreaker.on('open', () => {
    logger.warn('Circuit breaker opened', {
      service: circuitBreaker.name,
      failureCount: circuitBreaker.stats.failures,
      failureRate: circuitBreaker.stats.failureRate,
      latency: circuitBreaker.stats.latency.mean,
      lastError: circuitBreaker.lastError?.message
    });
  });
  
  circuitBreaker.on('close', () => {
    logger.info('Circuit breaker closed', {
      service: circuitBreaker.name,
      recoveryTime: Date.now() - circuitBreaker.stats.lastOpenTime
    });
  });
  
  circuitBreaker.on('halfOpen', () => {
    logger.info('Circuit breaker half-opened', {
      service: circuitBreaker.name,
      openTime: Date.now() - circuitBreaker.stats.lastOpenTime
    });
  });
  
  // Detailed logging of all failures
  circuitBreaker.on('failure', (error) => {
    logger.error('Circuit breaker operation failed', {
      service: circuitBreaker.name,
      error: error.message,
      errorType: categorizeError(error),
      stack: error.stack,
      stats: {
        failures: circuitBreaker.stats.failures,
        successes: circuitBreaker.stats.successes,
        rejects: circuitBreaker.stats.rejects,
        timeouts: circuitBreaker.stats.timeouts
      }
    });
  });
};
```

### 3.3 Audit Logging System
- Implement specialized audit logging for security events
- Create immutable logs for compliance
- Add user action tracking
- Build comprehensive authentication logging

```javascript
// Audit logging middleware
const auditLogger = (req, res, next) => {
  // Skip non-auditable routes
  if (!isAuditableRoute(req.path)) {
    return next();
  }
  
  // Only audit certain HTTP methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return next();
  }
  
  // Extract user information
  const userId = req.user?.id || 'anonymous';
  const userEmail = req.user?.email;
  const userName = req.user?.name;
  
  // Log the action with user context
  logger.info('AUDIT: User action', {
    userId,
    userEmail,
    userName,
    action: `${req.method} ${req.path}`,
    resource: req.path,
    resourceId: extractResourceId(req),
    ip: req.ip,
    userAgent: req.get('user-agent'),
    // Only include safe parts of the body
    changes: getSafeBodyChanges(req.body)
  });
  
  next();
};
```

## Phase 4: Documentation and Developer Tools

### 4.1 Logging Best Practices Guide
- Create a comprehensive guide for developers
- Document standard log levels and when to use them
- Provide examples for common logging scenarios
- Create logging checklists for code reviews

### 4.2 Logging Utilities
- Build helper functions for common logging patterns
- Create typed logging interfaces
- Implement debug utilities for development
- Add context managers for logging blocks of code

```javascript
// Logging utilities example
const loggingUtils = {
  // Log a function call with parameters and result
  logMethod: (logger, methodName, params, result, error) => {
    if (error) {
      logger.error(`Error in ${methodName}`, {
        params,
        error: error.message,
        stack: error.stack
      });
    } else {
      logger.debug(`Called ${methodName}`, {
        params,
        result: truncateObject(result),
        duration: params._duration // If using timer
      });
    }
  },
  
  // Create a wrapper that logs method calls
  createLoggingProxy: (target, logger, options = {}) => {
    return new Proxy(target, {
      apply: function(target, thisArg, argumentsList) {
        const startTime = Date.now();
        try {
          const result = Reflect.apply(target, thisArg, argumentsList);
          
          // Handle promises
          if (result instanceof Promise) {
            return result.then(value => {
              if (options.logSuccess) {
                logger.debug(`Called ${target.name}`, {
                  arguments: argumentsList,
                  duration: Date.now() - startTime,
                  result: truncateObject(value)
                });
              }
              return value;
            }).catch(error => {
              logger.error(`Error in ${target.name}`, {
                arguments: argumentsList,
                duration: Date.now() - startTime,
                error: error.message,
                stack: error.stack
              });
              throw error;
            });
          }
          
          // Handle synchronous results
          if (options.logSuccess) {
            logger.debug(`Called ${target.name}`, {
              arguments: argumentsList,
              duration: Date.now() - startTime,
              result: truncateObject(result)
            });
          }
          return result;
        } catch (error) {
          logger.error(`Error in ${target.name}`, {
            arguments: argumentsList,
            duration: Date.now() - startTime,
            error: error.message,
            stack: error.stack
          });
          throw error;
        }
      }
    });
  }
};
```

### 4.3 Update Existing Codebase
- Apply new logging standards to existing code
- Refactor log messages for consistency
- Add contextual information to existing logs
- Implement correlation ID propagation in all services

## Phase 5: Testing and Performance Optimization

### 5.1 Logging Performance Tests
- Benchmark logging overhead in different configurations
- Optimize high-volume logging paths
- Implement log sampling for high-throughput endpoints
- Add stress tests for logging system

### 5.2 Log Correctness Tests
- Create tests for redaction of sensitive information
- Verify correlation ID propagation
- Test environment-specific behavior
- Validate log format compliance

## Implementation Timeline

1. **Week 1: Core Infrastructure Enhancements**
   - Update Winston configuration
   - Enhance correlation ID system
   - Implement standardized formatters

2. **Week 2: Enhanced Logging Features**
   - Build performance logging utilities
   - Implement improved request logger
   - Refine domain-specific loggers

3. **Week 3: Integration and Advanced Features**
   - Enhance Sentry integration
   - Implement circuit breaker logging
   - Build audit logging system

4. **Week 4: Documentation and Developer Tools**
   - Create best practices documentation
   - Build helper utilities
   - Update existing codebase
   - Perform testing and optimization

## Rollout Strategy

1. Deploy logging infrastructure changes first
2. Gradually enhance existing loggers
3. Roll out new logging features one by one
4. Monitor performance impact
5. Collect feedback from developers
6. Fine-tune based on production usage

## Success Metrics

- Reduced time to diagnose production issues
- Improved visibility into system behavior
- Enhanced ability to trace requests across services
- Decreased log noise with better filtering
- Positive developer feedback on logging utilities 