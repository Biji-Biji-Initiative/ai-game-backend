import express from "express";
import PersonalityController from "../../../personality/controllers/PersonalityController.js";
import personalityApiSchemas from "../../../personality/schemas/personalityApiSchemas.js";
import { authenticateUser } from "../../../infra/http/middleware/auth.js";
import { validateBody } from "../../../infra/http/middleware/validation.js";
import { registerRouteValidation } from "../../../infra/http/middleware/validateApiRoutes.js";
import AdaptiveController from "../../../adaptive/controllers/AdaptiveController.js";
import AuthController from "../../../auth/controllers/AuthController.js";
import ProgressController from "../../../progress/controllers/ProgressController.js";
import EvaluationController from "../../../evaluation/controllers/EvaluationController.js";
import UserController from "../../../user/controllers/UserController.js";
import ChallengeController from "../../../challenge/controllers/ChallengeController.js";
import UserJourneyController from "../../../userJourney/controllers/UserJourneyController.js";
import FocusAreaController from "../../../focusArea/controllers/FocusAreaController.js";
import createHealthRoutes from "../../../infra/http/routes/healthRoutes.js";
'use strict';
/**
 * Route Factory
 *
 * Factory class for creating route handlers with dependency injection
 */
/**
 * @swagger
 * tags:
 *   - name: Challenges
 *     description: Challenge management endpoints
 *   - name: Users
 *     description: User account management endpoints
 *   - name: Auth
 *     description: Authentication and authorization endpoints
 *   - name: Personality
 *     description: User personality profile endpoints
 *   - name: Progress
 *     description: User progress tracking endpoints
 *   - name: Evaluations
 *     description: Response evaluation endpoints
 *   - name: Adaptive
 *     description: Adaptive learning and recommendations endpoints
 *   - name: UserJourney
 *     description: User journey and event tracking endpoints
 *   - name: FocusAreas
 *     description: Focus area management endpoints
 */
class RouteFactory {
    /**
     * Create a new RouteFactory
     * @param {Object} container - DI container for dependency injection
     */
    constructor(container) {
        this.container = container;
        this.logger = container.get('logger');
        
        // Keep track of registered validation schemas
        this.validationSchemas = {};
    }
    
    /**
     * Register validation schema for a route
     * 
     * @param {string} routePath - The route path (e.g., '/users/:id')
     * @param {string} method - The HTTP method (GET, POST, PUT, DELETE)
     * @param {Object} schemas - Validation schemas for request parts
     * @param {Object} [options] - Validation options
     */
    registerValidation(routePath, method, schemas, options = {}) {
        if (!schemas || Object.keys(schemas).length === 0) {
            return;
        }
        
        try {
            // Register with the global validation middleware
            registerRouteValidation(routePath, method, schemas, options);
            
            // Store for tracking
            const key = `${method.toUpperCase()}:${routePath}`;
            this.validationSchemas[key] = { schemas, options };
            
            this.logger.debug(`Registered validation for ${method.toUpperCase()} ${routePath}`);
        } catch (error) {
            this.logger.error(`Failed to register validation for ${method.toUpperCase()} ${routePath}`, {
                error: error.message,
                schemas: Object.keys(schemas)
            });
        }
    }
    /**
     * Mount all API routes
     * @param {Object} app - Express application instance
     * @param {string} apiPrefix - API route prefix (default: '/api/v1')
     */
    async mountAll(app, apiPrefix = '/api/v1') {
        console.log(`Setting up routes in ${process.env.NODE_ENV || 'development'} mode`);
        
        // Define route configurations with their creation methods and paths
        const routeConfigs = [
            { path: `${apiPrefix}/users`, createMethod: 'createUserRoutes', critical: true },
            { path: `${apiPrefix}/auth`, createMethod: 'createAuthRoutes', critical: true },
            { path: `${apiPrefix}/personality`, createMethod: 'createPersonalityRoutes', critical: false },
            { path: `${apiPrefix}/progress`, createMethod: 'createProgressRoutes', critical: false },
            { path: `${apiPrefix}/challenges`, createMethod: 'createChallengeRoutes', critical: true },
            { path: `${apiPrefix}/evaluations`, createMethod: 'createEvaluationRoutes', critical: false },
            { path: `${apiPrefix}/adaptive`, createMethod: 'createAdaptiveRoutes', critical: false },
            { path: `${apiPrefix}/user-journey`, createMethod: 'createUserJourneyRoutes', critical: false },
            { path: `${apiPrefix}/focus-areas`, createMethod: 'createFocusAreaRoutes', critical: false },
            { path: `${apiPrefix}/health`, createMethod: 'createHealthRoutes', critical: true }
        ];
        
        // Count of successfully mounted routes
        let successCount = 0;
        let criticalFailures = 0;
        
        // Mount routes with fault isolation
        for (const routeConfig of routeConfigs) {
            try {
                // Get the creation method
                const createMethod = this[routeConfig.createMethod];
                
                // Validate the creation method exists
                if (typeof createMethod !== 'function') {
                    throw new Error(`Route creation method '${routeConfig.createMethod}' is not defined`);
                }
                
                // Create and mount the route
                const router = await createMethod.call(this);
                app.use(routeConfig.path, router);
                
                this.logger.info(`Mounted route: ${routeConfig.path}`);
                successCount++;
            } catch (error) {
                // Log the error
                this.logger.error(`Failed to mount route: ${routeConfig.path}`, { 
                    error: error.message, 
                    stack: error.stack,
                    critical: routeConfig.critical 
                });
                
                // If it's a critical route, increment failure counter
                if (routeConfig.critical) {
                    criticalFailures++;
                }
                
                // Create a fallback route handler that returns a 503 Service Unavailable
                app.use(routeConfig.path, (req, res) => {
                    const isDev = process.env.NODE_ENV !== 'production';
                    const statusCode = 503;
                    const response = {
                        error: 'Service Unavailable',
                        message: 'This API endpoint is currently unavailable',
                        details: isDev ? error.message : undefined
                    };
                    
                    res.status(statusCode).json(response);
                });
            }
        }
        
        // Log overall mount status
        if (successCount === routeConfigs.length) {
            this.logger.info(`All routes successfully mounted at ${apiPrefix}`);
        } else {
            this.logger.warn(`Mounted ${successCount}/${routeConfigs.length} routes, ${routeConfigs.length - successCount} failed`);
            
            // If any critical routes failed, log a more severe warning
            if (criticalFailures > 0) {
                this.logger.error(`${criticalFailures} critical route(s) failed to mount. Application may not function correctly.`);
            }
        }
        
        // After mounting routes, log validation coverage
        const schemaCount = Object.keys(this.validationSchemas).length;
        this.logger.info(`Registered validation schemas for ${schemaCount} routes`);
    }
    /**
     * Create personality routes
     * @returns {Object} Express router with personality routes
     */
    createPersonalityRoutes() {
        const router = express.Router();
        try {
            // Create controller instance with dependencies
            const personalityController = new PersonalityController({
                personalityService: this.container.get('personalityService'),
                logger: this.logger,
            });
            
            // Define routes with validated method bindings
            router.get(
                '/profile', 
                authenticateUser, 
                this._validateControllerMethod(
                    personalityController, 
                    'getPersonalityProfile', 
                    'PersonalityController', 
                    '/personality/profile'
                )
            );
            
            router.get(
                '/recommendations', 
                authenticateUser, 
                this._validateControllerMethod(
                    personalityController, 
                    'getPersonalityRecommendations', 
                    'PersonalityController', 
                    '/personality/recommendations'
                )
            );
            
            router.post(
                '/assessment/submit', 
                authenticateUser, 
                validateBody(personalityApiSchemas.submitAssessmentSchema),
                this._validateControllerMethod(
                    personalityController, 
                    'submitPersonalityAssessment', 
                    'PersonalityController', 
                    '/personality/assessment/submit'
                )
            );
        } catch (error) {
            this.logger.error('Error creating personality routes', { error: error.message, stack: error.stack });
            // Return router with fallback handlers for all expected routes
            router.get('/profile', this._createFallbackHandler(503, 'Personality profile service unavailable'));
            router.get('/recommendations', this._createFallbackHandler(503, 'Personality recommendations service unavailable'));
            router.post('/assessment/submit', this._createFallbackHandler(503, 'Personality assessment service unavailable'));
        }
        
        return router;
    }
    /**
     * Create adaptive learning routes
     * @returns {Object} Express router with adaptive learning routes
     */
    createAdaptiveRoutes() {
        const router = express.Router();
        
        try {
            // Create controller instance with dependencies
            const adaptiveController = new AdaptiveController({
                logger: this.logger,
                adaptiveService: this.container.get('adaptiveService'),
            });
            
            /**
             * @swagger
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
                    logger: this.logger || console
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
            logger: this.logger,
            evaluationService: this.container.get('evaluationService'),
            openAIStateManager: this.container.get('openAIStateManager'),
            challengeRepository: this.container.get('challengeRepository'),
        });
        /**
         * @swagger
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

        /**
         * @swagger
         * /evaluations/stream:
         *   post:
         *     summary: Stream an evaluation
         *     description: Streams the evaluation process in real-time using server-sent events
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
         *       200:
         *         description: Stream started successfully
         *         content:
         *           text/event-stream:
         *             schema:
         *               $ref: '#/components/schemas/EvaluationStream'
         *       400:
         *         $ref: '#/components/responses/ValidationError'
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
         *       404:
         *         $ref: '#/components/responses/NotFoundError'
         */
        router.post('/stream', authenticateUser, evaluationController.streamEvaluation.bind(evaluationController));

        /**
         * @swagger
         * /evaluations/challenge/{challengeId}:
         *   get:
         *     summary: Get evaluations for a challenge
         *     description: Retrieves all evaluations related to a specific challenge
         *     tags: [Evaluations]
         *     security:
         *       - bearerAuth: []
         *     parameters:
         *       - in: path
         *         name: challengeId
         *         required: true
         *         schema:
         *           type: string
         *           format: uuid
         *         description: ID of the challenge to get evaluations for
         *     responses:
         *       200:
         *         description: Evaluations retrieved successfully
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
         *                     $ref: '#/components/schemas/Evaluation'
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
         *       404:
         *         $ref: '#/components/responses/NotFoundError'
         */
        router.get('/challenge/:challengeId', authenticateUser, evaluationController.getEvaluationsForChallenge.bind(evaluationController));

        /**
         * @swagger
         * /evaluations/user/me:
         *   get:
         *     summary: Get current user's evaluations
         *     description: Retrieves all evaluations for the currently authenticated user
         *     tags: [Evaluations]
         *     security:
         *       - bearerAuth: []
         *     responses:
         *       200:
         *         description: User evaluations retrieved successfully
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
         *                     $ref: '#/components/schemas/Evaluation'
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
         *       403:
         *         description: Not authorized to access these evaluations
         */
        router.get('/user/me', authenticateUser, evaluationController.getEvaluationsForUser.bind(evaluationController));

        /**
         * @swagger
         * /evaluations/{id}:
         *   get:
         *     summary: Get evaluation by ID
         *     description: Retrieves an evaluation by its unique identifier
         *     tags: [Evaluations]
         *     security:
         *       - bearerAuth: []
         *     parameters:
         *       - in: path
         *         name: id
         *         required: true
         *         schema:
         *           type: string
         *           format: uuid
         *         description: ID of the evaluation to retrieve
         *     responses:
         *       200:
         *         description: Evaluation retrieved successfully
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/EvaluationResponse'
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
         *       403:
         *         description: Not authorized to access this evaluation
         *       404:
         *         $ref: '#/components/responses/NotFoundError'
         */
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
                
                return Promise.all([
                    import('../middleware/auth.js'),
                    import('../middleware/validation.js'),
                    import('../../../user/schemas/userApiSchemas.js')
                ]).then(([auth, validation, schemas]) => {
                    console.log('Creating real user routes');
                    
                    // Register validation schemas for user routes
                    const basePath = '/users';
                    
                    // User update validation
                    this.registerValidation(
                        `${basePath}/me`, 
                        'PUT',
                        { body: schemas.default.updateUserSchema }
                    );
                    
                    // Focus area update validation
                    this.registerValidation(
                        `${basePath}/me/focus-area`, 
                        'PUT',
                        { body: schemas.default.updateFocusAreaSchema }
                    );
                    
                    // User ID parameter validation
                    this.registerValidation(
                        `${basePath}/:id`, 
                        'GET',
                        { params: schemas.default.userIdSchema }
                    );
                    
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
         * @swagger
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
        
        /**
         * @swagger
         * /challenges/{challengeId}:
         *   get:
         *     summary: Get challenge by ID
         *     description: Retrieves a challenge by its unique identifier
         *     tags: [Challenges]
         *     security:
         *       - bearerAuth: []
         *     parameters:
         *       - in: path
         *         name: challengeId
         *         required: true
         *         schema:
         *           type: string
         *           format: uuid
         *         description: ID of the challenge to retrieve
         *     responses:
         *       200:
         *         description: Challenge found
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
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
         *       404:
         *         $ref: '#/components/responses/NotFoundError'
         */
        router.get('/:challengeId', authenticateUser, challengeController.getChallengeById.bind(challengeController));
        
        /**
         * @swagger
         * /challenges/user/{userEmail}/history:
         *   get:
         *     summary: Get user's challenge history
         *     description: Retrieves all challenges completed by a specific user
         *     tags: [Challenges]
         *     security:
         *       - bearerAuth: []
         *     parameters:
         *       - in: path
         *         name: userEmail
         *         required: true
         *         schema:
         *           type: string
         *           format: email
         *         description: Email of the user to retrieve challenge history for
         *     responses:
         *       200:
         *         description: Challenge history retrieved successfully
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
         *                     $ref: '#/components/schemas/Challenge'
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
         *       404:
         *         $ref: '#/components/responses/NotFoundError'
         */
        router.get('/user/:userEmail/history', authenticateUser, challengeController.getChallengeHistory.bind(challengeController));
        
        /**
         * @swagger
         * /challenges/{challengeId}/submit:
         *   post:
         *     summary: Submit challenge response
         *     description: Submits a user's response to a specific challenge
         *     tags: [Challenges]
         *     security:
         *       - bearerAuth: []
         *     parameters:
         *       - in: path
         *         name: challengeId
         *         required: true
         *         schema:
         *           type: string
         *           format: uuid
         *         description: ID of the challenge
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - userEmail
         *               - response
         *             properties:
         *               userEmail:
         *                 type: string
         *                 format: email
         *                 description: Email of the user submitting the response
         *               response:
         *                 type: string
         *                 description: User's response to the challenge
         *     responses:
         *       200:
         *         description: Response submitted successfully
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                   example: true
         *                 data:
         *                   $ref: '#/components/schemas/ChallengeResponse'
         *       400:
         *         $ref: '#/components/responses/ValidationError'
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
         *       404:
         *         $ref: '#/components/responses/NotFoundError'
         */
        router.post('/:challengeId/submit', authenticateUser, challengeController.submitChallengeResponse.bind(challengeController));
        
        /**
         * @swagger
         * /challenges:
         *   get:
         *     summary: List challenges
         *     description: Retrieves a paginated list of challenges with filtering options
         *     tags: [Challenges]
         *     security:
         *       - bearerAuth: []
         *     parameters:
         *       - $ref: '#/components/parameters/limitParam'
         *       - $ref: '#/components/parameters/offsetParam'
         *       - $ref: '#/components/parameters/sortParam'
         *       - name: difficulty
         *         in: query
         *         description: Filter by difficulty level
         *         schema:
         *           type: string
         *           enum: [beginner, intermediate, advanced, expert]
         *       - name: focusArea
         *         in: query
         *         description: Filter by focus area
         *         schema:
         *           type: string
         *       - name: type
         *         in: query
         *         description: Filter by challenge type
         *         schema:
         *           type: string
         *       - name: search
         *         in: query
         *         description: Search term to filter challenges by title or description
         *         schema:
         *           type: string
         *     responses:
         *       200:
         *         description: Paginated list of challenges
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
         *                     $ref: '#/components/schemas/Challenge'
         *                 pagination:
         *                   type: object
         *                   properties:
         *                     total:
         *                       type: integer
         *                       example: 50
         *                       description: Total number of challenges available
         *                     limit:
         *                       type: integer
         *                       example: 20
         *                       description: Number of challenges per page
         *                     offset:
         *                       type: integer
         *                       example: 0
         *                       description: Current offset from the first challenge
         *                     hasMore:
         *                       type: boolean
         *                       example: true
         *                       description: Whether more challenges are available
         *             examples:
         *               paginatedChallenges:
         *                 summary: Example of paginated challenges
         *                 value:
         *                   success: true
         *                   data:
         *                     - id: "123e4567-e89b-12d3-a456-426614174000"
         *                       title: "API Authentication with JWT"
         *                       description: "Implement a secure authentication system using JWT tokens"
         *                       difficulty: "intermediate"
         *                       focusArea: "Security"
         *                       createdAt: "2023-04-15T14:32:21.000Z"
         *                       type: "implementation"
         *                     - id: "223e4567-e89b-12d3-a456-426614174001"
         *                       title: "Optimize Database Queries"
         *                       description: "Improve the performance of a set of database queries"
         *                       difficulty: "advanced"
         *                       focusArea: "Performance"
         *                       createdAt: "2023-04-14T10:15:40.000Z"
         *                       type: "optimization"
         *                   pagination:
         *                     total: 50
         *                     limit: 20
         *                     offset: 0
         *                     hasMore: true
         *       400:
         *         $ref: '#/components/responses/ValidationError'
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
         *       429:
         *         $ref: '#/components/responses/RateLimitError'
         */
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
             * @swagger
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
            // Create controller instance with dependencies
            const focusAreaController = new FocusAreaController({
                focusAreaCoordinator: this.container.get('focusAreaCoordinator'),
                focusAreaService: this.container.get('focusAreaService'),
                focusAreaGenerationService: this.container.get('focusAreaGenerationService'),
            });
            
            /**
             * @swagger
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
                        message: 'Mock focus areas API endpoint',
                        data: {
                            focusAreas: [
                                { id: 'mock-id-1', name: 'Security', description: 'Mock security focus area' },
                                { id: 'mock-id-2', name: 'Performance', description: 'Mock performance focus area' }
                            ]
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
     * Validates that a controller method exists and is a function before binding
     * @param {Object} controller - Controller instance
     * @param {string} methodName - Name of the method to check
     * @param {string} controllerName - Name of the controller (for logging)
     * @param {string} routePath - Path of the route (for logging)
     * @returns {Function} - Validated method bound to controller or fallback
     * @private
     */
    _validateControllerMethod(controller, methodName, controllerName, routePath) {
        // Check if controller is defined
        if (!controller) {
            this.logger.error(`Controller ${controllerName} is undefined for route ${routePath}`);
            return this._createFallbackHandler(501, `Controller unavailable: ${controllerName}`);
        }
        
        // Check if method exists on controller
        if (typeof controller[methodName] !== 'function') {
            this.logger.error(`Method ${methodName} not found on controller ${controllerName} for route ${routePath}`);
            return this._createFallbackHandler(501, `Method unavailable: ${methodName}`);
        }
        
        // Return the method bound to its controller
        return controller[methodName].bind(controller);
    }
    
    /**
     * Creates a fallback handler for routes with missing controllers or methods
     * @param {number} statusCode - HTTP status code to return
     * @param {string} message - Error message to include
     * @returns {Function} - Express route handler
     * @private
     */
    _createFallbackHandler(statusCode, message) {
        return (req, res) => {
            const isDev = process.env.NODE_ENV !== 'production';
            const response = {
                error: 'Not Implemented',
                message: isDev ? message : 'This endpoint is not implemented',
            };
            
            res.status(statusCode).json(response);
        };
    }
}
export default RouteFactory;
