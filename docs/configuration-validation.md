# Configuration Validation System

This document explains the configuration validation system implemented in the application.

## Overview

The configuration validation system ensures that the application's configuration meets certain requirements before the application starts. This prevents runtime errors caused by missing or invalid configuration values.

## How It Works

1. When the application starts, it loads configuration values from environment variables and default values
2. The loaded configuration is validated against a schema defined using Zod
3. If the configuration is valid, the application continues to start
4. If the configuration is invalid, the application:
   - In production mode: Exits with an error code (fail-fast approach)
   - In development mode: Logs warnings but continues to run

## Schema Definition

The configuration schema is defined in `src/config/schemas/configSchema.js` using Zod. It includes:

- Server configuration (port, environment, baseUrl)
- API configuration (prefix, paths)
- CORS configuration (origins, methods, headers)
- Rate limiting configuration
- Supabase configuration
- OpenAI configuration
- Logging configuration
- User journey configuration

## Examples

### Valid Configuration

A valid configuration meets all the schema requirements:

```javascript
{
  server: {
    port: 3000,                         // Positive number
    environment: 'development',         // One of: 'development', 'testing', 'production'
    baseUrl: 'http://localhost:3000'    // Valid URL
  },
  api: {
    prefix: '/api/v1',                 // Starts with '/'
    // ...other api config
  },
  // ...other config sections
}
```

### Invalid Configuration

An invalid configuration will trigger validation errors:

```javascript
{
  server: {
    port: -1,                          // ERROR: Must be positive
    environment: 'invalid',            // ERROR: Not in allowed values
    // Missing baseUrl                 // ERROR: Required field
  },
  // ...other config sections
}
```

## Validation Error Format

When validation fails, error messages are formatted to clearly indicate the issue:

```
Configuration validation failed:
- server.port: Number must be greater than 0
- server.environment: Invalid enum value. Expected 'development' | 'testing' | 'production', received 'invalid'
- server.baseUrl: Required
```

## Testing

The configuration validation can be tested using:

```bash
npm run verify:config
```

This runs a test script that validates both valid and invalid configurations.

## Adding New Configuration Options

When adding new configuration options:

1. Add the new option to `src/config/config.js`
2. Update the schema in `src/config/schemas/configSchema.js`
3. Run `npm run verify:config` to ensure everything is correct

## Benefits

- **Fail-Fast Approach**: Detects configuration issues at startup instead of during runtime
- **Clear Error Messages**: Provides specific error messages for easy debugging
- **Environment-Aware**: Different behavior in development vs. production environments
- **Documentation**: Schema serves as executable documentation of configuration requirements 