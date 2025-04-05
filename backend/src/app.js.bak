'use strict';

import express from 'express';
import path from 'path';
import fs from 'fs';
// Import the container directly 
import { container } from "#app/config/container.js";
import { infraLogger } from "#app/core/infra/logging/domainLogger.js"; 
import { memoryMonitor } from "#app/core/infra/memory/MemoryMonitor.js";

// Import Setup Modules
import { registerAllEventHandlers } from '#app/config/setup/events.js';
import { configureCoreMiddleware } from '#app/config/setup/middleware.js';
import { configureSwagger } from '#app/config/setup/swagger.js';
import { mountAppRoutes } from '#app/config/setup/routes.js';
import { configureErrorHandlers } from '#app/config/setup/errors.js';
import { initializeSentry } from '#app/config/setup/sentry.js';
import { generateSwaggerUI } from '#app/scripts/generate-swagger-ui.js';

// Get config and logger early
let config, logger;
try {
    config = container.get('config');
    logger = container.get('infraLogger') || infraLogger;
    logger.info('[App] Starting application setup...');
    logger.info(`[App] Running in ${process.env.NODE_ENV} mode`);
} catch (error) {
    console.error('[App] CRITICAL: Failed to get initial config or logger from container!', error);
    process.exit(1); 
}

// Create Express application
const app = express();

/**
 * Main application setup function.
 */
async function initializeApp() {
    try {
        logger.info('[App] Initializing application...');
        
        // 1. Initialize Sentry (MUST be first for request monitoring)
        const { requestHandler, errorHandler } = initializeSentry(app, config, logger);
        app.use(requestHandler); // This must be the first middleware
        
        // 2. Register Event Handlers (now async)
        await registerAllEventHandlers(container);
        
        // 3. Generate Swagger UI files
        await generateSwaggerUI(config, logger);
        
        // 4. Create explicit public routes BEFORE any other middleware
        // Mount Swagger UI directly without auth
        app.use('/api-docs', express.static('openapi/generated/swagger-ui'));
        logger.info('[App] Swagger UI mounted at /api-docs (public access)');
        
        // Direct API docs JSON endpoint without auth
        app.get('/api-docs-json', (req, res) => {
            try {
                const openApiSpecPath = path.resolve('./openapi/generated/openapi-spec.json');
                if (fs.existsSync(openApiSpecPath)) {
                    res.sendFile(openApiSpecPath);
                } else {
                    res.status(404).json({ 
                        success: false,
                        message: 'OpenAPI specification not found' 
                    });
                }
            } catch (error) {
                logger.error('[App] Error serving OpenAPI spec:', { error: error.message });
                res.status(500).json({ 
                    success: false, 
                    message: 'Error serving OpenAPI specification' 
                });
            }
        });
        
        // 5. Configure Swagger & OpenAPI Validator BEFORE middleware to avoid auth checks
        configureSwagger(app, config, container);
        
        // Add a Sentry test endpoint for error monitoring verification
        app.get('/sentry-test', (req, res, next) => {
            try {
                const errorType = req.query.type || 'default';
                logger.info(`Sentry test requested with error type: ${errorType}`);
                
                if (errorType === 'reference') {
                    // ReferenceError
                    const nonExistent = undefinedVar.test;
                } else if (errorType === 'type') {
                    // TypeError
                    const num = 42;
                    num.toLowerCase();
                } else if (errorType === 'async') {
                    // Simulate async error with setTimeout
                    setTimeout(() => {
                        try {
                            throw new Error('Async Sentry test error');
                        } catch (e) {
                            // Import dynamically to avoid circular dependencies
                            import('#app/config/setup/sentry.js').then(sentry => {
                                sentry.captureException(e, { async: true, endpoint: '/sentry-test' });
                            });
                        }
                    }, 100);
                    return res.status(200).json({ 
                        success: true, 
                        message: 'Async error captured, check Sentry dashboard'
                    });
                } else {
                    throw new Error(`Sentry test error: ${errorType}`);
                }
            } catch (error) {
                logger.error('Sentry test error:', { 
                    error: error.message, 
                    stack: error.stack,
                    endpoint: '/sentry-test',
                    errorType: req.query.type
                });
                next(error);
            }
        });
        
        // 6. Configure Core Middleware
        configureCoreMiddleware(app, config, container);
        
        // 7. Mount All Application Routes
        await mountAppRoutes(app, config, container); 
        
        // 8. Add Sentry error handler (before other error handlers)
        app.use(errorHandler);
        
        // 9. Configure Error Handlers (Must be LAST after routes)
        configureErrorHandlers(app, container);
        
        logger.info('[App] Application initialized successfully.');
        
        // 10. Start background tasks
        memoryMonitor.start();
        logger.info('[App] Background services started (Memory Monitor).');

    } catch (error) {
        logger.error('[App] CRITICAL: Application initialization failed!', { 
            error: error.message, 
            stack: error.stack
        });
        
        // Optional: Add a fallback error handler
        app.use((_req, res, _next) => {
             res.status(503).json({ success: false, error: 'Server setup failed, service unavailable.' });
        });
        
        process.exit(1);
    }
}

// Initialize the application
initializeApp();

// Export the configured app instance
export default app;

// --- REMOVED OLD CODE --- 
// All direct middleware (.use), route mounting (.get, .use for routes), 
// error handlers (.use for errors), and the mountRoutesAndFinalize function 
// previously in this file should now be gone.
