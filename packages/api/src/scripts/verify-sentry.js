/**
 * Sentry Verification Script
 *
 * This script verifies that Sentry is properly configured by:
 * 1. Checking environment variables
 * 2. Initializing Sentry
 * 3. Sending a test error
 * 4. Verifying the error was sent successfully
 */

import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';
import { basename } from 'path';

// Load environment variables
dotenv.config();

// Define colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Log a message with color
 */
function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Log a success message
 */
function success(message) {
  log(`✓ ${message}`, colors.green);
}

/**
 * Log a warning message
 */
function warning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

/**
 * Log an error message
 */
function error(message) {
  log(`✗ ${message}`, colors.red);
}

/**
 * Log an info message
 */
function info(message) {
  log(`ℹ ${message}`, colors.blue);
}

/**
 * Check if Sentry DSN is configured
 */
function checkSentryDsn() {
  if (!process.env.SENTRY_DSN) {
    error('SENTRY_DSN environment variable is not set');
    log('Please add your Sentry DSN to the .env file:');
    log('SENTRY_DSN=https://your-sentry-dsn.ingest.sentry.io/your-project-id');
    return false;
  }

  if (!process.env.SENTRY_DSN.includes('https://') || !process.env.SENTRY_DSN.includes('sentry.io')) {
    warning('SENTRY_DSN environment variable does not appear to be a valid Sentry DSN');
    return false;
  }

  success('SENTRY_DSN environment variable is set');
  return true;
}

/**
 * Initialize Sentry for testing
 */
function initializeSentry() {
  log('\nInitializing Sentry...', colors.cyan);

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 1.0, // Capture 100% of transactions for testing
      environment: 'verify-script',
      release: 'verify-script@1.0.0',
      beforeSend: (event) => {
        // Add a tag to indicate this is a verification event
        event.tags = {
          ...event.tags,
          verification: 'true',
          script: basename(__filename)
        };
        return event;
      }
    });

    success('Sentry initialized successfully');
    return true;
  } catch (err) {
    error(`Failed to initialize Sentry: ${err.message}`);
    return false;
  }
}

/**
 * Send a test error to Sentry
 */
function sendTestError() {
  log('\nSending test error to Sentry...', colors.cyan);

  try {
    // Set some user context
    Sentry.setUser({
      id: 'verification-user',
      username: 'verify-script'
    });

    // Add a breadcrumb
    Sentry.addBreadcrumb({
      category: 'verification',
      message: 'Verification script started',
      level: 'info'
    });

    // Create a test error
    const testError = new Error('This is a test error from the Sentry verification script');
    testError.name = 'SentryVerificationError';

    // Capture the error
    const eventId = Sentry.captureException(testError);

    if (eventId) {
      success(`Test error sent to Sentry with event ID: ${eventId}`);
      return eventId;
    } else {
      error('Failed to send test error to Sentry - no event ID returned');
      return null;
    }
  } catch (err) {
    error(`Error while sending test to Sentry: ${err.message}`);
    return null;
  }
}

/**
 * Main verification function
 */
async function verifySentry() {
  log('\n==== Sentry Verification Script ====', colors.magenta);

  // Step 1: Check if Sentry DSN is configured
  const dsnValid = checkSentryDsn();
  if (!dsnValid) {
    error('Sentry verification failed: DSN invalid or not set');
    process.exit(1);
  }

  // Step 2: Initialize Sentry
  const sentryInitialized = initializeSentry();
  if (!sentryInitialized) {
    error('Sentry verification failed: Could not initialize Sentry');
    process.exit(1);
  }

  // Step 3: Send a test error
  const eventId = sendTestError();
  if (!eventId) {
    error('Sentry verification failed: Could not send test error');
    process.exit(1);
  }

  // Success!
  log('\n✓✓✓ Sentry verification completed successfully! ✓✓✓', colors.green);
  info(`A test error has been sent to your Sentry project.`);
  info(`You should be able to see it in your Sentry dashboard.`);
  info(`Event ID: ${eventId}`);

  // Wait a moment for the error to be sent before exiting
  log('\nWaiting for Sentry to process the error...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Flush events before exit
  log('Flushing remaining events...');
  await Sentry.close(2000);

  success('Done!');
}

// Run the verification
verifySentry().catch(err => {
  error(`Unexpected error during verification: ${err.message}`);
  process.exit(1);
});
