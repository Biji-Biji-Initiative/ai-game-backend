'use strict';

import express from 'express';
// Keep minimal necessary imports here
import { container } from "#app/config/container.js";
import { infraLogger } from "#app/core/infra/logging/domainLogger.js"; 
import { memoryMonitor } from "#app/core/infra/memory/MemoryMonitor.js";

// Import Setup Modules
import { registerAllEventHandlers } from '#app/config/setup/events.js';
import { configureCoreMiddleware } from '#app/config/setup/middleware.js';
import { configureSwagger } from '#app/config/setup/swagger.js'; // Ensure path is correct
import { mountAppRoutes } from '#app/config/setup/routes.js';
import { configureErrorHandlers } from '#app/config/setup/errors.js';

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
        
        // 1. Register Event Handlers
        registerAllEventHandlers(container);
        
        // 2. Configure Core Middleware (CORS, BodyParser, Auth, Logging, etc.)
        configureCoreMiddleware(app, config, container);
        
        // 3. Configure Swagger & OpenAPI Validator
        configureSwagger(app, config, container);
        
        // 4. Mount All Application Routes (API, Static, Util)
        await mountAppRoutes(app, config, container); 
        
        // 5. Configure Error Handlers (Must be LAST after routes)
        configureErrorHandlers(app, container);
        
        logger.info('[App] Application initialized successfully.');
        
        // 6. Start background tasks (e.g., memory monitor)
        memoryMonitor.start();
        logger.info('[App] Background services started (Memory Monitor).');

    } catch (error) {
        logger.error('[App] CRITICAL: Application initialization failed!', { 
            error: error.message, 
            stack: error.stack // Log stack in dev or if needed
        });
        // Optional: Add a fallback error handler if core setup fails
        app.use((_req, res, _next) => {
             res.status(503).json({ success: false, error: 'Server setup failed, service unavailable.' });
        });
        // Exit if critical setup fails
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
