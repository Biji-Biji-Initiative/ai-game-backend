/**
 * Monitoring Configuration
 *
 * This file contains configuration for monitoring and alerting
 * including Sentry error tracking and custom monitoring rules.
 */

// Default Sentry configuration
export const sentryConfig = {
  // Sentry DSN - from environment variable
  dsn: process.env.SENTRY_DSN,

  // Environment-specific configuration
  development: {
    // Sample rate for transactions in development
    tracesSampleRate: 0.1,
    // Enable Sentry in development
    enableInDevelopment: true, // Re-enabled for local testing
  },

  staging: {
    // Sample rate for transactions in staging
    tracesSampleRate: 0.3,
  },

  production: {
    // Sample rate for transactions in production
    tracesSampleRate: 0.5,
    // Sample rate for profiling in production
    profilesSampleRate: 0.2, // Re-enabled with the updated module
  },

  // Alerting thresholds
  alerts: {
    // API response time thresholds (ms)
    apiResponseTime: {
      warning: 2000,  // 2 seconds
      critical: 5000,  // 5 seconds
    },

    // Memory usage thresholds (MB)
    memoryUsage: {
      warning: 500,  // 500 MB
      critical: 800,  // 800 MB
    },

    // CPU usage thresholds (%)
    cpuUsage: {
      warning: 80,  // 80%
      critical: 90,  // 90%
    },

    // Error rate thresholds (errors per minute)
    errorRate: {
      warning: 5,   // 5 errors per minute
      critical: 20,  // 20 errors per minute
    },

    // OpenAI API-specific alerting thresholds
    openai: {
      // Response time thresholds (ms)
      responseTime: {
        warning: 4000,   // 4 seconds
        critical: 10000,  // 10 seconds
      },

      // Failure rate thresholds (%)
      failureRate: {
        warning: 5,   // 5% failures
        critical: 15,  // 15% failures
      },

      // Tokens per second rate limit warning (%)
      tokenRateLimitUsage: {
        warning: 70,  // 70% of rate limit
        critical: 90,  // 90% of rate limit
      },
    },
  },

  // Periodic health checks configuration
  healthChecks: {
    // Health check interval (ms)
    intervalMs: 60000,  // 1 minute

    // Services to check
    services: ['database', 'openai', 'redis'],

    // Whether to log all health checks
    logAllChecks: false,

    // Whether to send health check metrics to Sentry
    sendToSentry: true, // Re-enabled with the updated module
  },
};

/**
 * Get environment-specific Sentry configuration
 *
 * @param {string} environment - Current environment (development, staging, production)
 * @returns {Object} Environment-specific Sentry configuration
 */
export function getSentryConfig(environment = process.env.NODE_ENV) {
  // Default to development if environment not specified
  const env = environment || 'development';

  // Get environment-specific configuration
  const envConfig = sentryConfig[env] || sentryConfig.development;

  // Merge with base configuration
  return {
    dsn: sentryConfig.dsn,
    environment: env,
    ...envConfig,

    // Always include alerts configuration
    alerts: sentryConfig.alerts,
  };
}

export default {
  sentryConfig,
  getSentryConfig,
};
