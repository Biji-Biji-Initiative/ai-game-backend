# Logging System Documentation

## Overview

The Responses API Fight Club application uses Winston for structured logging. This document explains how the logging system works and how to use it effectively throughout the codebase.

## Logger Configuration

The logger is configured in `/src/utils/logger.js` with the following features:

- **Multiple log levels**: error, warn, info, debug
- **Structured logging**: All logs include metadata for better analysis
- **Multiple transports**: Console and file-based logging
- **Log rotation**: Files are rotated when they reach 5MB with a maximum of 5 files
- **Environment-based configuration**: Log level can be set via the `LOG_LEVEL` environment variable

## Log Levels

The following log levels are available (in order of severity):

1. **error**: Critical issues that require immediate attention
2. **warn**: Potential issues that don't prevent the application from functioning
3. **info**: General information about application operation
4. **debug**: Detailed information useful for debugging

## How to Use the Logger

Import the logger at the top of your file:

```javascript
const logger = require('../utils/logger');
```

Then use the appropriate log level method:

```javascript
// Error logging (for critical issues)
logger.error('Failed to connect to database', { 
  error: error.message, 
  stack: error.stack 
});

// Warning logging (for potential issues)
logger.warn('User attempted to access unauthorized resource', { 
  userId: user.id, 
  resource: resourceId 
});

// Info logging (for general information)
logger.info('User registered successfully', { 
  email: user.email 
});

// Debug logging (for detailed information)
logger.debug('Processing user input', { 
  input: userInput 
});
```

## Best Practices

1. **Always include context**: Add relevant metadata as the second parameter
2. **Use appropriate log levels**: Don't log everything as error or info
3. **Be consistent**: Use similar patterns across the codebase
4. **Don't log sensitive information**: Never log passwords, tokens, or other sensitive data
5. **Log at service boundaries**: Log when entering/exiting important service methods
6. **Include error stacks**: When logging errors, include the stack trace

## Log Files

Logs are stored in the `/logs` directory:

- `error.log`: Contains only error-level logs
- `combined.log`: Contains all logs regardless of level

## Changing Log Level

To change the log level, modify the `LOG_LEVEL` environment variable in the `.env` file:

```
LOG_LEVEL=debug  # For more verbose logging
LOG_LEVEL=error  # For only critical errors
```

Default log level is `info` if not specified.
