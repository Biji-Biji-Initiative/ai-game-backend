'use strict';

import * as Sentry from '@sentry/node';
// Commenting out the profiling import to avoid dependency issues
// import { ProfilingIntegration } from '@sentry/profiling-node';
import { infraLogger } from '#app/core/infra/logging/domainLogger.js';

/**
 * Initialize Sentry for error monitoring and performance tracking
 * 
 * @param {Object} config Application configuration
 * @param {Object} app Express application instance
 * @param {Function} logger Logger instance
 * @returns {Function} Express middleware for Sentry request handler
 */
function initializeSentry(app, config, logger = infraLogger) {
    // Skip if DSN is not provided or Sentry is disabled
    if (!config.sentry.enabled) {
        logger.info('[Setup] Sentry disabled - DSN not provided');
        return {
            requestHandler: (req, res, next) => next(),
            errorHandler: (err, req, res, next) => next(err)
        };
    }

    try {
        logger.info('[Setup] Initializing Sentry error monitoring...');
        
        // Initialize Sentry SDK
        Sentry.init({
            dsn: config.sentry.dsn,
            integrations: [
                // Enable HTTP capturing for performance tracking
                new Sentry.Integrations.Http({ tracing: true }),
                // Enable Express tracing for performance monitoring
                new Sentry.Integrations.Express({ app }),
                // Profiling integration disabled due to missing dependencies
                // new ProfilingIntegration(),
            ],
            // Set environment for filtering issues
            environment: config.sentry.environment,
            // Set trace sample rate
            tracesSampleRate: config.sentry.tracesSampleRate,
            // Set profiling sample rate
            profilesSampleRate: config.sentry.profilesSampleRate,
        });

        // The request handler must be the first middleware
        const requestHandler = Sentry.Handlers.requestHandler();
        
        // Add requestId to all Sentry events
        app.use((req, res, next) => {
            if (req.id) {
                Sentry.configureScope(scope => {
                    scope.setTag('requestId', req.id);
                });
            }
            next();
        });

        // Create error handler (to be used after all controllers)
        const errorHandler = Sentry.Handlers.errorHandler();

        logger.info('[Setup] Sentry initialized successfully');
        
        return { requestHandler, errorHandler };
    } catch (error) {
        logger.error('[Setup] Failed to initialize Sentry:', { error: error.message });
        return {
            requestHandler: (req, res, next) => next(),
            errorHandler: (err, req, res, next) => next(err)
        };
    }
}

/**
 * Capture exceptions in Sentry and optionally log them
 * 
 * @param {Error} error The error to capture
 * @param {Object} additionalData Additional context data to include
 * @param {Function} logger Optional logger to also log the error
 */
function captureException(error, additionalData = {}, logger = null) {
    if (error) {
        // Add additional context to the error
        Sentry.withScope(scope => {
            // Add the error message as a breadcrumb
            scope.addBreadcrumb({
                category: 'error',
                message: error.message,
                level: 'error',
            });
            
            // Add additional data as context
            if (additionalData) {
                Object.entries(additionalData).forEach(([key, value]) => {
                    scope.setExtra(key, value);
                });
            }
            
            // Capture the exception
            Sentry.captureException(error);
        });
        
        // Log the error if a logger is provided
        if (logger && typeof logger.error === 'function') {
            logger.error(error.message, { 
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    ...additionalData
                }
            });
        }
    }
}

/**
 * Set user information in Sentry for user-specific error tracking
 * 
 * @param {Object} user User object with id and email
 */
function setUser(user) {
    if (user && user.id) {
        Sentry.setUser({
            id: user.id,
            email: user.email || undefined,
            username: user.username || undefined,
        });
    }
}

/**
 * Clear user information from Sentry scope
 */
function clearUser() {
    Sentry.configureScope(scope => scope.setUser(null));
}

export { 
    initializeSentry,
    captureException,
    setUser,
    clearUser
};

export default {
    initialize: initializeSentry,
    captureException,
    setUser,
    clearUser
}; 