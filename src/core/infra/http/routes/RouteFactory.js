import express from "express";
import PersonalityController from "../../../personality/controllers/PersonalityController.js";
import personalityApiSchemas from "../../../personality/schemas/personalityApiSchemas.js";
import { authenticateUser, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../../../infra/http/middleware/validation.js";
import AdaptiveController from "../../../adaptive/controllers/AdaptiveController.js";
import AuthController from "../../../auth/controllers/AuthController.js";
import ProgressController from "../../../progress/controllers/ProgressController.js";
import EvaluationController from "../../../evaluation/controllers/EvaluationController.js";
import UserController from "../../../user/controllers/UserController.js";
import ChallengeController from "../../../challenge/controllers/ChallengeController.js";
import UserJourneyController from "../../../userJourney/controllers/UserJourneyController.js";
import FocusAreaController from "../../../focusArea/controllers/FocusAreaController.js";
import createHealthRoutes from "../../../infra/http/routes/healthRoutes.js";
import { AdaptiveRepository } from "../../../adaptive/repositories/AdaptiveRepository.js";
import eventBusRoutes from "./eventBusRoutes.js";
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
     */
    async mountAll(app, apiPrefix = '/api/v1') {
        console.log(`Setting up routes in ${process.env.NODE_ENV || 'development'} mode`);
        
        try {
            // Potentially async routes
            const userRoutes = await this.createUserRoutes();
            const authRoutes = await this.createAuthRoutes();
            
            // Standard routes
            app.use(`${apiPrefix}/users`, userRoutes);
            app.use(`${apiPrefix}/auth`, authRoutes);
            app.use(`${apiPrefix}/personality`, this.createPersonalityRoutes());
            app.use(`${apiPrefix}/progress`, this.createProgressRoutes());
            app.use(`${apiPrefix}/challenges`, this.createChallengeRoutes());
            app.use(`${apiPrefix}/evaluations`, this.createEvaluationRoutes());
            // Re-enable adaptive routes
            app.use(`${apiPrefix}/adaptive`, this.createAdaptiveRoutes());
            // Re-enable user-journey routes now that we've added proper error handling
            app.use(`${apiPrefix}/user-journey`, this.createUserJourneyRoutes());
            // Re-enable focus-areas routes now that required services are registered
            app.use(`${apiPrefix}/focus-areas`, this.createFocusAreaRoutes());
            
            // Health check routes (mounted at API prefix without additional path segment)
            app.use(`${apiPrefix}/health`, this.createHealthRoutes());
            
            // Add event bus routes before health check routes
            app.use(`${apiPrefix}/events`, this.createEventBusRoutes());
            
            console.log(`All routes successfully mounted at ${apiPrefix}`);
        } catch (error) {
            console.error('Error mounting routes:', error);
            
            // Setup a fallback route that reports the error
            app.use(`${apiPrefix}`, (req, res) => {
                res.status(500).json({
                    error: 'Failed to initialize API routes',
                    message: error.message
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
         * /personality/profile:
         *   get:
         *     summary: Get personality profile
         *     description: Retrieves the current user's personality profile and insights
         *     tags: [Personality]
         *     security:
         *       - bearerAuth: []
         *     responses:
         *       200:
         *         description: Personality profile retrieved successfully
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                   example: true
         *                 data:
         *                   type: object
         *                   properties:
         *                     traits:
         *                       type: array
         *                       items:
         *                         type: object
         *                     insights:
         *                       type: object
         *                     lastUpdated:
         *                       type: string
         *                       format: date-time
         *       401:
         *         description: Not authenticated
         *       404:
         *         description: Profile not found
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
             * /adaptive/profile:
             *   get:
             *     summary: Get adaptive recommendations
             *     description: Retrieves personalized recommendations based on the user's learning profile
             *     tags: [Adaptive]
             *     security:
             *       - bearerAuth: []
             *     responses:
             *       200:
             *         description: Recommendations retrieved successfully
             *         content:
             *           application/json:
             *             schema:
             *               type: object
             *               properties:
             *                 success:
             *                   type: boolean
             *                   example: true
             *                 data:
             *                   type: object
             *                   properties:
             *                     recommendedChallenges:
             *                       type: array
             *                       items:
             *                         type: object
             *                     learningProfile:
             *                       type: object
             *                     nextSteps:
             *                       type: array
             *                       items:
             *                         type: string
             *       401:
             *         description: Not authenticated
             *       404:
             *         description: Profile not found
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
                
                return import('../middleware/validation.js').then(validation => {
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
         * /evaluations:
         *   post:
         *     summary: Submit for evaluation
         *     description: Submits a response to be evaluated by the AI
         *     tags: [Evaluations]
         *     security:
         *       - bearerAuth: []
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - challengeId
         *               - response
         *             properties:
         *               challengeId:
         *                 type: string
         *                 format: uuid
         *                 description: ID of the challenge being evaluated
         *               response:
         *                 type: string
         *                 description: The user's response to evaluate
         *     responses:
         *       201:
         *         description: Evaluation created successfully
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/EvaluationResponse'
         *       400:
         *         $ref: '#/components/responses/ValidationError'
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
         *       404:
         *         $ref: '#/components/responses/NotFoundError'
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
                const authMiddleware = import('../middleware/auth.js');
                const validationMiddleware = import('../middleware/validation.js');
                
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
         * /challenges/generate:
         *   post:
         *     summary: Generate a new challenge
         *     description: Generates a new challenge for a user based on provided parameters
         *     tags: [Challenges]
         *     security:
         *       - bearerAuth: []
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - userEmail
         *             properties:
         *               userEmail:
         *                 type: string
         *                 format: email
         *                 description: Email of the user requesting the challenge
         *               focusArea:
         *                 type: string
         *                 description: Focus area for the challenge
         *               challengeType:
         *                 type: string
         *                 description: Type of challenge to generate
         *               formatType:
         *                 type: string
         *                 description: Format type for the challenge
         *               difficulty:
         *                 type: string
         *                 enum: [beginner, intermediate, advanced, expert]
         *                 description: Difficulty level of the challenge
         *     responses:
         *       201:
         *         description: Challenge created successfully
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                   example: true
         *                 data:
         *                   $ref: '#/components/schemas/Challenge'
         *       400:
         *         $ref: '#/components/responses/ValidationError'
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
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
             * /user-journey/current:
             *   get:
             *     summary: Get user journey events
             *     description: Retrieves all events in the current user's journey
             *     tags: [UserJourney]
             *     security:
             *       - bearerAuth: []
             *     responses:
             *       200:
             *         description: User journey events retrieved successfully
             *         content:
             *           application/json:
             *             schema:
             *               type: object
             *               properties:
             *                 success:
             *                   type: boolean
             *                   example: true
             *                 data:
             *                   type: array
             *                   items:
             *                     $ref: '#/components/schemas/UserJourneyEvent'
             *       401:
             *         $ref: '#/components/responses/UnauthorizedError'
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
             * /focus-areas:
             *   get:
             *     summary: Get all focus areas
             *     description: Retrieves all available focus areas
             *     tags: [FocusAreas]
             *     security:
             *       - bearerAuth: []
             *     responses:
             *       200:
             *         description: Focus areas retrieved successfully
             *         content:
             *           application/json:
             *             schema:
             *               type: object
             *               properties:
             *                 success:
             *                   type: boolean
             *                   example: true
             *                 data:
             *                   type: array
             *                   items:
             *                     $ref: '#/components/schemas/FocusArea'
             *       401:
             *         $ref: '#/components/responses/UnauthorizedError'
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
}
export default RouteFactory;
