# Sentry Error Monitoring Setup

This document explains how Sentry is implemented in the API and how to verify it's working correctly.

## What is Sentry?

[Sentry](https://sentry.io) is an error monitoring platform that helps developers track, prioritize, and fix application crashes in real-time. It provides:

- Real-time error tracking and reporting
- Performance monitoring
- Detailed error context (stack traces, breadcrumbs, user info)
- Alerting and notification capabilities

## Setup Instructions

### 1. Environment Variables

Sentry configuration is managed through environment variables in the `.env` file:

```
# Sentry Configuration
SENTRY_DSN=https://730d66b4b3770d30b11de9081c1e54f9@o1248310.ingest.us.sentry.io/4509066213195776
ENABLE_SENTRY_IN_DEV=true
```

- `SENTRY_DSN`: The Data Source Name for your Sentry project (required)
- `ENABLE_SENTRY_IN_DEV`: Whether to enable Sentry in development (default: false)

### 2. Getting a Sentry DSN

1. Sign up or log in to [Sentry](https://sentry.io)
2. Create a new project (or use an existing one)
3. Navigate to Settings > Projects > [Your Project] > Client Keys (DSN)
4. Copy the DSN value and add it to your `.env` file

### 3. Dependency Installation

The required Sentry packages are already included in the package.json:

```json
"dependencies": {
  "@sentry/node": "^7.80.0",
  "@sentry/integrations": "^7.80.0",
  "@sentry/profiling-node": "^1.2.6",
  // other dependencies...
}
```

Just run `npm install` to ensure they're installed.

## Verification

### Using the Verification Script

We've included a verification script that will test if Sentry is configured correctly:

```bash
npm run verify-sentry
```

This script will:
1. Check if your Sentry DSN is properly configured
2. Initialize Sentry
3. Send a test error to your Sentry project
4. Report the result

### Testing Routes

For more detailed testing, we've included test routes at `/api/v1/sentry-test` (disabled in production):

- `/api/v1/sentry-test/exception` - Triggers a caught exception
- `/api/v1/sentry-test/unhandled` - Triggers an uncaught exception
- `/api/v1/sentry-test/message` - Sends a test message to Sentry
- `/api/v1/sentry-test/breadcrumbs` - Tests breadcrumbs and context

## Advanced Features

### Profiling

The API includes Sentry profiling to monitor application performance:

```javascript
// This is set up in sentry.js and instrument.js
profilesSampleRate: 0.1,       // Transaction profiling
profileSessionSampleRate: 1.0  // Session profiling
```

Profiling helps identify performance bottlenecks in production code.

### Source Maps

For proper error stack traces in production, set up sourcemaps:

```bash
npm run setup-sourcemaps
```

This wizard will guide you through the process of configuring sourcemaps for your project.

## Usage in Code

### Capturing Errors

```javascript
import { captureError } from './core/infra/monitoring/sentry.js';

try {
  // Code that might fail
} catch (error) {
  captureError(error, { 
    customContext: 'Additional information' 
  });
  // Handle the error
}
```

### Capturing Messages

```javascript
import { captureMessage } from './core/infra/monitoring/sentry.js';

// Log an important event with an 'info' level
captureMessage('User completed signup', { userId: 123 }, 'info');

// Log a warning with a 'warning' level
captureMessage('Rate limit approaching', { 
  currentRate: currentRate,
  limit: limit
}, 'warning');
```

### Performance Monitoring

```javascript
import { startTransaction } from './core/infra/monitoring/sentry.js';

// Start a transaction
const transaction = startTransaction('processOrder', 'task');

// ... code being monitored ...

// Finish the transaction
transaction.finish();
```

## Configuration Options

The Sentry configuration is defined in `src/config/monitoring.js` with options for different environments. You can customize:

- Sampling rates for transactions and profiling
- Health check configuration
- Alerting thresholds
- Environment-specific settings

## Troubleshooting

If Sentry isn't working as expected:

1. Check if `SENTRY_DSN` is set correctly in your `.env` file
2. Run the verification script: `npm run verify-sentry`
3. Check the server logs for any Sentry initialization errors
4. Verify your Sentry project settings in the Sentry dashboard
