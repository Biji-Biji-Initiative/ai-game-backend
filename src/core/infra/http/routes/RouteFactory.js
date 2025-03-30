import express from "express";
import PersonalityController from "../../../personality/controllers/PersonalityController.js";
import personalityApiSchemas from "../../../personality/schemas/personalityApiSchemas.js";
import { authenticateUser } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import AdaptiveController from "../../../adaptive/controllers/AdaptiveController.js";
import AuthController from "../../../auth/controllers/AuthController.js";
import ProgressController from "../../../progress/controllers/ProgressController.js";
import EvaluationController from "../../../evaluation/controllers/EvaluationController.js";
import UserController from "../../../user/controllers/UserController.js";
import ChallengeController from "../../../challenge/controllers/ChallengeController.js";
import UserJourneyController from "../../../userJourney/controllers/UserJourneyController.js";
import FocusAreaController from "../../../focusArea/controllers/FocusAreaController.js";
import createHealthRoutes from "./healthRoutes.js";
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
            app.use(`${apiPrefix}/adaptive`, this.createAdaptiveRoutes());
            app.use(`${apiPrefix}/user-journey`, this.createUserJourneyRoutes());
            app.use(`${apiPrefix}/focus-areas`, this.createFocusAreaRoutes());
            
            // Health check routes (mounted at API prefix without additional path segment)
            app.use(`${apiPrefix}/health`, this.createHealthRoutes());
            
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
         * @swagger
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
        /**
         * @swagger
         * /personality/recommendations:
         *   get:
         *     summary: Get personality-based recommendations
         *     description: Retrieves recommendations based on the user's personality profile
         *     tags: [Personality]
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
         *                   type: array
         *                   items:
         *                     type: object
         *                     properties:
         *                       type:
         *                         type: string
         *                       content:
         *                         type: string
         *                       relevance:
         *                         type: number
         *       401:
         *         description: Not authenticated
         *       404:
         *         description: Profile not found
         */
        router.get('/recommendations', authenticateUser, personalityController.getPersonalityProfile.bind(personalityController));
        /**
         * @swagger
         * /personality/assessment/submit:
         *   post:
         *     summary: Submit personality assessment
         *     description: Submits answers to a personality assessment to update the user's profile
         *     tags: [Personality]
         *     security:
         *       - bearerAuth: []
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - answers
         *             properties:
         *               answers:
         *                 type: array
         *                 items:
         *                   type: object
         *                   required:
         *                     - questionId
         *                     - answer
         *                   properties:
         *                     questionId:
         *                       type: string
         *                     answer:
         *                       type: string
         *     responses:
         *       200:
         *         description: Assessment submitted successfully
         *       400:
         *         description: Invalid input data
         *       401:
         *         description: Not authenticated
         */
        router.post('/assessment/submit', authenticateUser, validateBody(personalityApiSchemas.submitAssessmentSchema), personalityController.submitAssessment.bind(personalityController));
        return router;
    }
    /**
     * Create adaptive learning routes
     * @returns {Object} Express router with adaptive learning routes
     */
    createAdaptiveRoutes() {
        const router = express.Router();
        // Create controller instance with dependencies
        const adaptiveController = new AdaptiveController({
            logger: this.container.get('logger'),
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
                const express = require('express');
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
            const express = require('express');
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
        // Create controller instance with dependencies
        const userJourneyController = new UserJourneyController({
            userJourneyCoordinator: this.container.get('userJourneyCoordinator'),
            userRepository: this.container.get('userRepository'),
        });
        
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
        router.get('/current', authenticateUser, userJourneyController.getUserJourneyEvents.bind(userJourneyController));
        
        /**
         * @swagger
         * /user-journey/{userId}:
         *   get:
         *     summary: Get journey events for a specific user
         *     description: Retrieves all journey events for a specific user (admin only)
         *     tags: [UserJourney]
         *     security:
         *       - bearerAuth: []
         *     parameters:
         *       - in: path
         *         name: userId
         *         required: true
         *         schema:
         *           type: string
         *           format: uuid
         *         description: ID of the user to retrieve journey for
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
         *       403:
         *         description: Forbidden - Admin access required
         *       404:
         *         $ref: '#/components/responses/NotFoundError'
         */
        router.get('/:userId', authenticateUser, requireAdmin, userJourneyController.getUserJourneyById.bind(userJourneyController));
        
        /**
         * @swagger
         * /user-journey/event/{eventId}:
         *   get:
         *     summary: Get a specific journey event
         *     description: Retrieves a specific user journey event by ID
         *     tags: [UserJourney]
         *     security:
         *       - bearerAuth: []
         *     parameters:
         *       - in: path
         *         name: eventId
         *         required: true
         *         schema:
         *           type: string
         *           format: uuid
         *         description: ID of the event to retrieve
         *     responses:
         *       200:
         *         description: User journey event retrieved successfully
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/UserJourneyResponse'
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
         *       403:
         *         description: Forbidden - Not authorized to access this event
         *       404:
         *         $ref: '#/components/responses/NotFoundError'
         */
        router.get('/event/:eventId', authenticateUser, userJourneyController.getJourneyEvent.bind(userJourneyController));
        
        /**
         * @swagger
         * /user-journey/types/{eventType}:
         *   get:
         *     summary: Get events by type
         *     description: Retrieves all user journey events of a specific type for the current user
         *     tags: [UserJourney]
         *     security:
         *       - bearerAuth: []
         *     parameters:
         *       - in: path
         *         name: eventType
         *         required: true
         *         schema:
         *           type: string
         *           enum: [CHALLENGE_COMPLETED, FOCUS_AREA_SELECTED, SKILL_LEVEL_INCREASED, ACHIEVEMENT_EARNED, LOGIN, REGISTRATION, PROFILE_UPDATED]
         *         description: Type of events to retrieve
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
        router.get('/types/:eventType', authenticateUser, userJourneyController.getEventsByType.bind(userJourneyController));
        
        /**
         * @swagger
         * /user-journey/timeline:
         *   get:
         *     summary: Get user journey timeline
         *     description: Retrieves a chronological timeline of user journey events with additional context
         *     tags: [UserJourney]
         *     security:
         *       - bearerAuth: []
         *     responses:
         *       200:
         *         description: User journey timeline retrieved successfully
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
         *                     timeline:
         *                       type: array
         *                       items:
         *                         $ref: '#/components/schemas/UserJourneyEvent'
         *                     milestones:
         *                       type: array
         *                       items:
         *                         type: object
         *                         properties:
         *                           id:
         *                             type: string
         *                           name:
         *                             type: string
         *                           description:
         *                             type: string
         *                           timestamp:
         *                             type: string
         *                             format: date-time
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
         */
        router.get('/timeline', authenticateUser, userJourneyController.getUserTimeline.bind(userJourneyController));
        
        return router;
    }
    /**
     * Create focus area routes
     * @returns {Object} Express router with focus area routes
     */
    createFocusAreaRoutes() {
        const router = express.Router();
        // Create controller instance with dependencies
        const focusAreaController = new FocusAreaController({
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
        
        /**
         * @swagger
         * /focus-areas/{id}:
         *   get:
         *     summary: Get focus area by ID
         *     description: Retrieves a specific focus area by its unique identifier
         *     tags: [FocusAreas]
         *     security:
         *       - bearerAuth: []
         *     parameters:
         *       - in: path
         *         name: id
         *         required: true
         *         schema:
         *           type: string
         *           format: uuid
         *         description: ID of the focus area to retrieve
         *     responses:
         *       200:
         *         description: Focus area retrieved successfully
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/FocusAreaResponse'
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
         *       404:
         *         $ref: '#/components/responses/NotFoundError'
         */
        router.get('/:id', authenticateUser, focusAreaController.getFocusAreaById.bind(focusAreaController));
        
        /**
         * @swagger
         * /focus-areas:
         *   post:
         *     summary: Create a new focus area
         *     description: Creates a new focus area for the current user
         *     tags: [FocusAreas]
         *     security:
         *       - bearerAuth: []
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - name
         *             properties:
         *               name:
         *                 type: string
         *                 description: Name of the focus area
         *               description:
         *                 type: string
         *                 description: Detailed description of the focus area
         *               priority:
         *                 type: integer
         *                 minimum: 1
         *                 maximum: 5
         *                 description: Priority level (1-5, where 1 is highest)
         *               metadata:
         *                 type: object
         *                 description: Additional metadata
         *     responses:
         *       201:
         *         description: Focus area created successfully
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/FocusAreaResponse'
         *       400:
         *         $ref: '#/components/responses/ValidationError'
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
         */
        router.post('/', authenticateUser, focusAreaController.createFocusArea.bind(focusAreaController));
        
        /**
         * @swagger
         * /focus-areas/{id}:
         *   put:
         *     summary: Update a focus area
         *     description: Updates an existing focus area
         *     tags: [FocusAreas]
         *     security:
         *       - bearerAuth: []
         *     parameters:
         *       - in: path
         *         name: id
         *         required: true
         *         schema:
         *           type: string
         *           format: uuid
         *         description: ID of the focus area to update
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             properties:
         *               name:
         *                 type: string
         *                 description: Name of the focus area
         *               description:
         *                 type: string
         *                 description: Detailed description of the focus area
         *               active:
         *                 type: boolean
         *                 description: Whether this focus area is active
         *               priority:
         *                 type: integer
         *                 minimum: 1
         *                 maximum: 5
         *                 description: Priority level (1-5, where 1 is highest)
         *               metadata:
         *                 type: object
         *                 description: Additional metadata
         *     responses:
         *       200:
         *         description: Focus area updated successfully
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/FocusAreaResponse'
         *       400:
         *         $ref: '#/components/responses/ValidationError'
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
         *       404:
         *         $ref: '#/components/responses/NotFoundError'
         */
        router.put('/:id', authenticateUser, focusAreaController.updateFocusArea.bind(focusAreaController));
        
        /**
         * @swagger
         * /focus-areas/{id}:
         *   delete:
         *     summary: Delete a focus area
         *     description: Deletes an existing focus area
         *     tags: [FocusAreas]
         *     security:
         *       - bearerAuth: []
         *     parameters:
         *       - in: path
         *         name: id
         *         required: true
         *         schema:
         *           type: string
         *           format: uuid
         *         description: ID of the focus area to delete
         *     responses:
         *       200:
         *         description: Focus area deleted successfully
         *       401:
         *         $ref: '#/components/responses/UnauthorizedError'
         *       404:
         *         $ref: '#/components/responses/NotFoundError'
         */
        router.delete('/:id', authenticateUser, focusAreaController.deleteFocusArea.bind(focusAreaController));
        
        /**
         * @swagger
         * /focus-areas/user/{userId}:
         *   get:
         *     summary: Get focus areas for a user
         *     description: Retrieves all focus areas for a specific user
         *     tags: [FocusAreas]
         *     security:
         *       - bearerAuth: []
         *     parameters:
         *       - in: path
         *         name: userId
         *         required: true
         *         schema:
         *           type: string
         *           format: uuid
         *         description: ID of the user to get focus areas for
         *     responses:
         *       200:
         *         description: User focus areas retrieved successfully
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
         *       404:
         *         $ref: '#/components/responses/NotFoundError'
         */
        router.get('/user/:userId', authenticateUser, focusAreaController.getUserFocusAreas.bind(focusAreaController));
        
        /**
         * @swagger
         * /focus-areas/generate:
         *   post:
         *     summary: Generate focus area suggestions
         *     description: Generates personalized focus area suggestions based on user profile
         *     tags: [FocusAreas]
         *     security:
         *       - bearerAuth: []
         *     requestBody:
         *       required: false
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             properties:
         *               count:
         *                 type: integer
         *                 minimum: 1
         *                 maximum: 10
         *                 description: Number of suggestions to generate (default 3)
         *               userPreferences:
         *                 type: object
         *                 description: Optional user preferences to guide suggestions
         *     responses:
         *       200:
         *         description: Focus area suggestions generated successfully
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
        router.post('/generate', authenticateUser, focusAreaController.generateFocusAreaSuggestions.bind(focusAreaController));
        
        return router;
    }
    /**
     * Create health check routes
     * @returns {Object} Express router with health check routes
     */
    createHealthRoutes() {
        return createHealthRoutes(this.container);
    }
}
export default RouteFactory;
