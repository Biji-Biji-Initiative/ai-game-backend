// Remove these imports since they're not being used
// const { container } = require('../../../config/container');
// const { userJourneyController } = require('../controllers/userJourneyController');
// const { userController } = require('../controllers/userController');
// const { progressController } = require('../controllers/progressController');
// const { personalityController } = require('../controllers/personalityController');
// const { focusAreaController } = require('../controllers/focusAreaController');
// const { evaluationController } = require('../controllers/evaluationController');
// const { challengeController } = require('../controllers/challengeController');
// const { authController } = require('../controllers/authController');
// const { adaptiveController } = require('../controllers/adaptiveController');

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
 *   - name: Evaluation
 *     description: Response evaluation endpoints
 *   - name: Adaptive
 *     description: Adaptive learning and recommendations endpoints
 *   - name: UserJourney
 *     description: User journey and event tracking endpoints
 *   - name: FocusAreas
 *     description: Focus area management endpoints
 */

/**
 *
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
  mountAll(app, apiPrefix = '/api/v1') {
    app.use(`${apiPrefix}/users`, this.createUserRoutes());
    app.use(`${apiPrefix}/auth`, this.createAuthRoutes());
    app.use(`${apiPrefix}/personality`, this.createPersonalityRoutes());
    app.use(`${apiPrefix}/progress`, this.createProgressRoutes());
    app.use(`${apiPrefix}/challenges`, this.createChallengeRoutes());
    app.use(`${apiPrefix}/evaluation`, this.createEvaluationRoutes());
    app.use(`${apiPrefix}/adaptive`, this.createAdaptiveRoutes());
    app.use(`${apiPrefix}/user-journey`, this.createUserJourneyRoutes());
    app.use(`${apiPrefix}/focus-areas`, this.createFocusAreaRoutes());
    
    // Health check routes (mounted at API prefix without additional path segment)
    app.use(`${apiPrefix}/health`, this.createHealthRoutes());
  }

  /**
   * Create personality routes
   * @returns {Object} Express router with personality routes
   */
  createPersonalityRoutes() {
    const router = require('express').Router();
    const PersonalityController = require('../../../personality/controllers/PersonalityController');
    const personalityApiSchemas = require('../../../personality/schemas/personalityApiSchemas');
    const { authenticateUser } = require('../middleware/auth');
    const { validateBody } = require('../middleware/validation');

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
    router.get(
      '/profile',
      authenticateUser,
      personalityController.getPersonalityProfile.bind(personalityController)
    );

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
    router.get(
      '/recommendations',
      authenticateUser,
      personalityController.getPersonalityProfile.bind(personalityController)
    );

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
    router.post(
      '/assessment/submit',
      authenticateUser,
      validateBody(personalityApiSchemas.submitAssessmentSchema),
      personalityController.submitAssessment.bind(personalityController)
    );

    return router;
  }

  /**
   * Create adaptive learning routes
   * @returns {Object} Express router with adaptive learning routes
   */
  createAdaptiveRoutes() {
    const router = require('express').Router();
    const AdaptiveController = require('../../../adaptive/controllers/AdaptiveController');
    const { authenticateUser } = require('../middleware/auth');

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
    router.get(
      '/profile',
      authenticateUser,
      adaptiveController.getRecommendations.bind(adaptiveController)
    );

    return router;
  }

  /**
   * Create authentication routes
   * @returns {Object} Express router with authentication routes
   */
  createAuthRoutes() {
    const router = require('express').Router();
    const AuthController = require('../../../auth/controllers/AuthController');
    const { validateBody } = require('../middleware/validation');

    // Create controller instance with dependencies
    const authController = new AuthController({
      userRepository: this.container.get('userRepository'),
      supabase: this.container.get('supabase'),
      logger: this.container.get('logger'),
    });

    /**
     * @swagger
     * /auth/login:
     *   post:
     *     summary: User login
     *     description: Authenticates a user and returns a JWT token
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - password
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 description: User's email address
     *               password:
     *                 type: string
     *                 format: password
     *                 description: User's password
     *     responses:
     *       200:
     *         description: Successful login
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
     *                     token:
     *                       type: string
     *                       description: JWT token
     *                     user:
     *                       type: object
     *                       description: User information
     *       401:
     *         description: Invalid credentials
     *       400:
     *         description: Invalid input data
     */
    router.post(
      '/login',
      validateBody({ email: 'string', password: 'string' }),
      authController.login.bind(authController)
    );

    /**
     * @swagger
     * /auth/signup:
     *   post:
     *     summary: User signup
     *     description: Creates a new user account and returns a JWT token
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - password
     *               - fullName
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 description: User's email address
     *               password:
     *                 type: string
     *                 format: password
     *                 description: User's password
     *               fullName:
     *                 type: string
     *                 description: User's full name
     *     responses:
     *       201:
     *         description: User successfully created
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
     *                     token:
     *                       type: string
     *                       description: JWT token
     *                     user:
     *                       type: object
     *                       description: User information
     *       400:
     *         description: Invalid input data
     *       409:
     *         description: Email already exists
     */
    router.post(
      '/signup',
      validateBody({ email: 'string', password: 'string', fullName: 'string' }),
      authController.signup.bind(authController)
    );

    return router;
  }

  /**
   * Create progress routes
   * @returns {Object} Express router with progress routes
   */
  createProgressRoutes() {
    const router = require('express').Router();
    const ProgressController = require('../../../progress/controllers/ProgressController');
    const { authenticateUser } = require('../middleware/auth');

    // Create controller instance with dependencies
    const progressController = new ProgressController({
      logger: this.container.get('logger'),
      progressService: this.container.get('progressService'),
    });

    /**
     * @swagger
     * /progress/history:
     *   get:
     *     summary: Get user progress history
     *     description: Retrieves the complete history of a user's progress across all domains
     *     tags: [Progress]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Progress history retrieved successfully
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
     *                     challenges:
     *                       type: array
     *                       items:
     *                         type: object
     *                     focusAreas:
     *                       type: array
     *                       items:
     *                         type: object
     *                     achievements:
     *                       type: array
     *                       items:
     *                         type: object
     *                     stats:
     *                       type: object
     *       401:
     *         description: Not authenticated
     */
    router.get(
      '/history',
      authenticateUser,
      progressController.getAllUserProgress.bind(progressController)
    );

    return router;
  }

  /**
   * Create evaluation routes
   * @returns {Object} Express router with evaluation routes
   */
  createEvaluationRoutes() {
    const router = require('express').Router();
    const EvaluationController = require('../../../evaluation/controllers/EvaluationController');
    const { authenticateUser } = require('../middleware/auth');

    // Create controller instance with dependencies
    const evaluationController = new EvaluationController({
      logger: this.container.get('logger'),
      evaluationService: this.container.get('evaluationService'),
      openAIStateManager: this.container.get('openAIStateManager'),
      challengeRepository: this.container.get('challengeRepository'),
    });

    /**
     * @swagger
     * /evaluation/submit:
     *   post:
     *     summary: Submit for evaluation
     *     description: Submits a response to be evaluated by the AI
     *     tags: [Evaluation]
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
     *               userEmail:
     *                 type: string
     *                 format: email
     *                 description: Email of the user submitting the response
     *     responses:
     *       200:
     *         description: Evaluation created successfully
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
     *                     id:
     *                       type: string
     *                       format: uuid
     *                     score:
     *                       type: number
     *                     feedback:
     *                       type: string
     *                     categoryScores:
     *                       type: object
     *       400:
     *         description: Invalid input data
     *       401:
     *         description: Not authenticated
     *       404:
     *         description: Challenge not found
     */
    router.post(
      '/submit',
      authenticateUser,
      evaluationController.createEvaluation.bind(evaluationController)
    );

    return router;
  }

  /**
   * Create user routes
   * @returns {Object} Express router with user routes
   */
  createUserRoutes() {
    const router = require('express').Router();
    const UserController = require('../../../user/controllers/UserController');
    const { authenticateUser } = require('../middleware/auth');
    const { validateBody } = require('../middleware/validation');

    // Create controller instance with dependencies
    const userController = new UserController();

    /**
     * @swagger
     * /users/register:
     *   post:
     *     summary: Register a new user
     *     description: Creates a new user account with the provided information
     *     tags: [Users]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - name
     *               - email
     *               - password
     *             properties:
     *               name:
     *                 type: string
     *                 description: User's full name
     *               email:
     *                 type: string
     *                 format: email
     *                 description: User's email address
     *               password:
     *                 type: string
     *                 format: password
     *                 description: User's password
     *     responses:
     *       201:
     *         description: User successfully registered
     *       400:
     *         description: Invalid input data
     *       409:
     *         description: Email already exists
     */
    router.post(
      '/register',
      validateBody({ name: 'string', email: 'string', password: 'string' }),
      userController.createUser.bind(userController)
    );

    /**
     * @swagger
     * /users:
     *   post:
     *     summary: Create a new user
     *     description: Alternative endpoint for creating a new user account
     *     tags: [Users]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - password
     *               - fullName
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 description: User's email address
     *               password:
     *                 type: string
     *                 format: password
     *                 description: User's password
     *               fullName:
     *                 type: string
     *                 description: User's full name
     *     responses:
     *       201:
     *         description: User successfully created
     *       400:
     *         description: Invalid input data
     *       409:
     *         description: Email already exists
     */
    router.post(
      '/',
      validateBody({ email: 'string', password: 'string', fullName: 'string' }),
      userController.createUser.bind(userController)
    );

    /**
     * @swagger
     * /users/me:
     *   get:
     *     summary: Get current user
     *     description: Retrieves information about the currently authenticated user
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: User information retrieved successfully
     *       401:
     *         description: Not authenticated
     */
    router.get('/me', authenticateUser, userController.getCurrentUser.bind(userController));

    /**
     * @swagger
     * /users/email/{email}:
     *   get:
     *     summary: Get user by email
     *     description: Retrieves a user by their email address
     *     tags: [Users]
     *     parameters:
     *       - in: path
     *         name: email
     *         required: true
     *         schema:
     *           type: string
     *           format: email
     *         description: Email of the user to retrieve
     *     responses:
     *       200:
     *         description: User found
     *       404:
     *         description: User not found
     */
    router.get('/email/:email', userController.getUserByEmail.bind(userController));

    return router;
  }

  /**
   * Create challenge routes
   * @returns {Object} Express router with challenge routes
   */
  createChallengeRoutes() {
    const router = require('express').Router();
    const ChallengeController = require('../../../challenge/controllers/ChallengeController');
    const { authenticateUser } = require('../middleware/auth');

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
     *       400:
     *         description: Invalid input data
     *       401:
     *         description: Unauthorized
     */
    router.post(
      '/generate',
      authenticateUser,
      challengeController.generateChallenge.bind(challengeController)
    );

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
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Challenge not found
     */
    router.get(
      '/:challengeId',
      authenticateUser,
      challengeController.getChallengeById.bind(challengeController)
    );

    return router;
  }

  /**
   * Create user journey routes
   * @returns {Object} Express router with user journey routes
   */
  createUserJourneyRoutes() {
    const router = require('express').Router();
    const UserJourneyController = require('../../../userJourney/controllers/UserJourneyController');
    const { authenticateUser } = require('../middleware/auth');

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
     *                     type: object
     *                     properties:
     *                       id:
     *                         type: string
     *                         format: uuid
     *                       eventType:
     *                         type: string
     *                       timestamp:
     *                         type: string
     *                         format: date-time
     *                       metadata:
     *                         type: object
     *       401:
     *         description: Not authenticated
     */
    router.get(
      '/current',
      authenticateUser,
      userJourneyController.getUserEvents.bind(userJourneyController)
    );

    /**
     * @swagger
     * /user-journey/events:
     *   post:
     *     summary: Track new event
     *     description: Records a new event in the user's journey
     *     tags: [UserJourney]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - eventType
     *             properties:
     *               eventType:
     *                 type: string
     *                 description: Type of event to record
     *               metadata:
     *                 type: object
     *                 description: Additional data about the event
     *     responses:
     *       201:
     *         description: Event tracked successfully
     *       400:
     *         description: Invalid input data
     *       401:
     *         description: Not authenticated
     */
    router.post(
      '/events',
      authenticateUser,
      userJourneyController.trackEvent.bind(userJourneyController)
    );

    return router;
  }

  /**
   * Create focus area routes
   * @returns {Object} Express router with focus area routes
   */
  createFocusAreaRoutes() {
    const router = require('express').Router();
    const FocusAreaController = require('../../../focusArea/controllers/FocusAreaController');
    const { authenticateUser } = require('../middleware/auth');

    // Create controller instance with dependencies
    const focusAreaController = new FocusAreaController();

    /**
     * @swagger
     * /focus-areas:
     *   get:
     *     summary: Get all focus areas
     *     description: Retrieves all available focus areas for learning
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
     *                     type: object
     *                     properties:
     *                       id:
     *                         type: string
     *                         format: uuid
     *                       code:
     *                         type: string
     *                       name:
     *                         type: string
     *                       description:
     *                         type: string
     *                       category:
     *                         type: string
     *       401:
     *         description: Not authenticated
     */
    router.get(
      '/',
      authenticateUser,
      focusAreaController.getAllFocusAreas.bind(focusAreaController)
    );

    return router;
  }

  /**
   * Create health routes
   * @returns {Object} Express router with health routes
   */
  createHealthRoutes() {
    // Use our custom health routes implementation
    const createHealthRoutes = require('./healthRoutes');
    return createHealthRoutes(this.container);
  }
}

module.exports = RouteFactory;
