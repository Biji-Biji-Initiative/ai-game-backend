/**
 * Route Factory
 * 
 * Factory class for creating route handlers with proper dependency injection
 * Follows DDD principles and ensures proper separation of concerns
 */

class RouteFactory {
  /**
   * Create a new RouteFactory
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.container - DI container
   */
  constructor(container) {
    this.container = container;
  }

  /**
   * Mount all routes to the Express app
   * @param {Object} app - Express app instance
   * @returns {Object} The app with mounted routes
   */
  mountAll(app) {
    if (!app || typeof app.use !== 'function') {
      throw new Error('A valid Express app instance is required');
    }

    // Create all route handlers
    const personalityRoutes = this.createPersonalityRoutes();
    const adaptiveRoutes = this.createAdaptiveRoutes();
    const authRoutes = this.createAuthRoutes();
    const progressRoutes = this.createProgressRoutes();
    const evaluationRoutes = this.createEvaluationRoutes();
    const challengeRoutes = this.createChallengeRoutes();
    const userJourneyRoutes = this.createUserJourneyRoutes();
    
    // Mount all routes with their prefixes
    app.use('/api/personality', personalityRoutes);
    app.use('/api/adaptive', adaptiveRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/progress', progressRoutes);
    app.use('/api/evaluation', evaluationRoutes);
    app.use('/api/challenge', challengeRoutes);
    app.use('/api/user-journey', userJourneyRoutes);

    return app;
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
      logger: this.container.get('logger')
    });

    // Define routes
    router.get('/profile', 
      authenticateUser,
      personalityController.getPersonalityProfile.bind(personalityController)
    );

    router.get('/recommendations', 
      authenticateUser,
      personalityController.getPersonalityProfile.bind(personalityController)
    );

    router.post('/assessment/submit', 
      authenticateUser,
      validateBody(personalityApiSchemas.submitAssessmentSchema),
      personalityController.submitAssessment.bind(personalityController)
    );

    return router;
  }

  /**
   * Create adaptive routes
   * @returns {Object} Express router with adaptive routes
   */
  createAdaptiveRoutes() {
    const router = require('express').Router();
    const AdaptiveController = require('../../../adaptive/controllers/AdaptiveController');
    const { authenticateUser } = require('../middleware/auth');
    const { validateBody } = require('../middleware/validation');

    // Create controller instance with dependencies
    const adaptiveController = new AdaptiveController({
      logger: this.container.get('logger'),
      adaptiveService: this.container.get('adaptiveService')
    });

    // Define routes
    router.get('/profile', 
      authenticateUser,
      adaptiveController.getRecommendations.bind(adaptiveController)
    );

    return router;
  }

  /**
   * Create auth routes
   * @returns {Object} Express router with auth routes
   */
  createAuthRoutes() {
    const router = require('express').Router();
    const AuthController = require('../../../auth/controllers/AuthController');
    const { validateBody } = require('../middleware/validation');

    // Create controller instance with dependencies
    const authController = new AuthController({
      userRepository: this.container.get('userRepository'),
      logger: this.container.get('logger')
    });

    // Define routes
    router.post('/login', 
      validateBody({ email: 'string', password: 'string' }),
      authController.login.bind(authController)
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
      progressService: this.container.get('progressService')
    });

    // Define routes
    router.get('/history', 
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
      challengeRepository: this.container.get('challengeRepository')
    });

    // Define routes
    router.post('/submit', 
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
    const userController = new UserController({
      userService: this.container.get('userService'),
      logger: this.container.get('logger')
    });

    // Define routes
    router.post('/register', 
      validateBody({ name: 'string', email: 'string', password: 'string' }),
      userController.register.bind(userController)
    );

    router.get('/me', 
      authenticateUser, 
      userController.getCurrentUser.bind(userController)
    );

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
      progressCoordinator: this.container.get('progressCoordinator')
    });

    // Define routes
    router.post('/generate', 
      authenticateUser,
      challengeController.generateChallenge.bind(challengeController)
    );

    router.get('/:challengeId', 
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
      userJourneyService: this.container.get('userJourneyService'),
      logger: this.container.get('logger')
    });

    // Define routes
    router.get('/current', 
      authenticateUser,
      userJourneyController.getCurrentJourney.bind(userJourneyController)
    );

    router.post('/start', 
      authenticateUser,
      userJourneyController.startJourney.bind(userJourneyController)
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
    const focusAreaController = new FocusAreaController({
      focusAreaService: this.container.get('focusAreaService'),
      logger: this.container.get('logger')
    });

    // Define routes
    router.get('/', 
      authenticateUser,
      focusAreaController.getAllFocusAreas.bind(focusAreaController)
    );

    return router;
  }
}

module.exports = RouteFactory;
