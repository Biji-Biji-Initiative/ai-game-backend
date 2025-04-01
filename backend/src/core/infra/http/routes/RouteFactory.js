'use strict';

import express from "express";
// Middleware Imports
import { authenticateUser, requireAdmin } from "#app/core/infra/http/middleware/auth.js";
import { validateBody, validateParams } from "#app/core/infra/http/middleware/validation.js";

// Controller Imports (Now only needed if types are used, instantiation happens via container)
// import PersonalityController from "#app/core/personality/controllers/PersonalityController.js";
// import AdaptiveController from "#app/core/adaptive/controllers/AdaptiveController.js";
// import AuthController from "#app/core/auth/controllers/AuthController.js";
// import ProgressController from "#app/core/progress/controllers/ProgressController.js";
// import EvaluationController from "#app/core/evaluation/controllers/EvaluationController.js";
// import UserController from "#app/core/user/controllers/UserController.js";
// import ChallengeController from "#app/core/challenge/controllers/ChallengeController.js";
// import UserJourneyController from "#app/core/userJourney/controllers/UserJourneyController.js";
// import FocusAreaController from "#app/core/focusArea/controllers/FocusAreaController.js";
// import HealthCheckController from "#app/core/infra/health/HealthCheckController.js";

// Schema Imports (Only needed if used directly in route definitions)
import personalityApiSchemas from "#app/core/personality/schemas/personalityApiSchemas.js";
// Remove route definition imports
// import createUserRoutes from "#app/core/infra/http/routes/userRoutes.js"; 
// import createAuthRoutes from "#app/core/infra/http/routes/authRoutes.js";

class RouteFactory {
    /**
     * Create a new RouteFactory
     * @param {Object} container - DI container for dependency injection
     */
    constructor(container) {
        this.container = container;
        this.controllers = {}; // Store controller instances
        this.routers = {};     // Store router instances
        console.log('[RouteFactory] Initializing...');
        this._instantiateControllers();
        this._createRouters();
        console.log('[RouteFactory] Initialization complete.');
    }

    /**
     * Instantiates all required controllers from the DI container.
     * Handles errors gracefully by logging and skipping.
     * @private
     */
    _instantiateControllers() {
        console.log('[RouteFactory] Instantiating controllers...');
        const controllerMap = {
            healthCheck: 'healthCheckController',
            user: 'userController',
            auth: 'authController',
            personality: 'personalityController',
            progress: 'progressController',
            challenge: 'challengeController',
            evaluation: 'evaluationController',
            adaptive: 'adaptiveController',
            userJourney: 'userJourneyController',
            focusArea: 'focusAreaController',
            eventBus: 'eventBusController' // Using the registered name
        };

        for (const [key, name] of Object.entries(controllerMap)) {
            try {
                this.controllers[key] = this.container.get(name);
                console.log(`[RouteFactory]  - Instantiated ${name} as this.controllers.${key} (Type: ${typeof this.controllers[key]})`);
            } catch (error) {
                console.error(`[RouteFactory]  - FAILED to instantiate ${name}: ${error.message}`);
                this.controllers[key] = null;
            }
        }
        console.log('[RouteFactory] After loop, this.controllers.healthCheck is:', typeof this.controllers.healthCheck);
        if(this.controllers.healthCheck) {
             console.log('[RouteFactory] After loop, healthCheck methods:', Object.keys(Object.getPrototypeOf(this.controllers.healthCheck || {})));
        }
        console.log('[RouteFactory] Finished instantiating controllers.');
    }

    /**
     * Creates Express routers for each functional area using instantiated controllers.
     * Registers fallback routers if a controller failed to instantiate.
     * @private
     */
    _createRouters() {
        console.log('[RouteFactory] Creating routers...');

        // Health Check Router - SKIP (Mounted directly in app.js)
        // this._createRouter('/health', 'healthCheck', (router, controller) => {
        //    ...
        // });
        console.log('[RouteFactory] Skipping /health router creation (mounted directly).')

        // Personality Router
        this._createRouter('/personality', 'personality', (router, controller) => {
            if (typeof controller?.getPersonalityProfile !== 'function' || typeof controller?.submitAssessment !== 'function') {
                throw new Error('Missing required PersonalityController methods');
            }
            router.get('/profile', authenticateUser, controller.getPersonalityProfile.bind(controller));
            router.get('/recommendations', authenticateUser, controller.getPersonalityProfile.bind(controller)); // Alias?
            router.post('/assessment/submit', authenticateUser, validateBody(personalityApiSchemas.submitAssessmentSchema), controller.submitAssessment.bind(controller));
        });

        // Adaptive Router
        this._createRouter('/adaptive', 'adaptive', (router, controller) => {
            if (typeof controller?.getRecommendations !== 'function') throw new Error ('Missing getRecommendations method');
            router.get('/profile', authenticateUser, controller.getRecommendations.bind(controller));
        });
        
        // Progress Router
        this._createRouter('/progress', 'progress', (router, controller) => {
            const methods = ['getAllUserProgress', 'recordProgress', 'getUserSkills', 'getProgressStats'];
            methods.forEach(m => { if (typeof controller?.[m] !== 'function') throw new Error(`Missing method: ${m}`); });
            router.get('/history', authenticateUser, controller.getAllUserProgress.bind(controller));
            router.post('/record', authenticateUser, controller.recordProgress.bind(controller));
            router.get('/skills', authenticateUser, controller.getUserSkills.bind(controller));
            router.get('/stats', authenticateUser, controller.getProgressStats.bind(controller));
        });
        
        // Evaluation Router
        this._createRouter('/evaluations', 'evaluation', (router, controller) => {
            const methods = ['createEvaluation', 'streamEvaluation', 'getEvaluationsForChallenge', 'getEvaluationsForUser', 'getEvaluationById'];
            methods.forEach(m => { if (typeof controller?.[m] !== 'function') throw new Error(`Missing method: ${m}`); });
            router.post('/', authenticateUser, controller.createEvaluation.bind(controller));
            router.post('/stream', authenticateUser, controller.streamEvaluation.bind(controller));
            router.get('/challenge/:challengeId', authenticateUser, controller.getEvaluationsForChallenge.bind(controller));
            router.get('/user/me', authenticateUser, controller.getEvaluationsForUser.bind(controller));
            router.get('/:id', authenticateUser, controller.getEvaluationById.bind(controller));
        });

        // Challenge Router
        this._createRouter('/challenges', 'challenge', (router, controller) => {
            const methods = ['generateChallenge', 'getChallengeById', 'getChallengeHistory', 'submitChallengeResponse', 'listChallenges'];
            methods.forEach(m => { if (typeof controller?.[m] !== 'function') throw new Error(`Missing method: ${m}`); });
            router.post('/generate', authenticateUser, controller.generateChallenge.bind(controller));
            router.get('/:challengeId', authenticateUser, controller.getChallengeById.bind(controller));
            router.get('/user/:userEmail/history', authenticateUser, controller.getChallengeHistory.bind(controller));
            router.post('/:challengeId/submit', authenticateUser, controller.submitChallengeResponse.bind(controller));
            router.get('/', authenticateUser, controller.listChallenges.bind(controller));
        });

        // User Journey Router
        this._createRouter('/user-journey', 'userJourney', (router, controller) => {
            if (typeof controller?.getUserJourneyEvents !== 'function') throw new Error('Missing getUserJourneyEvents method');
            router.get('/current', authenticateUser, controller.getUserJourneyEvents.bind(controller));
        });

        // Focus Area Router
        this._createRouter('/focus-areas', 'focusArea', (router, controller) => {
            if (typeof controller?.getAllFocusAreas !== 'function') throw new Error('Missing getAllFocusAreas method');
            router.get('/', authenticateUser, controller.getAllFocusAreas.bind(controller));
        });

        // Event Bus Router
        this._createRouter('/events', 'eventBus', (router, controller) => {
             if (typeof controller?.handleEvent !== 'function') throw new Error('Missing handleEvent method');
             router.post('/publish', authenticateUser, requireAdmin, controller.handleEvent.bind(controller));
        });

        // Test Error Router (Development Only)
        if (process.env.NODE_ENV !== 'production') {
            const router = express.Router();
             router.get('/', (req, res) => {
                res.status(500).json({ success: false, error: 'Test Error', message: 'Deliberate test error', isolationWorking: true });
             });
             this.routers['/test-error'] = router;
             console.log('[RouteFactory]  - Created /test-error router (dev only)');
        }

        // User Routes (Define directly using this.controllers.user)
        this._createRouter('/users', 'user', (router, controller) => {
            // Check actual methods from UserController.js
            if (!controller.getUserProfile) throw new Error('UserController missing getUserProfile');
            // updateUserProfile exists, but let's map to the correct one used for current user
            if (!controller.updateCurrentUser) throw new Error('UserController missing updateCurrentUser'); 
            if (!controller.listUsers) throw new Error('UserController missing listUsers');
            if (!controller.getUserById) throw new Error('UserController missing getUserById');
            
            const placeholderSchema = { parse: (data) => data }; 

            // Use actual method names
            router.get('/profile', authenticateUser, controller.getUserProfile.bind(controller)); // Maps to getUserProfile
            router.put('/profile', authenticateUser, validateBody(placeholderSchema), controller.updateCurrentUser.bind(controller)); // Use updateCurrentUser for PUT /profile
            router.get('/', authenticateUser, requireAdmin, controller.listUsers.bind(controller)); 
            router.get('/:userId', authenticateUser, requireAdmin, validateParams(placeholderSchema), controller.getUserById.bind(controller)); 
            // Add other user routes (e.g., preferences)
            if (controller.getUserPreferences) router.get('/preferences', authenticateUser, controller.getUserPreferences.bind(controller));
            if (controller.updateUserPreferences) router.put('/preferences', authenticateUser, validateBody(placeholderSchema), controller.updateUserPreferences.bind(controller));
            // ... etc for other preference routes ...
        });

        // Auth Routes (Define directly using this.controllers.auth)
        this._createRouter('/auth', 'auth', (router, controller) => {
            const placeholderSchema = { parse: (data) => data }; 

            // Check actual method names from AuthController.js
            if (!controller.login) throw new Error('AuthController missing login');
            if (!controller.signup) throw new Error('AuthController missing signup');
            if (!controller.refreshToken) throw new Error('AuthController missing refreshToken');
            if (!controller.logout) throw new Error('AuthController missing logout');
            if (!controller.requestPasswordReset) throw new Error('AuthController missing requestPasswordReset');
            if (!controller.resetPassword) throw new Error('AuthController missing resetPassword');
            
            // Use actual method names
            router.post('/login', validateBody(placeholderSchema), controller.login.bind(controller));
            router.post('/signup', validateBody(placeholderSchema), controller.signup.bind(controller));
            router.post('/refresh', controller.refreshToken.bind(controller)); // No auth middleware needed usually
            router.post('/logout', authenticateUser, controller.logout.bind(controller));
            router.post('/request-password-reset', validateBody(placeholderSchema), controller.requestPasswordReset.bind(controller));
            router.post('/reset-password', validateBody(placeholderSchema), controller.resetPassword.bind(controller)); // Token might be in query or body
        });

        console.log('[RouteFactory] Finished creating routers.');
    }

    /**
     * Helper to create a router for a specific path/controller.
     * Handles controller validation and fallback creation.
     * @param {string} path - The base path for the router (e.g., '/health')
     * @param {string} controllerKey - The key for the controller in this.controllers (e.g., 'healthCheck')
     * @param {Function} defineRoutesFn - Function that takes (router, controller) and defines routes.
     * @private
     */
    _createRouter(path, controllerKey, defineRoutesFn) {
        console.log(`[RouteFactory] _createRouter called for path: ${path}, controllerKey: ${controllerKey}`);
        console.log(`[RouteFactory] Checking this.controllers[${controllerKey}]:`, typeof this.controllers[controllerKey]);
        
        const controller = this.controllers[controllerKey];
        if (controller) {
            try {
                const router = express.Router();
                defineRoutesFn(router, controller);
                this.routers[path] = router;
                console.log(`[RouteFactory]  - Created ${path} router.`);
        } catch (error) {
                console.error(`[RouteFactory]  - FAILED to define routes for ${path}: ${error.message}`);
                this._createFallbackRouter(path, controllerKey, error);
            }
        } else {
             console.warn(`[RouteFactory] Controller for key '${controllerKey}' is null or undefined.`);
             this._createFallbackRouter(path, controllerKey, new Error('Controller not instantiated during RouteFactory setup'));
        }
    }

    /**
     * Helper to create and store a fallback router.
     * @param {string} path - The base path for the router.
     * @param {string} routeName - The friendly name of the route/service.
     * @param {Error} error - The error that occurred.
     * @private
     */
    _createFallbackRouter(path, routeName, error) {
        const fallbackRouter = express.Router();
        const errorMessage = `The ${routeName} service failed during initialization: ${error?.message || 'Unknown error'}`;
        fallbackRouter.all('*', (req, res) => {
            res.status(501).json({
                error: 'Route unavailable',
                message: errorMessage
            });
        });
        this.routers[path] = fallbackRouter;
        console.warn(`[RouteFactory]  - Created FALLBACK router for ${path} due to error: ${error?.message}`);
    }

    /**
     * Mount all created API routers onto the Express app.
     * @param {Object} app - Express application instance
     * @param {string} apiPrefix - API route prefix (e.g., '/api/v1')
     */
    async mountAll(app, apiPrefix = '/api/v1') {
        console.log(`[RouteFactory] Mounting all routers at prefix: ${apiPrefix}`);
        let mountedCount = 0;
        let fallbackCount = 0;

        for (const [path, router] of Object.entries(this.routers)) {
            // ADD CHECK TO SKIP /health
            if (path === '/health') {
                 console.log(`[RouteFactory] Skipping mount for ${apiPrefix}${path} (mounted directly in app.js).`);
                 continue; // Skip to the next router
            }

            if (router && typeof router === 'function') {
                try {
                     app.use(`${apiPrefix}${path}`, router);
                     // Check if it's a fallback by looking for a specific property or inspecting routes
                     // Simple check: Fallbacks only have one generic '.all' route
                     const isFallback = router.stack && router.stack.length === 1 && router.stack[0].route?.path === '*';
                     if (isFallback) {
                         fallbackCount++;
                         console.log(`[RouteFactory]  - Mounted FALLBACK for ${apiPrefix}${path}`);
                     } else {
                         mountedCount++;
                         console.log(`[RouteFactory]  - Mounted ${apiPrefix}${path}`);
                     }
                } catch(mountError) {
                     console.error(`[RouteFactory] CRITICAL: Error during app.use for ${apiPrefix}${path}: ${mountError.message}`, mountError);
                     // Mount a super-fallback if app.use fails
                     app.use(`${apiPrefix}${path}`, (req, res) => res.status(500).send(`Internal Server Error: Route Mount Failure for ${path}`));
                }
            } else {
                console.error(`[RouteFactory] CRITICAL: Invalid router object found for path ${path}. Skipping mount.`);
            }
        }
        
        console.log(`[RouteFactory] Mounting complete. Successfully mounted: ${mountedCount}, Fallbacks mounted: ${fallbackCount}`);
        // Provide a summary similar to before, potentially using routeRegistrationErrors if needed
        // (Though errors should ideally be caught during _createRouters now)
    }
}

export default RouteFactory;
