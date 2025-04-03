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
import setupAdminRoutes from "#app/core/infra/http/routes/adminRoutes.js";
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
 * @param {Object} container - The Awilix container
 * @param {Object} appConfig - Application configuration
 * @param {Logger} logger - The logger instance passed from container setup
 */
async function registerRouteComponents(container, _appConfig, logger) {
    // Check if logger is defined, if not create a console-based fallback
    let routesLogger;
    if (!logger) {
        console.warn('Warning: Logger not provided to registerRouteComponents, using console fallback');
        routesLogger = {
            info: console.info,
            warn: console.warn,
            error: console.error,
            debug: console.debug,
            child: () => routesLogger // Self-reference for child loggers
        };
    } else {
        // Use the passed-in logger
        routesLogger = logger.child({ component: 'RoutesContainer' });
    }
    
    routesLogger.info('Registering route components...');

    // Register individual route modules first (they are factories)
    routesLogger.info('Registering individual route modules...');
    container.register('userRoutes', c => userRoutes(c.get('userController'), c.get('authController')), true); // Pass needed controllers
    container.register('personalityRoutes', c => personalityRoutes(c.get('personalityController')), true);
    container.register('progressRoutes', c => progressRoutes(c.get('progressController')), true);
    container.register('adaptiveRoutes', c => adaptiveRoutes(c.get('adaptiveController')), true);
    container.register('challengeRoutes', c => challengeRoutes(c.get('challengeController')), true);
    container.register('evaluationRoutes', c => evaluationRoutes(c.get('evaluationController')), true);
    container.register('focusAreaRoutes', c => focusAreaRoutes(c.get('focusAreaController')), true);
    container.register('userJourneyRoutes', c => userJourneyRoutes(c.get('userJourneyController')), true);
    container.register('systemRoutes', c => {
        // The systemRoutes function needs the container itself to access various services
        // So we create a container wrapper that has both the systemController and other dependencies
        const containerWrapper = {
            get: (name) => {
                if (name === 'systemController') 
                    return c.get('systemController');
                return c.get(name);
            }
        };
        return systemRoutes(containerWrapper);
    }, true); // Singleton
    container.register('healthRoutes', c => healthRoutes({
        container: c, // Pass container if needed by routes
        healthCheckController: c.get('healthCheckController') 
    }), true);
    container.register('eventBusRoutes', c => {
        // Check if deadLetterQueueService exists in container
        let dlqService;
        try {
            dlqService = c.get('deadLetterQueueService');
        } catch (error) {
            routesLogger.warn('deadLetterQueueService not found in container, eventBusRoutes will have limited functionality');
        }
        
        // Get eventBus instance from container
        let eventBusInstance;
        try {
            eventBusInstance = c.get('eventBus');
        } catch (error) {
            routesLogger.warn('eventBus not found in container, eventBusRoutes will have limited functionality');
        }
        
        return eventBusRoutes({ 
            deadLetterQueueService: dlqService,
            eventBus: eventBusInstance
        });
    }, true);
    // Add auth routes with proper dependencies
    container.register('authRoutes', c => {
        const validation = { validateBody: c.get('validation').validateBody };
        return createAuthRoutes({ 
            authController: c.get('authController'),
            validation
        });
    }, true);

    // Add admin routes
    container.register('adminRoutes', c => {
        return setupAdminRoutes({
            adminController: c.get('adminController'),
            authMiddleware: c.get('authMiddleware')
        });
    }, true);
    
    routesLogger.info('Individual route modules registered.');

    // Register consolidated apiRoutes (depends on all individual route modules)
    routesLogger.info('Registering consolidated apiRoutes...');
    container.register('apiRoutes', c => {
        const router = express.Router();
        // Mount all registered route modules
        router.use('/users', c.get('userRoutes'));
        router.use('/personality', c.get('personalityRoutes'));
        router.use('/progress', c.get('progressRoutes'));
        router.use('/adaptive', c.get('adaptiveRoutes'));
        router.use('/challenges', c.get('challengeRoutes'));
        router.use('/evaluations', c.get('evaluationRoutes'));
        router.use('/focus-areas', c.get('focusAreaRoutes'));
        router.use('/journey', c.get('userJourneyRoutes'));
        router.use('/system', c.get('systemRoutes'));
        router.use('/health', c.get('healthRoutes'));
        router.use('/events', c.get('eventBusRoutes'));
        router.use('/auth', c.get('authRoutes'));
        router.use('/admin', c.get('adminRoutes'));
        return router;
    }, true);
    routesLogger.info('Consolidated apiRoutes registered.');

    routesLogger.info('Route registration complete.');
}

export { registerRouteComponents };
export default {
    registerRouteComponents
};
