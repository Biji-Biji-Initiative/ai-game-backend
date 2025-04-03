'use strict';

import express from "express";
import { logger as appLogger } from '#app/core/infra/logging/logger.js';

/**
 * @deprecated This class is deprecated in favor of the direct route mounting approach in directRoutes.js.
 * 
 * Route Factory 
 * Handles route mounting from the container
 */
class RouteFactory {
    /**
     * Create a new RouteFactory
     * @deprecated Use directRoutes.js mountAllRoutes function instead
     * @param {Object} container - DI container for dependency injection
     * @param {Function} authenticateUserMiddleware - Authentication middleware function
     */
    constructor(container, authenticateUserMiddleware) {
        this.container = container;
        this.authenticateUserMiddleware = authenticateUserMiddleware || ((req, res, next) => next()); // Default to pass-through if not provided
        this.logger = appLogger.child({ component: 'RouteFactory' });
        this.logger.debug('[RouteFactory] Initialization complete.');
    }

    /**
     * Mount all routers from the DI container onto the Express app.
     * This method gets pre-configured routers from the container and mounts them with appropriate paths and middleware.
     * @param {Object} app - Express application instance
     * @param {string} prefix - API route prefix (e.g., '/api/v1')
     */
    async mountAll(app, prefix = '/api/v1') {
        this.logger.info(`[RouteFactory] Mounting all routers at prefix: ${prefix}`);
        
        // Define the mapping between route paths and their corresponding container registrations
        const routeModules = {
            '/users': 'userRoutes',
            '/auth': 'authRoutes',
            '/personality': 'personalityRoutes',
            '/progress': 'progressRoutes',
            '/adaptive': 'adaptiveRoutes',
            '/focus-areas': 'focusAreaRoutes',
            '/challenges': 'challengeRoutes',
            '/evaluations': 'evaluationRoutes',
            '/user-journey': 'userJourneyRoutes',
            '/system': 'systemRoutes',
            '/health': 'healthCheckRoutes',
            '/events': 'eventBusRoutes'
        };

        // Routes that don't require authentication
        const publicPaths = ['/auth', '/health'];
        
        // TEMPORARY: Skip auth for testing
        const skipAuth = true;
        
        // Track mount statistics
        let successfulMounts = 0;
        let failedMounts = 0;

        // Mount each router from the container
        for (const [path, routeName] of Object.entries(routeModules)) {
            this.logger.debug(`[RouteFactory] Attempting to get and mount '${routeName}' at '${path}'...`);
            
            try {
                // Get the router from the container
                const routerInstance = this.container.get(routeName);
                
                // Verify we have a valid router
                if (!routerInstance || typeof routerInstance !== 'function') {
                    throw new Error(`Invalid router retrieved for ${routeName} - not a function/router object`);
                }
                
                // Determine the full mount path
                const mountPath = `${prefix}${path}`;
                
                // Apply appropriate middleware based on whether this is a public or protected route
                if (publicPaths.includes(path) || skipAuth) {
                    // Public route or auth skipped for testing - no auth middleware needed
                    app.use(mountPath, routerInstance);
                    this.logger.debug(`[RouteFactory] Mounted ${skipAuth ? 'UNPROTECTED' : 'public'} route ${routeName} at ${mountPath}`);
                } else {
                    // Protected route - apply auth middleware
                    app.use(mountPath, this.authenticateUserMiddleware, routerInstance);
                    this.logger.debug(`[RouteFactory] Mounted protected route ${routeName} at ${mountPath} with auth middleware`);
                }
                
                successfulMounts++;
                this.logger.info(`[RouteFactory] Successfully mounted ${routeName} at ${mountPath}`);
            } catch (error) {
                failedMounts++;
                this.logger.error(`[RouteFactory] Failed to get or mount route module '${routeName}' for path '${path}'. Error: ${error.message}`);
                
                // Mount a fallback router to handle the failure gracefully
                const fallbackRouter = express.Router();
                fallbackRouter.all('*', (req, res) => {
                    res.status(501).json({
                        error: 'Route unavailable',
                        message: `The ${path.slice(1)} service is currently unavailable: ${error.message}`
                    });
                });
                
                app.use(`${prefix}${path}`, fallbackRouter);
                this.logger.warn(`[RouteFactory] Mounted FALLBACK router for ${prefix}${path}`);
            }
        }
        
        this.logger.info(`[RouteFactory] Mounting complete. Successfully mounted: ${successfulMounts}, Fallbacks mounted: ${failedMounts}`);
    }
}

export default RouteFactory;
