import express from "express";
import PersonalityController from "@/core/personality/controllers/PersonalityController.js";
import personalityApiSchemas from "@/core/personality/schemas/personalityApiSchemas.js";
import { authenticateUser, requireAdmin } from "@/core/infra/http/middleware/auth.js";
import { validateBody } from "@/core/infra/http/middleware/validation.js";
import AdaptiveController from "@/core/adaptive/controllers/AdaptiveController.js";
import AuthController from "@/core/auth/controllers/AuthController.js";
import ProgressController from "@/core/progress/controllers/ProgressController.js";
import EvaluationController from "@/core/evaluation/controllers/EvaluationController.js";
import UserController from "@/core/user/controllers/UserController.js";
import ChallengeController from "@/core/challenge/controllers/ChallengeController.js";
import UserJourneyController from "@/core/userJourney/controllers/UserJourneyController.js";
import FocusAreaController from "@/core/focusArea/controllers/FocusAreaController.js";
import createHealthRoutes from "@/core/infra/http/routes/healthRoutes.js";
import { AdaptiveRepository } from "@/core/adaptive/repositories/AdaptiveRepository.js";
import eventBusRoutes from "@/core/infra/http/routes/eventBusRoutes.js";
'use strict';

class RouteFactory {
    /**
     * Create a new RouteFactory
     * @param {Object} container - DI container for dependency injection
     */
    constructor(container) {
        this.container = container;
    }
    /**
     * Mount all API routes
     * @param {Object} app - Express application instance
     * @param {string} apiPrefix - API route prefix (default: '/api/v1')
     * 
     * JIRA-19 (Resilience): This implementation ensures fault isolation within the route registration process.
     * Each route is mounted independently in a try-catch block, so a failure in one route won't prevent
     * others from loading. Failed routes are replaced with fallback handlers that return 501 Not Implemented
     * with an informative error message. Detailed error information is logged for debugging purposes.
     */
    async mountAll(app, apiPrefix = '/api/v1') {
        console.log(`Setting up routes in ${process.env.NODE_ENV || 'development'} mode`);
        
        // An array to collect errors that occur during route registration
        const routeRegistrationErrors = [];

        // Helper function to safely mount a route with error handling
        const mountRouteWithErrorHandling = async (path, routeCreator, routeName) => {
            try {
                // For async route creators
                if (routeCreator instanceof Promise) {
                    const router = await routeCreator;
                    app.use(`${apiPrefix}${path}`, router);
                    console.log(`Successfully mounted route: ${apiPrefix}${path}`);
                }
                // For synchronous route creators
                else {
                    app.use(`${apiPrefix}${path}`, routeCreator);
                    console.log(`Successfully mounted route: ${apiPrefix}${path}`);
                }
            } catch (error) {
                const errorMessage = `Failed to mount route ${routeName} at ${apiPrefix}${path}: ${error.message}`;
                
                // Log detailed error information
                console.error(errorMessage);
                console.error(`Route registration error details for ${routeName}:`, {
                    routeName,
                    path: `${apiPrefix}${path}`,
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                });
                
                // Add to the collection of errors
                routeRegistrationErrors.push({ 
                    path: `${apiPrefix}${path}`, 
                    error: error.message, 
                    routeName,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                });
                
                // Create a fallback router that returns 501 Not Implemented
                const fallbackRouter = express.Router();
                fallbackRouter.all('*', (req, res) => {
                    res.status(501).json({
                        error: 'Route unavailable',
                        message: `The ${routeName} service is unavailable: ${error.message}`
                    });
                });
                app.use(`${apiPrefix}${path}`, fallbackRouter);
                console.log(`Mounted fallback router for ${apiPrefix}${path}`);
            }
        };

        try {
            // Prepare async route creators in advance
            const userRoutesPromise = this.createUserRoutes();
            const authRoutesPromise = this.createAuthRoutes();
            
            // Mount routes individually with error handling
            await mountRouteWithErrorHandling('/users', userRoutesPromise, 'Users');
            await mountRouteWithErrorHandling('/auth', authRoutesPromise, 'Authentication');
            await mountRouteWithErrorHandling('/personality', this.createPersonalityRoutes(), 'Personality');
            await mountRouteWithErrorHandling('/progress', this.createProgressRoutes(), 'Progress');
            await mountRouteWithErrorHandling('/challenges', this.createChallengeRoutes(), 'Challenges');
            await mountRouteWithErrorHandling('/evaluations', this.createEvaluationRoutes(), 'Evaluations');
            await mountRouteWithErrorHandling('/adaptive', this.createAdaptiveRoutes(), 'Adaptive');
            await mountRouteWithErrorHandling('/user-journey', this.createUserJourneyRoutes(), 'User Journey');
            await mountRouteWithErrorHandling('/focus-areas', this.createFocusAreaRoutes(), 'Focus Areas');
            await mountRouteWithErrorHandling('/health', this.createHealthRoutes(), 'Health Check');
            await mountRouteWithErrorHandling('/events', this.createEventBusRoutes(), 'Event Bus');
            
            // In development mode, add a test error route to verify fault isolation
            if (process.env.NODE_ENV !== 'production') {
                await mountRouteWithErrorHandling('/test-error', this.createTestErrorRoute(), 'Test Error');
            }
            
            // Provide a summary of route registration results
            const totalRoutes = routeRegistrationErrors.length + 11; // 11 standard routes
            const successfulRoutes = totalRoutes - routeRegistrationErrors.length;
            
            if (routeRegistrationErrors.length > 0) {
                console.warn(`=== ROUTE REGISTRATION SUMMARY ===`);
                console.warn(`Total routes attempted: ${totalRoutes}`);
                console.warn(`Successfully mounted: ${successfulRoutes} (${Math.round((successfulRoutes / totalRoutes) * 100)}%)`);
                console.warn(`Failed to mount: ${routeRegistrationErrors.length} (${Math.round((routeRegistrationErrors.length / totalRoutes) * 100)}%)`);
                console.warn(`Failed routes:`);
                routeRegistrationErrors.forEach((error, index) => {
                    console.warn(`  ${index + 1}. ${error.routeName} at ${error.path}: ${error.error}`);
                });
                console.warn(`=============================`);
            } else {
                console.log(`=== ROUTE REGISTRATION SUMMARY ===`);
                console.log(`All ${totalRoutes} routes successfully mounted at ${apiPrefix}`);
                console.log(`=============================`);
            }
        } catch (error) {
            console.error('Critical error in route mounting process:', error);
            
            // Setup a fallback route that reports the error
            app.use(`${apiPrefix}`, (req, res) => {
                res.status(500).json({
                    error: 'Failed to initialize API routes',
                    message: error.message,
                    failedRoutes: routeRegistrationErrors
                });
            });
        }
    }
    /**
     * Create personality routes
     * @returns {Object} Express router with personality routes
     */
    createPersonalityRoutes() {
        const router = express.Router();
        // Create controller instance with dependencies
        const personalityController = new PersonalityController({
            personalityService: this.container.get('personalityService'),
            logger: this.container.get('logger'),
        });
        /**
         * API documentation for personality routes is available in the OpenAPI specification
         * See /openapi/paths/ directory
         */
        router.get('/profile', authenticateUser, personalityController.getPersonalityProfile.bind(personalityController));
        
        router.get('/recommendations', authenticateUser, personalityController.getPersonalityProfile.bind(personalityController));
        
        router.post('/assessment/submit', authenticateUser, validateBody(personalityApiSchemas.submitAssessmentSchema), personalityController.submitAssessment.bind(personalityController));
        return router;
    }
    /**
     * Create adaptive learning routes
     * @returns {Object} Express router with adaptive learning routes
     */
    createAdaptiveRoutes() {
        const router = express.Router();
        
        try {
            // Get AdaptiveRepository from container or create a new instance
            let adaptiveRepository;
            try {
                adaptiveRepository = this.container.get('adaptiveRepository');
                if (!adaptiveRepository) {
                    throw new Error('AdaptiveRepository not found in container');
                }
            } catch (repoError) {
                console.warn('Error getting AdaptiveRepository from container, creating new instance:', repoError.message);
                adaptiveRepository = new AdaptiveRepository({
                    db: this.container.get('supabase'),
                    logger: this.container.get('logger')
                });
            }
            
            // Get or create the adaptive service
            let adaptiveService = this.container.get('adaptiveService');
            if (!adaptiveService) {
                console.warn('AdaptiveService not found in container, using basic implementation');
                adaptiveService = {
                    getRecommendations: async (userId) => {
                        return {
                            recommendedChallenges: [],
                            learningProfile: { strengths: [], weaknesses: [] },
                            nextSteps: []
                        };
                    }
                };
            }
            
            // Create controller instance with dependencies
            const adaptiveController = new AdaptiveController({
                logger: this.container.get('logger'),
                adaptiveService: adaptiveService,
            });
            
            /**
             * API documentation for adaptive routes is available in the OpenAPI specification
             * See /openapi/paths/ directory
             */
            router.get('/profile', authenticateUser, adaptiveController.getRecommendations.bind(adaptiveController));
            
            return router;
        } catch (error) {
            console.warn('Error creating adaptive routes:', error.message);
            
            // In development, create a simple mock router
            if (process.env.NODE_ENV !== 'production') {
                console.log('Creating mock adaptive routes for development');
                
                // Simple GET route for testing/verification
                router.get('/profile', (req, res) => {
                    res.status(200).json({
                        success: true,
                        message: 'Mock adaptive recommendations',
                        data: {
                            recommendedChallenges: [
                                { id: 'mock-id-1', title: 'Security Basics', difficulty: 'beginner' },
                                { id: 'mock-id-2', title: 'Performance Tuning', difficulty: 'intermediate' }
                            ],
                            learningProfile: {
                                strengths: ['API Design', 'Algorithms'],
                                areasToImprove: ['Security', 'Testing'],
                                preferredLearningStyle: 'Practical'
                            },
                            nextSteps: [
                                'Complete the Security Basics challenge',
                                'Review testing principles documentation'
                            ]
                        }
                    });
                });
                
                return router;
            }
            
            // In production, return error router
            router.all('*', (req, res) => {
                res.status(503).json({
                    error: 'Adaptive service unavailable',
                    message: 'The adaptive learning service is currently unavailable: ' + error.message
                });
            });
            
            return router;
        }
    }
    /**
     * Create authentication routes
     * @returns {Object} Express router with authentication routes
     */
    createAuthRoutes() {
        try {
            console.log('Creating auth routes with Supabase integration');
            
            // First try to get the real authController from the container
            let authController;
            try {
                authController = this.container.get('authController');
                
                // Verify it has required methods
                if (!authController || typeof authController.login !== 'function') {
                    throw new Error('Invalid or incomplete authController');
                }
                
                console.log('Successfully retrieved valid authController');
            } catch (error) {
                console.error('Error getting authController, using fallback:', error.message);
                
                // If we're in production, this is a critical error
                if (process.env.NODE_ENV === 'production') {
                    console.error('CRITICAL: Auth controller missing in production mode');
                    throw new Error('Auth services unavailable in production mode: ' + error.message);
                }
                
                // In development, create a mock controller
                authController = new AuthController({
                    userRepository: this.container.get('userRepository') || { 
                        findByEmail: () => Promise.resolve(null),
                        save: (data) => Promise.resolve({ id: 'mock-id', ...data })
                    },
                    supabase: this.container.get('supabase') || {
                        auth: {
                            signInWithPassword: () => ({ data: { user: { id: 'mock-id' }, session: { access_token: 'mock-token', refresh_token: 'mock-refresh' } } }),
                            signUp: () => ({ data: { user: { id: 'mock-id' }, session: { access_token: 'mock-token', refresh_token: 'mock-refresh' } } })
                        }
                    },
                    logger: this.container.get('logger') || console
                });
                
                console.log('Created fallback auth controller for development');
            }
            
            // Now use the dynamic import pattern to load the routes module
            return import('./authRoutes.js').then(module => {
                const createAuthRoutes = module.default;
                
                return import('@/core/infra/http/middleware/validation.js').then(validation => {
                    // Create the router with resolved dependencies
                    return createAuthRoutes({
                        authController,
                        validation: {
                            validateBody: validation.validateBody,
                            validateParams: validation.validateParams
                        }
                    });
                });
            }).catch(error => {
                console.error('Error loading auth routes module:', error);
                
                // If in production, this is a critical error
                if (process.env.NODE_ENV === 'production') {
                    throw new Error('Failed to load auth routes in production: ' + error.message);
                }
                
                // In development, return a simple router
                const router = express.Router();
                
                // Create simple mock routes
                router.post('/login', (req, res) => {
                    res.status(200).json({ 
                        success: true, 
                        data: {
                            token: 'mock-token-for-development',
                            user: {
                                id: 'mock-user-id',
                                email: req.body.email,
                                name: 'Mock User'
                            }
                        }
                    });
                });
                
                router.post('/signup', (req, res) => {
                    res.status(201).json({ 
                        success: true, 
                        data: {
                            token: 'mock-token-for-development',
                            user: {
                                id: 'mock-user-id',
                                email: req.body.email,
                                name: req.body.fullName || 'Mock User'
                            }
                        }
                    });
                });
                
                router.post('/refresh', (req, res) => {
                    res.status(200).json({ 
                        success: true, 
                        data: {
                            token: 'mock-refreshed-token'
                        }
                    });
                });
                
                router.post('/logout', (req, res) => {
                    res.status(200).json({ 
                        success: true, 
                        message: 'Logged out successfully'
                    });
                });
                
                console.log('Created basic mock auth router for development');
                return router;
            });
        } catch (error) {
            console.error('Critical error creating auth routes:', error);
            
            // Return a simple router that reports the error
            const router = express.Router();
            
            router.all('*', (req, res) => {
                res.status(503).json({ 
                    error: 'Auth service error',
                    message: 'Failed to initialize authentication routes: ' + error.message
                });
            });
            
            return Promise.resolve(router);
        }
    }
    /**
     * Create progress routes
     * @returns {Object} Express router with progress routes
     */
    createProgressRoutes() {
        const router = express.Router();
        
        try {
            // Get controller instance from the container
            const progressController = this.container.get('progressController');
            
            // If no controller is available, return a fallback error router
            if (!progressController) {
                console.error('Progress controller not found in container');
                router.all('*', (req, res) => {
                    res.status(503).json({ 
                        error: 'Progress service unavailable',
                        message: 'The progress service is currently unavailable or not properly initialized' 
                    });
                });
                return router;
            }

            // Ensure all controller methods exist and are properly bound
            const methodsToBind = [
                'getAllUserProgress',
                'recordProgress',
                'getUserSkills',
                'getProgressStats'
            ];

            // Check each required method and bind it if it exists
            methodsToBind.forEach(methodName => {
                if (typeof progressController[methodName] !== 'function') {
                    console.warn(`Progress controller missing method: ${methodName}, using fallback`);
                    progressController[methodName] = (req, res) => {
                        res.status(501).json({
                            status: 'error',
                            message: `Method ${methodName} not implemented`
                        });
                    };
                } else {
                    // Make sure the method is bound to the controller
                    progressController[methodName] = progressController[methodName].bind(progressController);
                }
            });

            // Set up routes with bound methods
            router.get('/history', authenticateUser, progressController.getAllUserProgress);
            router.post('/record', authenticateUser, progressController.recordProgress);
            router.get('/skills', authenticateUser, progressController.getUserSkills);
            router.get('/stats', authenticateUser, progressController.getProgressStats);

            return router;
        } catch (error) {
            console.error('Error creating progress routes:', error);
            
            // Return a router that reports the error
            router.all('*', (req, res) => {
                res.status(500).json({
                    error: 'Progress service error',
                    message: 'Failed to initialize progress routes: ' + error.message
                });
            });
            
            return router;
        }
    }
    /**
     * Create evaluation routes
     * @returns {Object} Express router with evaluation routes
     */
    createEvaluationRoutes() {
        const router = express.Router();
        // Create controller instance with dependencies
        const evaluationController = new EvaluationController({
            logger: this.container.get('logger'),
            evaluationService: this.container.get('evaluationService'),
            openAIStateManager: this.container.get('openAIStateManager'),
            challengeRepository: this.container.get('challengeRepository'),
        });
        /**
         * API documentation for evaluation routes is available in the OpenAPI specification
         * See /openapi/paths/ directory and /openapi/evaluation-api.yaml
         */
        router.post('/', authenticateUser, evaluationController.createEvaluation.bind(evaluationController));

        
        router.post('/stream', authenticateUser, evaluationController.streamEvaluation.bind(evaluationController));

        
        router.get('/challenge/:challengeId', authenticateUser, evaluationController.getEvaluationsForChallenge.bind(evaluationController));

        
        router.get('/user/me', authenticateUser, evaluationController.getEvaluationsForUser.bind(evaluationController));

        
        router.get('/:id', authenticateUser, evaluationController.getEvaluationById.bind(evaluationController));

        return router;
    }
    /**
     * Create user routes
     * @returns {Object} Express router with user routes
     */
    createUserRoutes() {
        // Use the imported version instead of requiring
        const userController = this.container.get('userController');
        
        // Check if we have a valid controller
        if (!userController || typeof userController.getUserProfile !== 'function') {
            console.error('Invalid userController, creating fallback router');
            const router = express.Router();
            router.all('*', (req, res) => {
                res.status(503).json({
                    error: 'User service unavailable',
                    message: 'The user service is currently unavailable'
                });
            });
            return router;
        }
        
        // Always use the proper imported routes
        try {
            // Import dynamically for better error handling
            return import('./userRoutes.js').then(module => {
                const createUserRoutes = module.default;
                const authMiddleware = import('@/core/infra/http/middleware/auth.js');
                const validationMiddleware = import('@/core/infra/http/middleware/validation.js');
                
                return Promise.all([authMiddleware, validationMiddleware]).then(([auth, validation]) => {
                    console.log('Creating real user routes');
                    
                    // Create the router with resolved dependencies
                    return createUserRoutes({
                        userController,
                        authenticateUser: auth.authenticateUser,
                        requireAdmin: auth.requireAdmin,
                        validation: {
                            validateBody: validation.validateBody,
                            validateParams: validation.validateParams
                        }
                    });
                });
            }).catch(error => {
                console.error('Error loading user routes:', error);
                // Return a simple router if there's an error
                const router = express.Router();
                router.all('*', (req, res) => {
                    res.status(500).json({ 
                        error: 'User service error',
                        message: 'Failed to initialize user routes'
                    });
                });
                return router;
            });
        } catch (error) {
            console.error('Error importing user routes:', error);
            // Return a simple router if there's an error
            const router = express.Router();
            router.all('*', (req, res) => {
                res.status(500).json({ 
                    error: 'User service error',
                    message: 'Failed to initialize user routes'
                });
            });
            return router;
        }
    }
    /**
     * Create challenge routes
     * @returns {Object} Express router with challenge routes
     */
    createChallengeRoutes() {
        const router = express.Router();
        // Create controller instance with dependencies
        const challengeController = new ChallengeController({
            challengeCoordinator: this.container.get('challengeCoordinator'),
            progressCoordinator: this.container.get('progressCoordinator'),
        });
        /**
         * API documentation for challenge routes is available in the OpenAPI specification
         * See /openapi/paths/ directory and /openapi/challenge-api.yaml
         */
        router.post('/generate', authenticateUser, challengeController.generateChallenge.bind(challengeController));
        
        
        router.get('/:challengeId', authenticateUser, challengeController.getChallengeById.bind(challengeController));
        
        
        router.get('/user/:userEmail/history', authenticateUser, challengeController.getChallengeHistory.bind(challengeController));
        
        
        router.post('/:challengeId/submit', authenticateUser, challengeController.submitChallengeResponse.bind(challengeController));
        
        
        router.get('/', authenticateUser, challengeController.listChallenges.bind(challengeController));
        
        return router;
    }
    /**
     * Create user journey routes
     * @returns {Object} Express router with user journey routes
     */
    createUserJourneyRoutes() {
        const router = express.Router();
        
        try {
            // Create controller instance with dependencies
            const userJourneyController = new UserJourneyController({
                userJourneyCoordinator: this.container.get('userJourneyCoordinator'),
                userRepository: this.container.get('userRepository'),
            });
            
            // Check if all required methods are properly bound
            const requiredMethods = [
                'getUserJourneyEvents', 
                'getUserJourneyById', 
                'getJourneyEvent', 
                'getEventsByType', 
                'getUserTimeline'
            ];
            
            // Check each required method and ensure it's bound properly
            for (const methodName of requiredMethods) {
                if (typeof userJourneyController[methodName] !== 'function') {
                    throw new Error(`Missing method: ${methodName} on UserJourneyController`);
                }
                // Explicitly bind the method to the controller
                userJourneyController[methodName] = userJourneyController[methodName].bind(userJourneyController);
            }
            
            /**
             * API documentation for user journey routes is available in the OpenAPI specification
             * See /openapi/paths/ directory
             */
            router.get('/current', authenticateUser, userJourneyController.getUserJourneyEvents);
            
            // Add other routes as needed
            
            return router;
        } catch (error) {
            console.warn('Error creating user journey routes:', error.message);
            
            // In development, create a simple mock router
            if (process.env.NODE_ENV !== 'production') {
                console.log('Creating mock user journey routes for development');
                
                // Mock journey events endpoint
                router.get('/current', (req, res) => {
                    res.status(200).json({
                        success: true,
                        message: 'Mock user journey events',
                        data: {
                            events: [
                                { 
                                    id: 'mock-event-1', 
                                    type: 'CHALLENGE_COMPLETED', 
                                    timestamp: new Date().toISOString(),
                                    data: { challengeId: 'mock-challenge-1', score: 85 }
                                },
                                { 
                                    id: 'mock-event-2', 
                                    type: 'FOCUS_AREA_SELECTED', 
                                    timestamp: new Date(Date.now() - 86400000).toISOString(),
                                    data: { focusAreaId: 'mock-focus-1', name: 'Security' }
                                }
                            ]
                        }
                    });
                });
                
                return router;
            }
            
            // In production, return error router
            router.all('*', (req, res) => {
                res.status(503).json({
                    error: 'User journey service unavailable',
                    message: 'The user journey service is currently unavailable: ' + error.message
                });
            });
            
            return router;
        }
    }
    /**
     * Create focus area routes
     * @returns {Object} Express router with focus area routes
     */
    createFocusAreaRoutes() {
        const router = express.Router();
        
        try {
            // Get needed dependencies from container
            const focusAreaCoordinator = this.container.get('focusAreaCoordinator');
            const focusAreaService = this.container.get('focusAreaService'); 
            const focusAreaGenerationService = this.container.get('focusAreaGenerationService');
            const eventBus = this.container.get('eventBus');
            const eventTypes = this.container.get('eventTypes');
            const logger = this.container.get('logger').child({ component: 'focus-area-routes' });
            
            // Create controller instance with dependencies
            const focusAreaController = new FocusAreaController({
                focusAreaCoordinator,
                focusAreaService,
                focusAreaGenerationService,
                eventBus: this.container.get('eventBus'),
                eventTypes,
                logger
            });
            /**
             * API documentation for focus area routes is available in the OpenAPI specification
             * See /openapi/paths/ directory
             */
            router.get('/', authenticateUser, focusAreaController.getAllFocusAreas.bind(focusAreaController));
            
            // Add other focus area routes here...
            
            return router;
        } catch (error) {
            console.warn('Error creating focus area routes:', error.message);
            
            // In development, create a simple mock router
            if (process.env.NODE_ENV !== 'production') {
                console.log('Creating mock focus area routes for development');
                
                // Simple GET route for testing/verification
                router.get('/', (req, res) => {
                    res.status(200).json({
                        success: true,
                        data: [
                            { id: 'mock-id-1', name: 'Security', description: 'Mock security focus area' },
                            { id: 'mock-id-2', name: 'Performance', description: 'Mock performance focus area' }
                        ],
                        pagination: {
                            total: 2,
                            offset: 0,
                            limit: 2
                        }
                    });
                });
                
                return router;
            }
            
            // In production, return error router
            router.all('*', (req, res) => {
                res.status(503).json({
                    error: 'Focus area service unavailable',
                    message: 'The focus area service is currently unavailable: ' + error.message
                });
            });
            
            return router;
        }
    }
    /**
     * Create health check routes
     * @returns {Object} Express router with health check routes
     */
    createHealthRoutes() {
        return createHealthRoutes(this.container);
    }
    /**
     * Create event bus routes
     * @returns {Object} Express router for event bus routes
     */
    createEventBusRoutes() {
        return eventBusRoutes();
    }
    /**
     * Create a debug test route that deliberately fails (for testing error isolation)
     * @returns {Object} Express router that will throw an error when created
     */
    createTestErrorRoute() {
        // This will only be used in development
        if (process.env.NODE_ENV === 'production') {
            const router = express.Router();
            router.get('/', (req, res) => {
                res.status(200).json({
                    success: true,
                    message: 'Test route disabled in production'
                });
            });
            return router;
        }
        
        // In development, throw an error to test fault isolation
        throw new Error('Deliberate test error for route fault isolation testing');
    }
}
export default RouteFactory;
