'use strict';

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import RouteFactory from "#app/core/infra/http/routes/RouteFactory.js";
import createApiTesterRoutes from "#app/core/infra/http/routes/apiTesterRoutes.js";
import { infraLogger } from "#app/core/infra/logging/domainLogger.js";
import { createAuthMiddleware } from "#app/core/infra/http/middleware/auth.js"; // Import the auth middleware factory
// Import prometheus client if needed for /metrics
// import { register } from 'prom-client'; 

/**
 * Configures and mounts all application routes.
 * @param {express.Application} app - The Express application instance.
 * @param {Object} config - The application configuration object.
 * @param {DIContainer} container - The Dependency Injection container.
 */
async function mountAppRoutes(app, config, container) {
    const logger = container.get('infraLogger') || infraLogger;
    logger.info('[Setup] Mounting application routes...');

    // --- Get Dependencies for Auth Middleware --- 
    let authenticateUserMiddleware;
    try {
        const supabase = container.get('db');
        // Create the authentication middleware
        authenticateUserMiddleware = createAuthMiddleware(supabase);
        logger.info('[Setup] Authentication middleware created successfully');
    } catch (error) {
        logger.error('[Setup] ERROR: Failed to create authentication middleware', { error });
        authenticateUserMiddleware = (req, res, next) => {
            next(new Error('Authentication middleware failed to initialize')); 
        };
    }

    // --- Static Files --- 
    // Serve API Tester UI static files
    const testerUiPath = path.join(process.cwd(), 'admin');
    if (fs.existsSync(testerUiPath)) {
        app.use(config.api.testerPath, express.static(testerUiPath));
        logger.info(`[Setup] API Tester UI served from ${testerUiPath} at ${config.api.testerPath}`);
    } else {
        logger.warn(`[Setup] API Tester UI path not found: ${testerUiPath}`);
    }

    // --- Specific Endpoints & Routers (before main API routes) --- 
    // Direct auth status endpoint
    app.get(`${config.api.prefix}/auth/status`, (req, res) => {
        res.status(200).json({
            status: 'success',
            message: 'Auth service is running',
            authenticated: false // This might need refinement based on actual auth status
        });
    });
    logger.debug(`[Setup] Mounted direct route: ${config.api.prefix}/auth/status`);

    // API Tester routes
    const apiTesterPath = `${config.api.prefix}/api-tester`;
    app.use(apiTesterPath, createApiTesterRoutes(container));
    logger.info(`[Setup] API Tester routes mounted at ${apiTesterPath}`);

    // --- Main API Routes (using RouteFactory) --- 
    // Note: RouteFactory.setupRoutes might be deprecated if mountAll is preferred
    // RouteFactory.setupRoutes(app, container);
    
    // Use mountAll from RouteFactory instance
    try {
        logger.debug('[Setup] Creating RouteFactory instance...');
        const routeFactory = new RouteFactory(container, authenticateUserMiddleware);
        logger.debug('[Setup] Calling routeFactory.mountAll...');
        await routeFactory.mountAll(app, config.api.prefix);
        logger.info(`[Setup] Main API routes mounted via RouteFactory at ${config.api.prefix}`);
    } catch (error) {
        logger.error('[Setup] CRITICAL: Failed to mount main API routes via RouteFactory!', { error: error.message });
        throw error; // Re-throw to prevent server starting with broken routes
    }

    // --- Utility Routes (after main API routes) --- 
    // Prometheus metrics endpoint
    app.get('/metrics', async (req, res) => {
        try {
            // Assuming 'register' is the prom-client register instance
            // This needs to be imported or made available if used.
            // For now, commenting out the prometheus-specific parts.
            // res.set('Content-Type', register.contentType);
            // res.end(await register.metrics());
            res.set('Content-Type', 'text/plain');
            res.send('# Prometheus metrics endpoint configured but client not integrated yet.\n');
        } catch (ex) {
            logger.error('[Setup] Error serving /metrics endpoint', { error: ex.message });
            res.status(500).end(ex.message);
        }
    });
    logger.debug('[Setup] Mounted /metrics endpoint.');

    // Root /api redirect handler
    app.use('/api', (req, res, next) => {
        if (req.path === '/' || req.path === '') {
            return res.redirect(`${config.api.prefix}/health`);
        }
        if (req.path === '/docs') {
            return res.redirect(config.api.docsPath || '/api-docs'); // Use config path
        }
        next(); // Pass to 404 handler if no other route matches
    });
    logger.debug('[Setup] Mounted root /api redirect handler.');

    logger.info('[Setup] Application route mounting complete.');
}

export { mountAppRoutes }; 