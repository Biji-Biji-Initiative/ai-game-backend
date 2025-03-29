'use strict';

/**
 * Controller Components Registration
 * 
 * This module registers all controller components in the DI container.
 */

/**
 * Register controller components in the container
 * @param {DIContainer} container - The DI container
 */
function registerControllerComponents(container) {
  // Register domain controllers
  container.register(
    'userController',
    c => {
      const UserController = require('../../core/user/controllers/UserController');
      return new UserController({
        userService: c.get('userService'),
        logger: c.get('logger'),
      });
    },
    true
  );

  container.register(
    'personalityController',
    c => {
      const PersonalityController = require('../../core/personality/controllers/PersonalityController');
      return new PersonalityController({
        personalityService: c.get('personalityService'),
        logger: c.get('logger'),
      });
    },
    true
  );

  container.register(
    'progressController',
    c => {
      const ProgressController = require('../../core/progress/controllers/ProgressController');
      return new ProgressController({
        progressService: c.get('progressService'),
        logger: c.get('logger'),
      });
    },
    true
  );

  container.register(
    'adaptiveController',
    c => {
      const AdaptiveController = require('../../core/adaptive/controllers/AdaptiveController');
      return new AdaptiveController({
        adaptiveService: c.get('adaptiveService'),
        logger: c.get('logger'),
      });
    },
    true
  );

  container.register(
    'focusAreaController',
    c => {
      const FocusAreaController = require('../../core/focusArea/controllers/FocusAreaController');
      return new FocusAreaController({
        focusAreaCoordinator: c.get('focusAreaCoordinator'),
        logger: c.get('logger'),
      });
    },
    true
  );

  container.register(
    'challengeController',
    c => {
      const ChallengeController = require('../../core/challenge/controllers/ChallengeController');
      return new ChallengeController({
        challengeService: c.get('challengeService'),
        logger: c.get('challengeLogger'),
      });
    },
    true
  );

  container.register(
    'evaluationController',
    c => {
      const EvaluationController = require('../../core/evaluation/controllers/EvaluationController');
      return new EvaluationController({
        evaluationService: c.get('evaluationService'),
        logger: c.get('evaluationLogger'),
      });
    },
    true
  );

  container.register(
    'userJourneyController',
    c => {
      const UserJourneyController = require('../../core/userJourney/controllers/UserJourneyController');
      return new UserJourneyController({
        userJourneyService: c.get('userJourneyService'),
        logger: c.get('logger'),
      });
    },
    true
  );

  // AI-related controllers
  container.register(
    'aiChatController',
    c => {
      const AiChatController = require('../../controllers/ai/AiChatController');
      return new AiChatController({
        aiChatService: c.get('aiChatService'),
        logger: c.get('logger'),
      });
    },
    true
  );

  container.register(
    'aiAnalysisController',
    c => {
      const AiAnalysisController = require('../../controllers/ai/AiAnalysisController');
      return new AiAnalysisController({
        aiAnalysisService: c.get('aiAnalysisService'),
        logger: c.get('logger'),
      });
    },
    true
  );

  // Register health check controller
  container.register(
    'healthCheckController',
    c => {
      const HealthCheckController = require('../../core/infra/health/HealthCheckController');
      return new HealthCheckController({
        healthCheckService: c.get('healthCheckService'),
        logger: c.get('logger')
      });
    },
    true // Singleton: YES - stateless controller
  );
}

module.exports = registerControllerComponents;