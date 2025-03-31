/**
 * Sentry Instrumentation Module
 *
 * This module sets up Sentry instrumentation for profiling and performance monitoring.
 * It should be imported early in the application lifecycle.
 */

import * as Sentry from '@sentry/node';

// Get environment
const isProduction = process.env.NODE_ENV === 'production';

// Only import and use profiling in production
let isProfilingInitialized = false;

// Initialize the profiling integration conditionally
try {
  // Skip profiling initialization in non-production environments
  if (isProduction) {
    // Dynamic import to avoid failing on platforms without the native module
    import('@sentry/profiling-node')
      .then(({ ProfilingIntegration }) => {
        Sentry.addIntegration(new ProfilingIntegration());
        isProfilingInitialized = true;
        console.info('✅ Sentry profiling integration initialized successfully');
      })
      .catch(error => {
        console.warn('⚠️ Sentry profiling not available:', error.message);
      });
  } else {
    console.info('ℹ️ Sentry profiling disabled in non-production environment');
  }
} catch (error) {
  console.warn('⚠️ Failed to initialize Sentry profiling:', error.message);
}

// Export for potential direct use
export default {
  isInitialized: true,
  isProfilingInitialized
};
