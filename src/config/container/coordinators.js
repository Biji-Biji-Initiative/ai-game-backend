'use strict';

/**
 * Coordinator Components Registration
 * 
 * This module registers all coordinator components in the DI container.
 * Coordinators are application-level services that orchestrate multiple domain services.
 */

/**
 * Register coordinator components in the container
 * @param {DIContainer} container - The DI container
 */
function registerCoordinatorComponents(container) {
  // Register application coordinators
  container.register(
    'personalityCoordinator',
    c => {
      const PersonalityCoordinator = require('../../application/PersonalityCoordinator');
      return new PersonalityCoordinator({
        userService: c.get('userService'),
        personalityService: c.get('personalityService'),
        personalityDataLoader: c.get('personalityDataLoader'),
        logger: c.get('personalityLogger')
      });
    },
    true
  );

  container.register(
    'focusAreaCoordinator',
    c => {
      const FocusAreaCoordinatorFacade = require('../../application/focusArea/FocusAreaCoordinatorFacade');
      return new FocusAreaCoordinatorFacade({
        userRepository: c.get('userRepository'),
        challengeRepository: c.get('challengeRepository'),
        progressRepository: c.get('progressRepository'),
        focusAreaRepository: c.get('focusAreaRepository'),
        focusAreaThreadService: c.get('focusAreaThreadService'),
        focusAreaGenerationService: c.get('focusAreaGenerationService'),
        eventBus: c.get('eventBus'),
        eventTypes: c.get('eventTypes'),
        logger: c.get('logger'),
      });
    },
    true
  );

  container.register(
    'challengeCoordinator',
    c => {
      const ChallengeCoordinator = require('../../application/challengeCoordinator');
      return new ChallengeCoordinator({
        userService: c.get('userService'),
        challengeService: c.get('challengeService'),
        challengeConfigService: c.get('challengeConfigService'),
        challengeFactory: c.get('challengeFactory'),
        challengeGenerationService: c.get('challengeGenerationService'),
        challengeEvaluationService: c.get('challengeEvaluationService'),
        logger: c.get('logger'),
      });
    },
    true
  );

  container.register(
    'userJourneyCoordinator',
    c => {
      const UserJourneyCoordinator = require('../../application/UserJourneyCoordinator');
      return new UserJourneyCoordinator({
        userService: c.get('userService'),
        challengeService: c.get('challengeService'),
        userJourneyService: c.get('userJourneyService'),
        config: c.get('config'),
        logger: c.get('logger'),
      });
    },
    true
  );

  // Register more specialized focus area coordinators
  container.register(
    'focusAreaGenerationCoordinator',
    c => {
      const FocusAreaGenerationCoordinator = require('../../application/focusArea/FocusAreaGenerationCoordinator');
      return new FocusAreaGenerationCoordinator({
        userService: c.get('userService'),
        challengeService: c.get('challengeService'),
        progressService: c.get('progressService'),
        focusAreaService: c.get('focusAreaService'),
        focusAreaThreadService: c.get('focusAreaThreadService'),
        focusAreaGenerationService: c.get('focusAreaGenerationService'),
        eventBus: c.get('eventBus'),
        eventTypes: c.get('eventTypes'),
        logger: c.get('logger'),
      });
    },
    true
  );

  container.register(
    'focusAreaManagementCoordinator',
    c => {
      const FocusAreaManagementCoordinator = require('../../application/focusArea/FocusAreaManagementCoordinator');
      return new FocusAreaManagementCoordinator({
        userService: c.get('userService'),
        focusAreaService: c.get('focusAreaService'),
        focusAreaValidationService: c.get('focusAreaValidationService'),
        focusAreaGenerationCoordinator: c.get('focusAreaGenerationCoordinator'),
        eventBus: c.get('eventBus'),
        eventTypes: c.get('eventTypes'),
        logger: c.get('logger'),
      });
    },
    true
  );

  container.register(
    'progressCoordinator',
    c => {
      const ProgressCoordinator = require('../../application/progress/ProgressCoordinator');
      return new ProgressCoordinator({
        progressService: c.get('progressService'),
        userService: c.get('userService'),
        eventBus: c.get('eventBus'),
        eventTypes: c.get('eventTypes'),
        logger: c.get('logger'),
      });
    },
    true
  );

  // Register event handlers that use coordinators
  container.register(
    'applicationEventHandlers',
    c => {
      const ApplicationEventHandlers = require('../../application/EventHandlers');
      return new ApplicationEventHandlers({
        personalityCoordinator: c.get('personalityCoordinator'),
        logger: c.get('logger').child('eventHandlers'),
      });
    },
    true
  );
}

module.exports = registerCoordinatorComponents; 