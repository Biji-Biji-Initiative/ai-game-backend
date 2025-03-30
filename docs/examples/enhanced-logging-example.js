/**
 * Enhanced Logging System - Usage Examples
 * 
 * This file demonstrates how to use the new enhanced logging system
 * in different scenarios.
 */

// Import the main logging components
import { 
  logger, 
  LoggerFactory, 
  correlationIdMiddleware, 
  requestLogger, 
  errorLogger 
} from '../core/infra/logging/enhancedLogger.js';

// Import the enhanced circuit breaker
import circuitBreakerFactory from '../core/infra/services/enhanced-circuit-breaker.js';

// Import Express (for middleware examples)
import express from 'express';

/**
 * Example 1: Basic Logging
 * 
 * This demonstrates simple logging at different levels with contextual data.
 */
function basicLoggingExample() {
  // Use the default app logger
  logger.info('Application started', { 
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
  
  // Log at different levels
  logger.debug('This is a debug message with details', { 
    data: { x: 1, y: 2 }, 
    processingTime: 42 
  });
  
  logger.info('This is an informational message');
  
  logger.warn('This is a warning about something to watch', { 
    resourceId: '12345', 
    usage: '85%' 
  });
  
  logger.error('This is an error that occurred', { 
    error: new Error('Something went wrong'), 
    userId: 'user123' 
  });
  
  // Using the logger timer to measure performance
  const timer = logger.timer('my-operation');
  
  // Do some work...
  setTimeout(() => {
    // Mark a checkpoint
    timer.mark('checkpoint-1');
    
    // Do more work...
    setTimeout(() => {
      // Mark another checkpoint
      timer.mark('checkpoint-2');
      
      // Finish and log the operation with all timing data
      timer.end({ 
        operation: 'my-operation',
        result: 'success',
        itemsProcessed: 42
      });
    }, 200);
  }, 100);
}

/**
 * Example 2: Using Child Loggers
 * 
 * This demonstrates how to create and use domain-specific loggers.
 */
function childLoggersExample() {
  // Create domain-specific loggers
  const userLogger = logger.child('domain:user');
  const orderLogger = logger.child('domain:order');
  const paymentLogger = logger.child('domain:payment');
  
  // Use domain-specific loggers
  userLogger.info('User logged in', { 
    userId: 'user123', 
    loginMethod: 'email' 
  });
  
  orderLogger.info('Order created', { 
    orderId: 'order456', 
    userId: 'user123', 
    items: 3, 
    total: 99.99 
  });
  
  paymentLogger.info('Payment processed', { 
    paymentId: 'pay789', 
    orderId: 'order456', 
    amount: 99.99,
    method: 'credit-card'
  });
  
  // Create even more specific child loggers
  const userCreationLogger = userLogger.child('creation');
  
  userCreationLogger.debug('Validating user data');
  userCreationLogger.info('User created', { userId: 'user456' });
}

/**
 * Example 3: Context and Correlation ID
 * 
 * This demonstrates using context and correlation IDs for request tracking.
 */
function contextAndCorrelationExample() {
  // Use correlation ID to trace operations
  logger.withCorrelationId('request-abc-123', () => {
    logger.info('Processing request with correlation ID');
    
    // Nested operation with the same correlation ID
    someOperation();
    
    // Add additional context data to all log entries
    logger.withContext({ userId: 'user123', sessionId: 'sess456' }, () => {
      logger.info('User context is automatically included');
      
      // Even deeper nesting
      someOtherOperation();
    });
  });
}

function someOperation() {
  // This log entry will have the correlation ID from the parent context
  logger.debug('Performing operation');
}

function someOtherOperation() {
  // This log entry will have the correlation ID and the user context data
  logger.debug('Performing another operation');
}

/**
 * Example 4: Express Middleware Integration
 * 
 * This demonstrates how to use the logging middleware with Express.
 */
function expressMiddlewareExample() {
  const app = express();
  
  // Add correlation ID middleware - should be first to ensure all logs have the ID
  app.use(correlationIdMiddleware);
  
  // Add request logging middleware - logs all incoming requests
  app.use(requestLogger);
  
  // Your route handlers
  app.get('/api/users', (req, res) => {
    const userLogger = logger.child('domain:user');
    
    userLogger.info('Fetching users', { query: req.query });
    
    // The correlation ID is automatically included in all log entries
    // because it's stored in AsyncLocalStorage by the middleware
    
    res.json({ users: [] });
  });
  
  // Error handler middleware should be last
  app.use(errorLogger);
  
  // Start the server
  app.listen(3000, () => {
    logger.info('Server started on port 3000');
  });
}

/**
 * Example 5: Circuit Breaker with Enhanced Logging
 * 
 * This demonstrates how to use the circuit breaker with enhanced logging.
 */
async function circuitBreakerExample() {
  // Create a circuit breaker for a database operation
  const dbCircuitBreaker = circuitBreakerFactory.create(
    // The function to protect
    async (query, params) => {
      // This would normally be a database call
      if (Math.random() < 0.3) {
        throw new Error('Database connection error');
      }
      return { rows: [{ id: 1, name: 'Test' }] };
    },
    // Name for the circuit breaker
    'database:query',
    // Options
    {
      failureThreshold: 3,
      resetTimeout: 5000
    }
  );
  
  // Use the circuit breaker
  try {
    // Execute the operation with detailed logging
    const result = await dbCircuitBreaker.execute('SELECT * FROM users', []);
    logger.info('Database query successful', { result });
  } catch (error) {
    // The circuit breaker already logged the error details
    logger.error('Failed to execute database query', { error: error.message });
  }
  
  // Create an OpenAI-specific circuit breaker
  const openaiCircuitBreaker = circuitBreakerFactory.createForOpenAI(
    // The function to protect
    async (prompt) => {
      if (Math.random() < 0.2) {
        const error = new Error('OpenAI API rate limit exceeded');
        error.status = 429;
        throw error;
      }
      return { text: 'AI response' };
    },
    // Name for the circuit breaker
    'completions'
  );
  
  // Use the OpenAI circuit breaker
  try {
    const result = await openaiCircuitBreaker.execute('Generate a poem about logging');
    logger.info('OpenAI API call successful', { result });
  } catch (error) {
    // The circuit breaker already logged the error with categorization
    logger.error('Failed to call OpenAI API', { error: error.message });
  }
  
  // Get health status for all circuit breakers
  const healthStatus = circuitBreakerFactory.checkHealth();
  logger.info('Circuit breaker health status', healthStatus);
}

/**
 * Example 6: Custom Logger Configuration
 * 
 * This demonstrates how to create a custom logger configuration.
 */
function customLoggerExample() {
  // Create a custom logger factory with specific configuration
  const customFactory = new LoggerFactory({
    console: {
      level: 'debug',
      format: 'detailed',
      colorize: true
    },
    file: {
      enabled: true,
      level: 'trace',
      dirname: './logs/custom',
      separateLevels: ['fatal', 'error', 'warn']
    },
    options: {
      enableCorrelationId: true,
      redactSensitiveInfo: true,
      trackMemoryUsage: true,
      logProcessInfo: true
    },
    redaction: {
      fields: [
        'password', 'token', 'secret', 'apiKey', 
        'creditCard', 'ssn', 'socialSecurityNumber'
      ]
    }
  });
  
  // Get a logger from the custom factory
  const apiLogger = customFactory.getLogger('api');
  
  // Use the custom logger
  apiLogger.info('API initialized with custom logging configuration');
  
  // Log with sensitive data that will be automatically redacted
  apiLogger.info('User logged in', {
    userId: 'user123',
    password: 'supersecret',  // This will be redacted
    token: 'eyJhbGciOiJ...',  // This will be redacted
    creditCard: '4111111111111111'  // This will be redacted
  });
}

/**
 * Example 7: Changing Log Levels at Runtime
 * 
 * This demonstrates how to change log levels dynamically.
 */
function changeLogLevelExample() {
  // Create a custom factory with the log level change server enabled
  const customFactory = new LoggerFactory({
    options: {
      logLevelChangePort: 8081
    }
  });
  
  const debugLogger = customFactory.getLogger('debug-demo');
  
  // Initially this won't be logged because default level is 'info'
  debugLogger.debug('This debug message is not logged');
  
  // To change the log level, you would make an HTTP request to the server:
  // curl -X POST http://localhost:8081/log-level -H "Content-Type: application/json" -d '{"level": "debug"}'
  
  // After that call, debug messages would be logged:
  debugLogger.debug('This debug message will be logged after level change');
  
  // You can also change the configuration programmatically:
  customFactory.updateConfig({
    console: {
      level: 'debug'
    }
  });
  
  // Now debug logs will appear
  debugLogger.debug('This debug message is now logged');
}

// Run the examples
basicLoggingExample();
childLoggersExample();
contextAndCorrelationExample();
// expressMiddlewareExample(); // Uncomment to run the Express example
circuitBreakerExample().catch(err => logger.error('Example failed', { error: err }));
customLoggerExample();
// changeLogLevelExample(); // Uncomment to run the log level change example 