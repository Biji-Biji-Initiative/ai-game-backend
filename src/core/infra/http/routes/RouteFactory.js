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
   * Create personality routes
   * @returns {Object} Express router with personality routes
   */
  createPersonalityRoutes() {
    const router = require('express').Router();
    const PersonalityController = require('../../personality/controllers/PersonalityController');
    const { authenticateUser } = require('../middleware/auth');
    const { 
      validateBody,
      validateParams,
      validateQuery 
    } = require('../middleware/validation');
    const { 
      updatePersonalityTraitsSchema,
      updateAIAttitudesSchema,
      profileQuerySchema
    } = require('../../personality/schemas/personalityApiSchemas');

    // Create controller instance with dependencies
    const personalityController = new PersonalityController({
      logger: this.container.get('logger'),
      personalityService: this.container.get('personalityService'),
      errorHandler: this.container.get('errorHandler')
    });

    // Define routes
    router.get('/profile', 
      authenticateUser, 
      validateQuery(profileQuerySchema),
      personalityController.getProfile.bind(personalityController)
    );

    return router;
  }

  /**
   * Create adaptive routes
   * @returns {Object} Express router with adaptive routes
   */
  createAdaptiveRoutes() {
    const router = require('express').Router();
    const AdaptiveController = require('../../adaptive/controllers/AdaptiveController');
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
      adaptiveController.getProfile.bind(adaptiveController)
    );

    return router;
  }

  /**
   * Create auth routes
   * @returns {Object} Express router with auth routes
   */
  createAuthRoutes() {
    const router = require('express').Router();
    const AuthController = require('../../auth/controllers/AuthController');
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
    const ProgressController = require('../../progress/controllers/ProgressController');
    const { authenticateUser } = require('../middleware/auth');

    // Create controller instance with dependencies
    const progressController = new ProgressController({
      logger: this.container.get('logger'),
      progressService: this.container.get('progressService')
    });

    // Define routes
    router.get('/history', 
      authenticateUser,
      progressController.getProgressHistory.bind(progressController)
    );

    return router;
  }

  /**
   * Create evaluation routes
   * @returns {Object} Express router with evaluation routes
   */
  createEvaluationRoutes() {
    const router = require('express').Router();
    const EvaluationController = require('../../evaluation/controllers/EvaluationController');
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
      evaluationController.submitEvaluation.bind(evaluationController)
    );

    return router;
  }

  /**
   * Create challenge routes
   * @returns {Object} Express router with challenge routes
   */
  createChallengeRoutes() {
    const router = require('express').Router();
    const ChallengeController = require('../../challenge/controllers/ChallengeController');
    const { authenticateUser } = require('../middleware/auth');

    // Create controller instance with dependencies
    const challengeController = new ChallengeController({
      challengeCoordinator: this.container.get('challengeCoordinator'),
      logger: this.container.get('logger')
    });

    // Define routes
    router.get('/next', 
      authenticateUser,
      challengeController.getNextChallenge.bind(challengeController)
    );

    return router;
  }

  /**
   * Create user journey routes
   * @returns {Object} Express router with user journey routes
   */
  createUserJourneyRoutes() {
    const router = require('express').Router();
    const UserJourneyController = require('../../userJourney/controllers/UserJourneyController');
    const { authenticateUser } = require('../middleware/auth');

    // Create controller instance with dependencies
    const userJourneyController = new UserJourneyController({
      userJourneyCoordinator: this.container.get('userJourneyCoordinator'),
      userRepository: this.container.get('userRepository')
    });

    // Define routes
    router.get('/events', 
      authenticateUser,
      userJourneyController.getUserJourneyEvents.bind(userJourneyController)
    );

    return router;
  }
}

module.exports = RouteFactory;
