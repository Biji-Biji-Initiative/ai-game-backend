/**
 * Sentry Monitoring and Error Tracking
 *
 * This module configures Sentry for application monitoring, error tracking,
 * and alerting. It provides functions to initialize Sentry, capture errors,
 * and track performance.
 */

import * as Sentry from '@sentry/node';
import { ExtraErrorData, CaptureConsole, ReportingObserver } from '@sentry/integrations';
import domainLogger from '../logging/domainLogger.js';

// Import instrumentation (must be early)
import './instrument.js';

const { systemLogger } = domainLogger;

/**
 * Default Sentry configuration
 */
const DEFAULT_CONFIG = {
  // Default sample rate for transactions (1.0 = 100% of transactions are sent)
  tracesSampleRate: 0.3,
  // Default sample rate for profiling
  profilesSampleRate: 0.1,
  // Sample rate for session profiling
  profileSessionSampleRate: 1.0,
  // Default environment
  environment: process.env.NODE_ENV || 'development',
  // Max breadcrumbs to capture
  maxBreadcrumbs: 50,
  // Whether to capture errors in development
  enableInDevelopment: false,
  // Which console methods to capture as breadcrumbs
  consoleMethodsToCapture: ['error', 'warn'],
  // Default release versioning
  release: process.env.GIT_COMMIT_SHA || process.env.npm_package_version,
  // Whether to send personally identifiable information
  sendDefaultPii: false,
  // Integrations to enable
  enabledIntegrations: {
    extraErrorData: true,
    captureConsole: true,
    reportingObserver: true,
  }
};

let isInitialized = false;

/**
 * Initialize Sentry for monitoring and error tracking
 *
 * @param {Object} config - Configuration options for Sentry
 * @param {string} config.dsn - Sentry DSN (required)
 * @param {number} [config.tracesSampleRate] - Sample rate for transactions (0.0 to 1.0)
 * @param {number} [config.profilesSampleRate] - Sample rate for profiling (0.0 to 1.0)
 * @param {string} [config.environment] - Environment name (production, staging, development)
 * @param {boolean} [config.enableInDevelopment] - Whether to enable Sentry in development
 * @param {string} [config.release] - Release version
 * @param {boolean} [config.sendDefaultPii] - Whether to send personally identifiable information
 * @param {Object} [config.enabledIntegrations] - Which integrations to enable
 * @returns {boolean} Whether Sentry was successfully initialized
 */
export function initSentry(config = {}) {
  // Skip initialization if already done
  if (isInitialized) {
    systemLogger.warn('Sentry already initialized');
    return true;
  }

  // Merge provided config with defaults
  const sentryConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Sentry DSN is required
  if (!sentryConfig.dsn) {
    systemLogger.warn('Sentry DSN not provided - monitoring disabled');
    return false;
  }

  // Skip initialization in development environments unless explicitly enabled
  const isDevelopment = sentryConfig.environment === 'development';
  if (isDevelopment && !sentryConfig.enableInDevelopment) {
    systemLogger.info('Sentry disabled in development environment');
    return false;
  }

  try {
    // Build integrations array
    const integrations = [];

    if (sentryConfig.enabledIntegrations.extraErrorData) {
      integrations.push(new ExtraErrorData({ depth: 10 }));
    }

    if (sentryConfig.enabledIntegrations.captureConsole) {
      integrations.push(new CaptureConsole({
        levels: sentryConfig.consoleMethodsToCapture
      }));
    }

    if (sentryConfig.enabledIntegrations.reportingObserver) {
      integrations.push(new ReportingObserver());
    }

    // Initialize Sentry with provided configuration
    Sentry.init({
      dsn: sentryConfig.dsn,
      integrations,
      tracesSampleRate: sentryConfig.tracesSampleRate,
      profilesSampleRate: sentryConfig.profilesSampleRate,
      environment: sentryConfig.environment,
      release: sentryConfig.release,
      maxBreadcrumbs: sentryConfig.maxBreadcrumbs,
      sendDefaultPii: sentryConfig.sendDefaultPii,
      beforeSend: (event) => {
        // Don't send events in development unless explicitly enabled
        if (isDevelopment && !sentryConfig.enableInDevelopment) {
          return null;
        }
        return event;
      }
    });

    isInitialized = true;
    systemLogger.info('Sentry initialized successfully', {
      environment: sentryConfig.environment,
      release: sentryConfig.release,
      tracesSampleRate: sentryConfig.tracesSampleRate
    });

    return true;
  } catch (error) {
    systemLogger.error('Failed to initialize Sentry', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * Create Express middleware for Sentry error handling
 *
 * @returns {Object} Object containing requestHandler and errorHandler middleware
 */
export function createSentryMiddleware() {
  if (!isInitialized) {
    systemLogger.warn('Sentry not initialized - middleware will be no-op');

    // Return no-op middleware functions
    const noopMiddleware = (req, res, next) => next();
    return {
      requestHandler: noopMiddleware,
      errorHandler: noopMiddleware
    };
  }

  return {
    // Captures request data
    requestHandler: Sentry.Handlers.requestHandler(),
    // Handles errors
    errorHandler: Sentry.Handlers.errorHandler()
  };
}

/**
 * Capture an error with Sentry
 *
 * @param {Error} error - The error to capture
 * @param {Object} [context] - Additional context for the error
 * @param {string} [level='error'] - Severity level (fatal, error, warning, info, debug)
 * @returns {string|null} The event ID if captured, null otherwise
 */
export function captureError(error, context = {}, level = 'error') {
  if (!isInitialized) {
    systemLogger.warn('Sentry not initialized - error not captured', {
      error: error.message
    });
    return null;
  }

  try {
    const eventId = Sentry.captureException(error, {
      level,
      contexts: {
        ...context
      }
    });
    return eventId;
  } catch (err) {
    systemLogger.error('Failed to capture error with Sentry', {
      originalError: error.message,
      sentryError: err.message
    });
    return null;
  }
}

/**
 * Capture a message with Sentry
 *
 * @param {string} message - The message to capture
 * @param {Object} [context] - Additional context for the message
 * @param {string} [level='info'] - Severity level (fatal, error, warning, info, debug)
 * @returns {string|null} The event ID if captured, null otherwise
 */
export function captureMessage(message, context = {}, level = 'info') {
  if (!isInitialized) {
    systemLogger.warn('Sentry not initialized - message not captured');
    return null;
  }

  try {
    const eventId = Sentry.captureMessage(message, {
      level,
      contexts: {
        ...context
      }
    });
    return eventId;
  } catch (err) {
    systemLogger.error('Failed to capture message with Sentry', {
      originalMessage: message,
      sentryError: err.message
    });
    return null;
  }
}

/**
 * Start a new transaction for performance monitoring
 *
 * @param {string} name - Transaction name
 * @param {string} op - Operation category (e.g., 'http.request', 'db.query')
 * @param {Object} [data] - Additional data for the transaction
 * @returns {Object|null} Transaction object or null if Sentry is not initialized
 */
export function startTransaction(name, op, data = {}) {
  if (!isInitialized) {
    return null;
  }

  try {
    return Sentry.startTransaction({
      name,
      op,
      data
    });
  } catch (err) {
    systemLogger.error('Failed to start Sentry transaction', {
      name,
      op,
      error: err.message
    });
    return null;
  }
}

/**
 * Set the current user for Sentry events
 *
 * @param {string} id - User ID
 * @param {Object} [data] - Additional user data
 */
export function setUser(id, data = {}) {
  if (!isInitialized) {
    return;
  }

  try {
    Sentry.setUser({
      id,
      ...data
    });
  } catch (err) {
    systemLogger.error('Failed to set Sentry user', {
      id,
      error: err.message
    });
  }
}

/**
 * Set a tag for all subsequent events
 *
 * @param {string} key - Tag key
 * @param {string} value - Tag value
 */
export function setTag(key, value) {
  if (!isInitialized) {
    return;
  }

  try {
    Sentry.setTag(key, value);
  } catch (err) {
    systemLogger.error('Failed to set Sentry tag', {
      key,
      value,
      error: err.message
    });
  }
}

/**
 * Configure alerting thresholds and rules
 *
 * @param {Object} rules - Alerting rules configuration
 */
export function configureAlerts(rules) {
  // Sentry alerting is configured in the Sentry dashboard
  // This function is a placeholder for documentation purposes
  systemLogger.info('Sentry alerts are configured in the Sentry dashboard');
  systemLogger.info('Recommended alert rules:', { rules });
}

export default {
  initSentry,
  createSentryMiddleware,
  captureError,
  captureMessage,
  startTransaction,
  setUser,
  setTag,
  configureAlerts
};
