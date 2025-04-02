/**
 * API Tester Routes Index
 * Provides debug endpoints for the API tester
 */

// Convert requires to imports
import { Router } from 'express';
import { logger } from "#app/core/infra/logging/logger.js"; // Assuming logger might be useful
import entityStateRouterFactory from './entity-state.js'; // Import the factory
// Assuming environment utils are ESM compatible and path is correct
// import { isDevMode } from '#app/utils/environment.js'; // Let's hold off on this, use NODE_ENV check directly for simplicity
import { requireAdmin } from '#app/core/infra/http/middleware/auth.js'; // Correct path for requireAdmin

/**
 * Factory function to create the main API tester router and mount sub-routes.
 * @param {DIContainer} container - The Dependency Injection container.
 * @returns {express.Router}
 */
export default function createApiTesterIndexRouter(container) {
    // Create a router instance
    const router = Router();

    // Basic check for container
    if (!container) {
        logger.error('CRITICAL: DI Container not provided to createApiTesterIndexRouter');
        router.use((req, res) => {
            res.status(500).json({ success: false, error: 'API Tester Index Router Misconfiguration' });
        });
        return router;
    }

    // Resolve services needed by sub-routes (specifically entity-state)
    let userService, challengeService, evaluationService, focusAreaService;
    try {
        userService = container.get('userService');
        challengeService = container.get('challengeService');
        evaluationService = container.get('evaluationService');
        focusAreaService = container.get('focusAreaService');
        // Resolve others if needed...
    } catch (error) {
        logger.error('Failed to resolve services for API Tester Index Router', { error: error.message });
         router.use((req, res) => {
            res.status(500).json({ success: false, error: `API Tester DI Resolution Error: ${error.message}` });
        });
        return router;
    }
    
    // Middleware: Only allow these routes in development mode or for admin users
    // Using NODE_ENV directly as isDevMode import path might be uncertain
    router.use((req, res, next) => {
        // req.user should be populated by the main auth middleware applied in app.js
        const isAdmin = req.user?.isAdmin === true;
        const isDevelopment = process.env.NODE_ENV === 'development';

        if (isDevelopment || isAdmin) {
            return next();
        }

        return res.status(403).json({
            success: false,
            error: 'API Tester endpoints are only available in development mode or for admin users'
        });
    });
    
    // Apply requireAdmin middleware AFTER the dev check if needed for specific routes (optional)
    // router.use(requireAdmin()); // Or apply to specific sub-routes

    // Create the entity-state router instance using its factory and injected services
    const entityStateRouterInstance = entityStateRouterFactory({ 
        userService, 
        challengeService, 
        evaluationService,
        focusAreaService,
        // Pass other resolved services...
    });

    // Register the entity-state endpoint router
    router.use('/', entityStateRouterInstance); // Mounts the routes defined within entityStateRouter

    // Mount other tester routers here if needed...
    // const otherTesterRouter = otherFactory(container);
    // router.use('/other-tester', otherTesterRouter);
    
    logger.info('API Tester Index Router created and sub-routes mounted.');

    // Export the configured router
    return router;
}

// --- Original Code (Commented out / To be removed) ---
/*
const { Router } = require('express');
const entityStateRouter = require('./entity-state');
const { isDevMode } = require('#app/utils/environment');
const { requireAdmin } = require('#app/api/middleware/requireAdmin');

const router = Router();

router.use((req, res, next) => {
  if (isDevMode() || req.user?.isAdmin) {
    return next();
  }
  
  return res.status(403).json({ ... });
});

router.use('/', entityStateRouter);

module.exports = router; 
*/ 