import userRoutes from "#app/core/infra/http/routes/userRoutes.js";
import personalityRoutes from "#app/core/infra/http/routes/personalityRoutes.js";
import progressRoutes from "#app/core/infra/http/routes/progressRoutes.js";
import adaptiveRoutes from "#app/core/infra/http/routes/adaptiveRoutes.js";
import focusAreaRoutes from "#app/core/infra/http/routes/focusAreaRoutes.js";
import challengeRoutes from "#app/core/infra/http/routes/challengeRoutes.js";
import evaluationRoutes from "#app/core/infra/http/routes/evaluationRoutes.js";
import userJourneyRoutes from "#app/core/infra/http/routes/userJourneyRoutes.js";
import systemRoutes from "#app/core/infra/http/routes/systemRoutes.js";
// AI routes - temporarily disabled
// import aiChatRoutes from "../../routes/ai/aiChatRoutes.js";
// import aiAnalysisRoutes from "../../routes/ai/aiAnalysisRoutes.js";
import * as express from "express";
'use strict';
/**
 * Routes Registration
 *
 * This module registers all API routes in the DI container.
 */
/**
 * Register route components in the container
 * @param {DIContainer} container - The DI container
 */
function registerRouteComponents(container) {
    const routeLogger = container.get('logger').child({ context: 'DI-Routes' });
    routeLogger.info('[DI Routes] Starting route registration...');

    routeLogger.info('[DI Routes] Registering individual route modules...');
    container.register('userRoutes', c => userRoutes(c.get('userController')), true);
    container.register('personalityRoutes', c => personalityRoutes(c.get('personalityController')), true);
    container.register('progressRoutes', c => progressRoutes(c.get('progressController')), true);
    container.register('adaptiveRoutes', c => adaptiveRoutes(c.get('adaptiveController')), true);
    container.register('focusAreaRoutes', c => focusAreaRoutes(c.get('focusAreaController')), true);
    container.register('challengeRoutes', c => challengeRoutes(c.get('challengeController')), true);
    container.register('evaluationRoutes', c => evaluationRoutes(c.get('evaluationController')), true);
    container.register('userJourneyRoutes', c => userJourneyRoutes(c.get('userJourneyController')), true);
    container.register('systemRoutes', () => systemRoutes(), true);
    routeLogger.info('[DI Routes] Individual route modules registered.');

    // Register root router that consolidates all route modules
    routeLogger.info('[DI Routes] Registering consolidated apiRoutes...');
    container.register('apiRoutes', c => {
        routeLogger.info('[DI Routes] Factory for apiRoutes executing...');
        const router = express.Router();
        // Mount domain-specific routes
        router.use('/users', c.get('userRoutes'));
        router.use('/personalities', c.get('personalityRoutes'));
        router.use('/progress', c.get('progressRoutes'));
        router.use('/adaptive', c.get('adaptiveRoutes'));
        router.use('/focus-areas', c.get('focusAreaRoutes'));
        router.use('/challenges', c.get('challengeRoutes'));
        router.use('/evaluations', c.get('evaluationRoutes'));
        router.use('/user-journey', c.get('userJourneyRoutes'));
        router.use('/system', c.get('systemRoutes'));
        // Mount AI-related routes (if enabled)
        // ...
        routeLogger.info('[DI Routes] Consolidated apiRoutes router created.');
        return router;
    }, true);
    routeLogger.info('[DI Routes] Consolidated apiRoutes registered.');
    
    routeLogger.info('[DI Routes] Route registration complete.');
}

export { registerRouteComponents };
export default {
    registerRouteComponents
};
