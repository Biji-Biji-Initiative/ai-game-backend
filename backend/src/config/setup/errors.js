'use strict';

// Assuming these are correctly exported from ErrorHandler.js
import { 
    errorHandler, 
    notFoundHandler
} from "#app/core/infra/errors/ErrorHandler.js";
import { infraLogger } from "#app/core/infra/logging/domainLogger.js";
import { captureException } from "#app/config/setup/sentry.js";

/**
 * Configures application error handlers.
 * IMPORTANT: These should be added AFTER all routes are mounted.
 * @param {express.Application} app - The Express application instance.
 * @param {DIContainer} container - The Dependency Injection container.
 */
function configureErrorHandlers(app, container) {
    const logger = container.get('infraLogger') || infraLogger;
    logger.info('[Setup] Configuring error handlers...');

    // 1. 404 Handler (if no route matched)
    app.use(notFoundHandler);
    logger.debug('[Setup] 404 Not Found handler applied.');

    // 2. General error logging and capture middleware
    app.use((err, req, res, next) => {
        // Capture all errors in Sentry
        captureException(err, {
            path: req.path,
            method: req.method,
            requestId: req.id,
            userId: req.user?.id || 'unauthenticated'
        }, logger);
        
        // Continue to the next error handler
        next(err);
    });
    logger.debug('[Setup] Sentry error capture middleware applied.');

    // 3. OpenAPI Validation Error Handler (Specific)
    app.use((err, req, res, next) => {
        // Check if this is an OpenAPI validation error
        if (err.status === 400 && err.errors && Array.isArray(err.errors)) {
             logger.warn('[ErrorHandler] OpenAPI Validation Error', { 
                 error: err.message, 
                 details: err.errors, 
                 path: req.path 
            });
             return res.status(400).json({
                success: false,
                message: err.message || 'Validation error',
                errors: err.errors.map(e => ({
                    field: e.path || 'unknown',
                    message: e.message
                }))
            });
        }
        // For other errors, pass to the main error handler
        next(err);
    });
    logger.debug('[Setup] OpenAPI validation error handler applied.');

    // 4. Final Global Error Handler
    // Use errorHandler directly as middleware
    app.use(errorHandler);
    logger.debug('[Setup] Final global error handler applied.');
    
    logger.info('[Setup] Error handler configuration complete.');
}

export { configureErrorHandlers }; 