'use strict';

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import createApiTesterRoutes from "#app/core/infra/http/routes/apiTesterRoutes.js";
import { infraLogger } from "#app/core/infra/logging/domainLogger.js";
import { createAuthMiddleware } from "#app/core/infra/http/middleware/auth.js"; // Import the auth middleware factory
// Import prometheus client if needed for /metrics
// import { register } from 'prom-client'; 
import userRoutes from "#app/core/infra/http/routes/userRoutes.js";
import personalityRoutes from "#app/core/infra/http/routes/personalityRoutes.js";
import progressRoutes from "#app/core/infra/http/routes/progressRoutes.js";
import adaptiveRoutes from "#app/core/infra/http/routes/adaptiveRoutes.js";
import focusAreaRoutes from "#app/core/infra/http/routes/focusAreaRoutes.js";
import challengeRoutes from "#app/core/infra/http/routes/challengeRoutes.js";
import evaluationRoutes from "#app/core/infra/http/routes/evaluationRoutes.js";
import userJourneyRoutes from "#app/core/infra/http/routes/userJourneyRoutes.js";
import systemRoutes from "#app/core/infra/http/routes/systemRoutes.js";
import healthRoutes from "#app/core/infra/http/routes/healthRoutes.js";
import eventBusRoutes from "#app/core/infra/http/routes/eventBusRoutes.js";
import createAuthRoutes from "#app/core/infra/http/routes/authRoutes.js";
import { logger as appLogger } from "#app/core/infra/logging/logger.js";
import { mountAllRoutes } from './directRoutes.js';

/**
 * Configures and mounts all application routes.
 * @param {express.Application} app - The Express application instance.
 * @param {Object} config - The application configuration object.
 * @param {DIContainer} container - The Dependency Injection container.
 */
async function mountAppRoutes(app, config, container) {
    const logger = container.get('infraLogger') || infraLogger;
    logger.info('[Setup] Mounting application routes...');

    // --- Root route for API information ---
    app.get('/', (req, res) => {
        res.status(200).json({
            success: true,
            message: 'AI Fight Club API is running',
            version: '1.0.0',
            apiDocs: `${config.server.baseUrl}/api-docs`,
            health: `${config.server.baseUrl}/api/health`
        });
    });
    logger.debug('[Setup] Root route mounted.');

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
            authenticated: false
        });
    });
    logger.debug(`[Setup] Mounted direct route: ${config.api.prefix}/auth/status`);

    // API Tester routes
    const apiTesterPath = `${config.api.prefix}/api-tester`;
    app.use(apiTesterPath, createApiTesterRoutes(container));
    logger.info(`[Setup] API Tester routes mounted at ${apiTesterPath}`);

    // --- Main API Routes --- 
    // Use direct route mounting method
    try {
        logger.debug('[Setup] Using direct route mounting...');
        const routesMounted = await mountAllRoutes(app, container, config);
        if (routesMounted) {
          logger.info(`[Setup] Main API routes mounted directly at ${config.api.prefix}`);
        } else {
          logger.error('[Setup] Failed to mount API routes directly!');
          throw new Error('Failed to mount API routes');
        }
    } catch (error) {
        logger.error('[Setup] CRITICAL: Failed to mount API routes!', { error: error.message });
        throw error; // Re-throw to prevent server starting with broken routes
    }

    // --- Utility Routes (after main API routes) --- 
    // Prometheus metrics endpoint
    app.get('/metrics', async (req, res) => {
        try {
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
        // If it's already a versioned request, let it through
        if (req.path.startsWith('/v1/')) {
            return next();
        }

        // Special cases for root paths
        if (req.path === '/' || req.path === '') {
            return res.redirect(`${config.api.prefix}/health`);
        }
        if (req.path === '/docs') {
            return res.redirect(config.api.docsPath || '/api-docs');
        }

        // For any other /api requests, try to handle them at the versioned endpoint
        const newPath = `${config.api.prefix}${req.path}`;
        logger.debug(`[Setup] Redirecting /api request to versioned endpoint: ${newPath}`);
        return res.redirect(307, newPath);
    });
    logger.debug('[Setup] Mounted root /api redirect handler.');

    // Add a health check endpoint at the root API path that redirects to the versioned one
    app.get('/api/health', (req, res) => {
        res.redirect(307, `${config.api.prefix}/health`);
    });

    logger.info('[Setup] Application route mounting complete.');
}

export { mountAppRoutes }; 